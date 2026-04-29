import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ensure YouTube API key is available
function checkYoutubeKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_API_KEY не настроен. Пожалуйста, добавьте его в панель Secrets (Секреты) в настройках проекта, либо используйте Демо-режим.');
  }
  return key;
}

// 1. Fetch complete YouTube data and analyze it
app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, channelId, niche, characterName, customGeminiKey } = req.body;
    const input = (channelUrl || channelId || '').trim();
    
    if (!input || !niche) {
      return res.status(400).json({ error: 'Ссылка на канал и ниша обязательны' });
    }

    const apiKey = checkYoutubeKey();

    // Step 1: Parse input and get channel ID
    let inputType = 'id';
    let queryValue = '';

    const matchChannelId = input.match(/(?:^|youtube\.com\/channel\/)(UC[\w-]+)/);
    const matchHandle = input.match(/(?:^|\/)(@[\w.-]+)/);
    const matchUser = input.match(/youtube\.com\/user\/([\w.-]+)/);

    if (matchChannelId) {
        inputType = 'id';
        queryValue = matchChannelId[1];
    } else if (matchHandle) {
        inputType = 'forHandle';
        queryValue = matchHandle[1];
    } else if (matchUser) {
        inputType = 'forUsername';
        queryValue = matchUser[1];
    } else {
        inputType = 'search';
        // Remove https/www/youtube.com to search cleanly
        queryValue = input.replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/)?/, '');
    }

    let channelData;
    if (inputType === 'search') {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${apiKey}`;
        const sRes = await fetch(searchUrl);
        const sData = await sRes.json();
        if (sData.error) throw new Error(sData.error.message);
        if (!sData.items || sData.items.length === 0) throw new Error(`Канал не найден по запросу: ${queryValue}`);
        
        const foundChannelId = sData.items[0].id.channelId;
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${foundChannelId}&key=${apiKey}`);
        channelData = await cRes.json();
    } else {
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&${inputType}=${encodeURIComponent(queryValue)}&key=${apiKey}`);
        channelData = await cRes.json();
    }

    if (channelData.error) throw new Error(channelData.error.message);
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Канал не найден. Проверьте правильность ссылки.');
    }
    const channelItem = channelData.items[0];
    const resolvedChannelId = channelItem.id;

    // Step 2: Get last 20 videos of the channel
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${resolvedChannelId}&order=date&maxResults=20&type=video&key=${apiKey}`);
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);

    let userVideos = [];
    if (searchData.items && searchData.items.length > 0) {
      const videoIds = searchData.items.map((i: any) => i.id.videoId).join(',');
      const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
      const videosData = await videosRes.json();
      if (!videosData.error && videosData.items) {
        userVideos = videosData.items.map((v: any) => ({
          title: v.snippet.title,
          views: parseInt(v.statistics.viewCount || '0', 10),
          likes: parseInt(v.statistics.likeCount || '0', 10),
          publishedAt: v.snippet.publishedAt,
          thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || ''
        }));
      }
    }

    // Step 3: Find Outliers (viral videos in the niche)
    // We search for latest viral shorts and long videos matching the niche
    const outliersShortsRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&order=viewCount&maxResults=5&type=video&videoDuration=short&key=${apiKey}`);
    const outliersShortsData = await outliersShortsRes.json();

    const outliersLongRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&order=viewCount&maxResults=5&type=video&videoDuration=long&key=${apiKey}`);
    const outliersLongData = await outliersLongRes.json();

    if (outliersShortsData.error) throw new Error(outliersShortsData.error.message);
    if (outliersLongData.error) throw new Error(outliersLongData.error.message);

    let outlierVideos = [];
    const allOutlierItems = [...(outliersShortsData.items || []), ...(outliersLongData.items || [])];

    if (allOutlierItems.length > 0) {
      const outlierIds = allOutlierItems.map((i: any) => i.id.videoId).join(',');
      const outliersVideosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${outlierIds}&key=${apiKey}`);
      const outliersVideosData = await outliersVideosRes.json();
      if (!outliersVideosData.error && outliersVideosData.items) {
        outlierVideos = outliersVideosData.items
          .map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount || '0', 10),
            likes: parseInt(v.statistics.likeCount || '0', 10),
            channelTitle: v.snippet.channelTitle,
            thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url || ''
          }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 10); // Take top 10 combined
      }
    }

    const payloadChannelData = {
      title: channelItem.snippet.title,
      subscribers: parseInt(channelItem.statistics.subscriberCount || '0', 10),
      totalViews: parseInt(channelItem.statistics.viewCount || '0', 10),
      videoCount: parseInt(channelItem.statistics.videoCount || '0', 10)
    };

    // Step 4: AI Analysis
    let aiResult = null;
    try {
      const geminiAuthKey = customGeminiKey || process.env.GEMINI_API_KEY;
      if (!geminiAuthKey) {
        throw new Error('GEMINI_API_KEY не настроен. Добавьте его.');
      }
      const ai = new GoogleGenAI({ apiKey: geminiAuthKey });
      
      const prompt = `Ты продвинутый YouTube-стратег и продюсер. Твоя экспертиза - вирусные короткие видео (Shorts) и полноформатные длинные ролики (от 10 минут), удержание внимания и алгоритмы рекомендаций.

ИНФОРМАЦИЯ О КАНАЛЕ ПОЛЬЗОВАТЕЛЯ:
Ниша: ${niche}
Метрики: ${JSON.stringify(payloadChannelData)}
Недавние видео: ${JSON.stringify(userVideos.map((v: any) => ({title: v.title, views: v.views})))}

КОНКУРЕНТЫ-АУТЛАЕРЫ (Топ вирусных видео в нише - Shorts и длинные):
${JSON.stringify(outlierVideos.map((v: any) => ({title: v.title, views: v.views})))}

ЗАДАЧА - подготовить масштабную стратегию для данного канала:
1. Ошибки и Советы: 3 главные ошибки и 3 конкретных шага по улучшению (учитывая и длинные видео, и Shorts).
2. SEO и Оптимизация: 5 лучших тегов, 3 шаблона кликбейтных заголовков для длинных видео.
3. Контент-план: План на 5 видео (чередование Shorts и длинных видео от 10 минут).
4. Сценарии: 3 детальных сценария: два для Shorts (15 сек) и один для хука (первых 30 секунд) длинного видео от 10 минут (Title, Script, Visuals).
5. Анализ конкурентов: 3 фишки, которые можно позаимствовать у топ-аутлаеров в этой нише.
6. Коллаборации: 3 идеи для совместного контента с другими авторами.
7. Стратегия монетизации: 3 неочевидных способа монетизации для этого канала.

Ответь СТРОГО в формате JSON:
{
  "mistakes": ["Строка 1", "Строка 2", "Строка 3"],
  "tips": ["Строка 1", "Строка 2", "Строка 3"],
  "seoPack": {
    "recommendedTags": ["#...", "..."],
    "titleTemplates": ["...", "..."]
  },
  "contentPlan": [
    { "day": 1, "topic": "..." },
    { "day": 2, "topic": "..." },
    { "day": 3, "topic": "..." },
    { "day": 4, "topic": "..." },
    { "day": 5, "topic": "..." }
  ],
  "scripts": [
    {
      "title": "Название первой идеи",
      "script": "Текст самого сценария",
      "visuals": "Визуальное описание для видеоряда (что происходит на экране)"
    }
  ],
  "competitors": ["Фишка 1", "Фишка 2", "Фишка 3"],
  "collaborations": ["Коллаборация 1", "Коллаборация 2", "Коллаборация 3"],
  "monetization": ["Монетизация 1", "Монетизация 2", "Монетизация 3"]
}`;

      let response;
      let retries = 3;
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
            }
          });
          break; // success
        } catch (apiError: any) {
          const isOverloaded = apiError?.status === 503 || apiError?.message?.includes('503') || apiError?.message?.includes('high demand');
          if (isOverloaded && retries > 1) {
            retries--;
            console.warn(`Gemini API overloaded (503). Retrying... (${retries} attempts left)`);
            await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds before retry
          } else {
            throw apiError;
          }
        }
      }

      if (!response) {
        throw new Error('Не удалось получить ответ от Gemini API после нескольких попыток.');
      }


      let text = response.text;
      if (!text) throw new Error('AI Response empty');

      // Strip markdown code blocks (```json ... ```) if they exist
      text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      // Remove trailing commas which are invalid in JSON but common in LLM outputs
      text = text.replace(/,\s*([\]}])/g, '$1');

      aiResult = JSON.parse(text);
    } catch (promptError: any) {
      console.warn("Поймана ошибка Gemini (используем mock данные):", promptError.message || promptError);
      aiResult = {
        mistakes: [
            "ОШИБКА GEMINI API: " + promptError.message,
            "Эта ошибка могла произойти, если лимиты превышены или ключ ошибочен.",
            "Ваши данные с YouTube успешно загружены!"
        ],
        tips: [
            "Убедитесь, что вы используете рабочий API-ключ Gemini (в .env или в панели Secrets).",
            "Подождите пару минут и попробуйте снова."
        ],
        seoPack: {
          recommendedTags: ["#шортс", "#советы", "#контент", "#ютуб", "#тренды"],
          titleTemplates: ["Как я получил [число] просмотров...", "Главный секрет [ниша]"]
        },
        contentPlan: [
          { day: 1, topic: "Знакомство с каналом / формат 'За кадром'" },
          { day: 2, topic: "Реакция на популярный миф в нише" },
          { day: 3, topic: "Полезный совет за 15 секунд" },
          { day: 4, topic: "Ответ на частый вопрос зрителей" },
          { day: 5, topic: "Жизненный мем под трендовый звук" }
        ],
        scripts: [
          {
             title: "Демонстрационный сценарий",
             script: "Автор: Ого, мы подключились к YouTube! ...Но ИИ пока не отвечает.",
             visuals: "Автор смотрит на экран с ошибкой подключения к Gemini и пожимает плечами."
          }
        ],
        competitors: [
          "Использовать быстрые смены кадров каждые 3 секунды.",
          "Добавлять звуковые эффекты (whoosh, pop).",
          "Хук, интригующий до конца видео."
        ],
        collaborations: [
          "Интервью с экспертом.",
          "Батл с каналом схожего размера.",
          "Совместный стрим ответы на вопросы."
        ],
        monetization: [
          "Продажа консультаций.",
          "Реклама в телеграм-боте.",
          "Создание закрытого сообщества (Boosty/Patreon)."
        ]
      };
    }

    // Return the combined payload
    res.json({
      status: 'success',
      data: {
        channelData: payloadChannelData,
        userVideos,
        outlierVideos,
        aiAnalysis: aiResult
      }
    });

  } catch (error: any) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Generate Thumbnail Prompt Endpoint
app.post('/api/generate-thumbnail-prompt', async (req, res) => {
  try {
    const { title, visuals, customGeminiKey } = req.body;
    const geminiAuthKey = customGeminiKey || process.env.GEMINI_API_KEY;
    
    if (!geminiAuthKey) {
      throw new Error('GEMINI_API_KEY не настроен. Добавьте его.');
    }

    const ai = new GoogleGenAI({ apiKey: geminiAuthKey });
    
    const prompt = `Ты эксперт по созданию привлекательных превью (CTR) для YouTube.
Создай детальный промпт на АНГЛИЙСКОМ ЯЗЫКЕ для нейросети Midjourney (или DALL-E), чтобы она сгенерировала картинку-превью.
Название видео: "${title}"
Сюжет / Кадры: "${visuals}"

Правила:
- ТОЛЬКО английский текст промпта без пояснений и вступлений.
- Промпт должен генерировать яркое, сочное, привлекающее внимание изображение.
- Используй такие ключевые слова как: hyper-realistic, vibrant colors, high contrast, youtube thumbnail, 8k resolution, cinematic lighting.
- НЕ ИСПОЛЬЗУЙ кавычки в самом результате.
`;

    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        break; // success
      } catch (apiError: any) {
        const isOverloaded = apiError?.status === 503 || apiError?.message?.includes('503') || apiError?.message?.includes('high demand');
        if (isOverloaded && retries > 1) {
          retries--;
          console.warn(`Gemini API overloaded (503). Retrying... (${retries} attempts left)`);
          await new Promise(r => setTimeout(r, 2000)); // wait 2 seconds before retry
        } else {
          throw apiError;
        }
      }
    }

    if (!response) {
      throw new Error('Не удалось получить ответ от Gemini API после нескольких попыток.');
    }

    const imagePrompt = response.text?.trim();
    if (!imagePrompt) throw new Error('Не удалось сгенерировать промпт');

    res.json({ imagePrompt });
  } catch (error: any) {
    console.error('Thumbnail API Error:', error);
    res.status(500).json({ error: error.message || 'Ошибка генерации превью' });
  }
});

// Mock endpoint for demonstration if API keys are missing or quota exceeded
app.post('/api/analyze-mock', async (req, res) => {
    // Generate some mock data just to show how UI works when no credentials are provided.
    // Normally we'd rely on real API only, but given the friction of Youtube API, 
    // a mock endpoint is very helpful for the UI design phase.
    const { channelUrl, niche } = req.body;
    setTimeout(() => {
        res.json({
            status: 'success',
            data: {
              channelData: {
                title: "My Demo Channel",
                subscribers: 15420,
                totalViews: 1205000,
                videoCount: 42
              },
              userVideos: [
                { title: "Реакция на новые тренды в нише", views: 2400, likes: 120, thumbnail: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400&h=225&fit=crop", publishedAt: "2024-04-10" },
                { title: "Тест нового формата видео", views: 4100, likes: 230, thumbnail: "https://images.unsplash.com/photo-1627998634860-2646c0750ecf?w=400&h=225&fit=crop", publishedAt: "2024-04-05" },
                { title: "Мой первый Short-обзор", views: 1200, likes: 45, thumbnail: "https://images.unsplash.com/photo-1621644047466-419b4efec9cc?w=400&h=225&fit=crop", publishedAt: "2024-04-01" },
              ],
              outlierVideos: [
                { title: "Вирусный шортс, взорвавший интернет", views: 5400000, likes: 450000, channelTitle: "ViralCreator", thumbnail: "https://images.unsplash.com/photo-1627998634860-2646c0750ecf?w=400&h=225&fit=crop" },
                { title: "Главный секрет ниши за 15 секунд", views: 2100000, likes: 180000, channelTitle: "NicheExpert", thumbnail: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=400&h=225&fit=crop" },
              ],
              aiAnalysis: {
                mistakes: [
                    "Слишком длинное вступление (первые 3 секунды скучные).",
                    "Отсутствие динамичного текста на экране, как у аутлаеров.",
                    "Мало взаимодействия с трендовыми звуками."
                ],
                tips: [
                    "Делай монтажные склейки каждые 1-1.5 секунды.",
                    "Добавь ярко-жёлтые субтитры по центру экрана.",
                    "Используй вирусные аудио-тренды Shorts для фона."
                ],
                scripts: [
                  {
                    title: "Разрушитель мифов",
                    script: "Многие думают, что [Факт 1]... но на самом деле (ЗВУК РЕЗКОЙ СИРЕНЫ). Это работает вот так!",
                    visuals: "Автор показывает пальцем на текст, затем экран резко меняет цвет на красный с опровержением."
                  },
                  {
                    title: "Совет для новичков",
                    script: "Если ты только начинаешь, вот 1 вещь, которую я хотел бы знать...",
                    visuals: "Автор говорит на камеру, позади него появляется скриншот с примером."
                  },
                  {
                    title: "За кадром",
                    script: "Вот как выглядит процесс создания видео - хаос и куча дублей!",
                    visuals: "Закулисные кадры быстрой перемотки, затем финальный кадр идеального видео."
                  }
                ]
              }
            }
        });
    }, 2000);
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
