import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/index', async (req, res) => {
  const { task, channelUrl, niche, customGeminiKey, text, channelTitle } = req.body;
  const apiKey = (customGeminiKey || '').trim();
  const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();

  try {
    // --- 1. ГЛАВНЫЙ АНАЛИЗ ---
    if (task === 'analyze') {
      const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
      const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      if (!sRes.items?.length) throw new Error('Канал не найден');
      const chId = sRes.items[0].id.channelId;

      const refinedNiche = niche.toLowerCase() === 'игры' ? 'геймплей обзор игры gaming 2025' : `${niche} обзор 2025`;

      const [stats, lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedNiche)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items[0].snippet.title;
      const hitTitle = top.items?.[0]?.snippet?.title || "Не найдено";

      const vIds = lvRes.items.map((v:any) => v.id.videoId).join(',');
      const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
      const userVideos = vStats.items.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();

      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты продюсер. Канал: "${title}", ниша: "${niche}". ХИТ: "${hitTitle}". Дай на РУССКОМ: разбор хита (почему залетел + идея клона), 5 ошибок и 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount) },
          userVideos,
          outlierVideos: outliers.items.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })),
          aiAnalysis: parsed
        }
      });
    }

    // --- 2. ПОДРОБНЕЕ ---
    if (task === 'explain') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ подробно: почему это важно и дай 3 шага по реализации.` }]
        })
      });
      const aiData: any = await aiRes.json();
      return res.json({ explanation: aiData.choices[0].message.content });
    }

    // --- 3. ПЛАН НА 14 ДНЕЙ ---
    if (task === 'detailed') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Сделай на РУССКОМ: 1. План на 14 дней. 2. 10 тегов. 3. 3 способа монетизации. JSON: {"contentPlan":[{"day":1,"topic":""}], "seoPack":{"recommendedTags":[]}, "monetization":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      return res.json(JSON.parse(aiData.choices[0].message.content));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
