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

    if (!apiKey) return res.status(400).json({ error: 'Введите API ключ' });
    if (!ytKey) return res.status(500).json({ error: 'YOUTUBE_API_KEY не настроен' });

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!searchRes.items?.length) throw new Error('Канал не найден');
    const channelId = searchRes.items[0].id.channelId;

    const nicheSearch = `${niche} обзор 2024 trending`;

    // 2. Сбор данных YouTube
    const [statsRes, lvRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(nicheSearch)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json())
    ]);

    const channelStats = statsRes.items[0].statistics;
    const channelTitle = statsRes.items[0].snippet.title;

    // График
    const videoIds = lvRes.items.map((v: any) => v.id.videoId).join(',');
    const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`).then(r => r.json());
    const userVideos = vStats.items.map((v: any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();

    // Референсы
    const outlierVideos = outliersRes.items.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    }));

    // 3. БЫСТРЫЙ ИИ АУДИТ (Только ошибки и советы)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Краткий аудит канала "${channelTitle}" (ниша: ${niche}). Дай 5 ошибок и 5 советов на РУССКОМ. JSON: {"mistakes":["1","2"], "tips":["1","2"]}` }],
        response_format: { type: 'json_object' }
      })
    });
    
    const aiData: any = await aiResponse.json();
    const parsedAi = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(channelStats.subscriberCount), totalViews: parseInt(channelStats.viewCount), videoCount: parseInt(channelStats.videoCount) },
        userVideos, outlierVideos, aiAnalysis: parsedAi
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
