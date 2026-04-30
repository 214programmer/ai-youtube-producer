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
    const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!sRes.items?.length) throw new Error('Канал не найден');
    const channelId = sRes.items[0].id.channelId;

    // 2. Сбор данных: Статистика + Топ-видео (Хит) + Конкуренты
    const nicheSearch = `${niche} популярное обзор 2025`;
    
    const [statsData, topVideoData, outliersData] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(nicheSearch)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json())
    ]);

    const stats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;
    const bestVideoTitle = topVideoData.items?.[0]?.snippet?.title || "Не найдено";

    const outlierVideos = outliersData.items?.map((v: any) => ({
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
        channelTitle: v.snippet.channelTitle
    })) || [];

    // 3. ГЛУБОКИЙ ЗАПРОС К ИИ
    const prompt = `Ты элитный продюсер YouTube. Канал: "${channelTitle}" (Ниша: ${niche}). 
    ИХ САМЫЙ БОЛЬШОЙ ХИТ: "${bestVideoTitle}".
    
    ЗАДАЧА НА РУССКОМ:
    1. РАЗБОР ХИТА: Почему "${bestVideoTitle}" залетело? Проанализируй триггеры. Дай идею для видео-клона, которое наберет еще больше.
    2. ОШИБКИ: 5 критических проблем.
    3. СТРАТЕГИЯ: 5 шагов к миллиону.
    4. МОНЕТИЗАЦИЯ: 3 способа заработать.
    5. СЦЕНАРИЙ: Напиши 1 готовый сценарий для Shorts.
    
    ВЕРНИ ТОЛЬКО JSON: {
      "bestVideoAnalysis": "разбор + идея клона + почему сработает",
      "mistakes": [], "tips": [], "monetization": [], 
      "scripts": [{"title": "Shorts", "script": "текст", "visuals": "кадры"}]
    }`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: 'json_object' }
      })
    });
    
    const aiData: any = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(stats.subscriberCount), totalViews: parseInt(stats.viewCount), videoCount: parseInt(stats.videoCount) },
        outlierVideos,
        aiAnalysis: parsed
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
