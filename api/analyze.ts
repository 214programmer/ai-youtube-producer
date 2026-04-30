import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim(); 
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`);
    const sData: any = await searchRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден');
    const channelId = sData.items[0].id.channelId;

    // 2. Сбор данных (Статистика + Хит + Последние 5 видео)
    const [statsRes, topVideoRes, latestVideosRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const tData: any = await topVideoRes.json();
    const lvData: any = await latestVideosRes.json();

    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;
    const bestVideoTitle = tData.items?.[0]?.snippet?.title || "Не найдено";
    const recentTitles = lvData.items?.map((v: any) => v.snippet.title) || [];

    // 3. Умный поиск конкурентов (используем только нишу)
    const outliersRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " обзор")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`);
    const oData: any = await outliersRes.json();
    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    })) || [];

    // 4. ЖЕСТКИЙ ЗАПРОС К ИИ С ПРОВЕРКОЙ КОНТЕКСТА
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — элитный YouTube продюсер-аналитик. 
            
            ДАННЫЕ КАНАЛА:
            - Название: "${channelTitle}"
            - Ниша, которую ввел пользователь: "${niche}"
            - САМОЕ ПОПУЛЯРНОЕ ВИДЕО (Хит): "${bestVideoTitle}"
            - ПОСЛЕДНИЕ 5 ВИДЕО: ${recentTitles.join(', ')}
            
            ТВОЯ ПЕРВАЯ ЗАДАЧА (КРИТИКА): 
            Сравни нишу "${niche}" с реальными названиями видео. Если пользователь врет (например, пишет "авто", а снимает про "носки"), начни раздел ошибок с жесткого разоблачения этого несоответствия. Объясни, что алгоритмы в шоке от такой каши.

            ТВОЯ ВТОРАЯ ЗАДАЧА:
            1. ХИТ: Почему "${bestVideoTitle}" реально залетело? (Дай глубокий психологический анализ).
            2. КЛОН: Предложи идею видео, которая объединит реальный успех канала с заявленной нишей "${niche}" (если это возможно), или предложи сменить нишу.
            3. ПЛАН НА 14 ДНЕЙ: Распиши ПОДРОБНО (Заголовок, сценарий из 3 актов, почему это наберет просмотры).

            ВЕРНИ JSON: 
            {
              "mistakes": ["минимум 5 жестких ошибок"], 
              "tips": ["анализ хита + идея клона + 5 стратегий"], 
              "contentPlan": [{"day":1, "topic": "ЗАГОЛОВОК | СЦЕНАРИЙ | ТРИГГЕР КЛИКА"}],
              "seoPack": {"recommendedTags":[], "titleTemplates":[]},
              "scripts": [], "competitors": [], "collaborations": [], "monetization": []
            }` 
        }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: parseInt(channelStats.subscriberCount), 
            totalViews: parseInt(channelStats.viewCount), 
            videoCount: parseInt(channelStats.videoCount) 
        },
        userVideos: [], // Тут всё еще можно добавить реальную динамику, если нужно
        outlierVideos,
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
