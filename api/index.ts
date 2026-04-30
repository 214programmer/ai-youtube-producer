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
    if (task === 'analyze') {
      // 1. УЛЬТРА-ПОИСК: Находит всё от мелких каналов до гигантов типа MarkBulah
      let query = channelUrl.trim();
      if (query.includes('youtube.com/')) {
          query = query.split('/').pop()?.replace('@', '').split('?')[0] || query;
      } else {
          query = query.replace('@', '');
      }
      
      const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      if (!sRes.items?.length) throw new Error('YouTube не нашел такой канал. Проверьте ссылку.');
      const chId = sRes.items[0].id.channelId;

      const refinedNiche = `${niche} обзор геймплей 2025`;
      const [stats, lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedNiche)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items[0].snippet.title;
      const hitTitle = top.items?.[0]?.snippet?.title || "Не найдено";

      const vIds = lvRes.items?.map((v:any) => v.id.videoId).join(',') || '';
      let userVideos = [];
      if (vIds) {
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items?.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse() || [];
      }

      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты продюсер-аналитик. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". Дай на РУССКОМ: 1. РАЗБОР ХИТА (триггеры + идея-клона). 2. 5 жестких ошибок. 3. 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount), videoCount: parseInt(stats.items[0].statistics.videoCount) },
          userVideos,
          outlierVideos: outliers.items?.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })) || [],
          aiAnalysis: parsed
        }
      });
    }

    if (task === 'explain') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ максимально подробно, почему это важно для охватов и дай пошаговую инструкцию из 3 пунктов.` }]
        })
      });
      const aiData: any = await aiRes.json();
      return res.json({ explanation: aiData.choices[0].message.content });
    }

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
      return res.json(JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
