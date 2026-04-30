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
      let rawInput = channelUrl.trim();
      let chId = '';
      
      // 1. ВЫРЕЗАЕМ ЧИСТЫЙ ХЕНДЛ (например @MarkBulah)
      let handle = rawInput;
      if (handle.includes('youtube.com/')) {
          handle = handle.split('youtube.com/').pop()?.split('/')[0].split('?')[0] || handle;
      }
      if (!handle.startsWith('@') && !handle.includes('UC')) handle = '@' + handle;

      // 2. МЕТОД А: Поиск через официальный Handle (самый точный для 2025 года)
      const handleRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${ytKey}`).then(r => r.json());
      
      if (handleRes.items?.length) {
          chId = handleRes.items[0].id;
      } else {
          // МЕТОД Б: Поиск через Search (если хендл не сработал)
          const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
          if (searchRes.items?.length) {
              chId = searchRes.items[0].id.channelId;
          } else {
              throw new Error('Канал не найден. Попробуйте скопировать ссылку из адресной строки YouTube.');
          }
      }

      // 3. СБОР ВСЕХ ДАННЫХ
      const [stats, lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " хайп 2025")}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
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
          messages: [{ role: "user", content: `Ты — топовый YouTube продюсер. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". Дай на РУССКОМ: 1. РАЗБОР ХИТА (триггеры + идея клона). 2. 5 жестких ошибок. 3. 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
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
          outlierVideos: outliers.items.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })),
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
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ максимально подробно, почему это критично для охватов и дай пошаговую инструкцию из 3-5 пунктов. Пиши экспертно и вдохновляюще.` }]
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
