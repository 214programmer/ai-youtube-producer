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

    // 1. Поиск канала
    const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!sRes.items?.length) throw new Error('Канал не найден');
    const channelId = sRes.items[0].id.channelId;

    // 2. Сбор статистики и конкурентов
    const [statsRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " обзор")}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json())
    ]);

    const stats = statsRes.items[0].statistics;
    const channelTitle = statsRes.items[0].snippet.title;

    const outlierVideos = outliersRes.items?.map((v: any) => ({
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    })) || [];

    // 3. Быстрый аудит ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Дай аудит канала "${channelTitle}" (ниша: ${niche}) на РУССКОМ. 5 ошибок и 5 советов. JSON: {"mistakes":[], "tips":[]}` }],
        response_format: { type: 'json_object' }
      })
    });
    
    const aiData: any = await aiResponse.json();
    const parsedAi = JSON.parse(aiData.choices[0].message.content);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(stats.subscriberCount), totalViews: parseInt(stats.viewCount), videoCount: parseInt(stats.videoCount) },
        outlierVideos,
        aiAnalysis: {
            mistakes: Array.isArray(parsedAi.mistakes) ? parsedAi.mistakes : [],
            tips: Array.isArray(parsedAi.tips) ? parsedAi.tips : [],
            contentPlan: [] // Пока пусто для первой кнопки
        }
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
