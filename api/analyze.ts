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

    // 1. Поиск канала
    const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!sRes.items?.length) throw new Error('Канал не найден');
    const channelId = sRes.items[0].id.channelId;

    // 2. Сбор статистики, видео для графика и точных конкурентов
    const nicheSearch = `${niche} геймплей обзор прохождение 2025`;
    const [statsData, lvData, outliersData, topVideoData] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(nicheSearch)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
    ]);

    const stats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;
    const bestVideoTitle = topVideoData.items?.[0]?.snippet?.title || "Не найдено";

    // РЕАЛЬНЫЕ ПРОСМОТРЫ ДЛЯ ГРАФИКА
    let userVideos = [];
    if (lvData.items?.length) {
        const vIds = lvData.items.map((v:any) => v.id.videoId).join(',');
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();
    }

    const outlierVideos = outliersData.items?.map((v: any) => ({
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
        channelTitle: v.snippet.channelTitle
    })) || [];

    // 3. ГЛУБОКИЙ ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Ты элитный продюсер. Канал: "${channelTitle}" (Ниша: ${niche}). ХИТ: "${bestVideoTitle}". 
        ЗАДАЧА:
        1. РАЗБОР ХИТА: Почему "${bestVideoTitle}" залетело? Дай идею клона.
        2. ОШИБКИ И СОВЕТЫ: по 5 штук.
        3. ПЛАН НА 14 ДНЕЙ.
        ВЕРНИ JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[], "contentPlan":[{"day":1,"topic":""}]}` }],
        response_format: { type: 'json_object' }
      })
    });
    
    const aiData: any = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(stats.subscriberCount), totalViews: parseInt(stats.viewCount), videoCount: parseInt(stats.videoCount) },
        userVideos, outlierVideos, aiAnalysis: parsed
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
