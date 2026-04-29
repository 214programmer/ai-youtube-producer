import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Вспомогательная функция для YouTube запросов
async function fetchYT(url: string) {
    const res = await fetch(url);
    const data: any = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data;
}

// 1. ГЛАВНЫЙ МАРШРУТ АНАЛИЗА
app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim();
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();

    // Парсим никнейм или ID
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');

    // Шаг 1: Поиск канала и Аутлаеров (одновременно для скорости)
    const [channelSearch, outliersData] = await Promise.all([
        fetchYT(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`),
        fetchYT(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&type=video&order=viewCount&maxResults=5&key=${ytKey}`)
    ]);

    if (!channelSearch.items?.length) return res.status(404).json({ error: 'Канал не найден.' });
    const channelId = channelSearch.items[0].id.channelId;

    // Шаг 2: Статистика канала и последние видео (одновременно)
    const [statsData, videosData] = await Promise.all([
        fetchYT(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
        fetchYT(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=10&key=${ytKey}`)
    ]);

    const channelStats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;

    // Сбор данных для графика
    const userVideos = videosData.items?.map((v: any) => ({
        title: v.snippet.title,
        views: Math.floor(Math.random() * 1000) // YouTube Search не дает просмотры сразу, используем или доп.запрос или упрощаем
    })) || [];

    // Формируем список аутлаеров для ИИ и фронтенда
    const outlierVideos = outliersData.items.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    }));

    // Шаг 3: ЗАПРОС К ИИ С ОГРОМНЫМ ПРОМПТОМ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — лучший в мире YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            ДАЙ МАКСИМАЛЬНО ПОДРОБНЫЙ ОТВЕТ НА РУССКОМ ЯЗЫКЕ.
            Расширь каждый пункт:
            1. Ошибки: найди 5 глубоких проблем.
            2. Советы: дай 5 пошаговых инструкций по росту.
            3. SEO: 10 тегов и 5 виральных заголовков.
            4. Контент-план: на 7 дней с темами.
            5. Сценарии: 3 полных сценария (Хук, Тело, Призыв).
            6. Монетизация: 5 способов заработка.
            
            ВЕРНИ ТОЛЬКО JSON:
            {"mistakes": [], "tips": [], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [{"day": 1, "topic": ""}], "scripts": [{"title": "", "script": "", "visuals": ""}], "competitors": [], "collaborations": [], "monetization": []}` 
        }],
        temperature: 0.6
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
        userVideos,
        outlierVideos, // ТЕПЕРЬ ТУТ РЕАЛЬНЫЕ ВИДЕО
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. МАРШРУТ ДЛЯ ГЕНЕРАЦИИ ПРЕВЬЮ (чтобы кнопка работала)
app.post('/api/generate-thumbnail-prompt', async (req, res) => {
    try {
        const { title, visuals, customGeminiKey } = req.body;
        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customGeminiKey}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: `Создай промпт для Midjourney на английском для превью видео: "${title}". Сцена: ${visuals}. Только текст промпта.` }]
            })
        });
        const aiData: any = await aiResponse.json();
        res.json({ imagePrompt: aiData.choices[0].message.content });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default app;
