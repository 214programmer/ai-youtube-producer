import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// --- 1. КНОПКА "ПОДРОБНЕЕ" ---
app.post('/api/index/explain', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `YouTube совет: "${text}". Объясни на РУССКОМ подробно: почему это важно и дай 3 шага по исправлению.` }]
      })
    });
    const data: any = await response.json();
    res.json({ explanation: data.choices[0].message.content });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- 2. КНОПКА "ПОДРОБНЫЙ ОТЧЕТ" (14 дней) ---
app.post('/api/index/detailed', async (req, res) => {
  try {
    const { channelTitle, niche, apiKey } = req.body;
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Сделай на РУССКОМ детальный план на 14 дней для канала "${channelTitle}" (ниша: ${niche}). Каждый день: заголовок и суть. JSON: {"contentPlan":[{"day":1,"topic":""}]}` }],
        response_format: { type: 'json_object' }
      })
    });
    const data: any = await response.json();
    res.json(JSON.parse(data.choices[0].message.content));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// --- 3. ГЛАВНЫЙ АНАЛИЗ ---
app.post('/api/index/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    
    const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!sRes.items?.length) throw new Error('Канал не найден');
    const ch = sRes.items[0];

    const [stats, vids, outliers, top] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${ch.id.channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ch.id.channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " 2025")}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ch.id.channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
    ]);

    const channelTitle = stats.items[0].snippet.title;
    const bestVideo = top.items?.[0]?.snippet?.title || "Не найдено";

    const aiRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${customGeminiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Ты продюсер. Канал: "${channelTitle}" (Ниша: ${niche}). ХИТ: "${bestVideo}". Дай разбор хита, 5 ошибок и 5 советов на РУССКОМ. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
        response_format: { type: 'json_object' }
      })
    });
    const aiData: any = await aiRes.json();
    const parsed = JSON.parse(aiData.choices[0].message.content);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount) },
        outlierVideos: outliers.items.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })),
        aiAnalysis: parsed
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
