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
      // 1. УЛЬТРА-СМАРТ ПОИСК КАНАЛА
      let rawInput = channelUrl.trim();
      let searchUrl = '';
      let isChannelId = false;

      // Сценарий А: Это прямая ссылка с ID (начинается на UC)
      if (rawInput.includes('/channel/UC')) {
        const id = rawInput.split('/channel/')[1].split('/')[0].split('?')[0];
        searchUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${id}&key=${ytKey}`;
        isChannelId = true;
      } 
      // Сценарий Б: Это @handle или никнейм (самый частый случай)
      else {
        // Вытаскиваем ник, убираем всё лишнее
        let handle = rawInput;
        if (handle.includes('youtube.com/')) {
            handle = handle.split('youtube.com/')[1].split('/')[0].split('?')[0];
        }
        // Если ника нет @, добавляем, так как YouTube Search лучше ищет handles с @
        if (!handle.startsWith('@') && !handle.includes(' ')) {
           handle = '@' + handle; 
        }

        // Ищем канал по этому handle
        searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${ytKey}`;
      }

      // Выполняем поиск
      const sRes = await fetch(searchUrl).then(r => r.json());
      
      if (!sRes.items?.length) {
          throw new Error(`Канал не найден. Убедитесь, что вы ввели правильный @никнейм или полную ссылку.`);
      }

      // В зависимости от типа поиска, ID канала лежит в разных местах
      const chId = isChannelId ? sRes.items[0].id : sRes.items[0].id.channelId;

      const refinedNiche = niche.toLowerCase() === 'игры' ? 'геймплей обзор игры 2025' : `${niche} обзор 2025`;

      const [stats, lvRes, outliers, top] = await Promise.all([
        // Если это был поиск по ID, статистика уже есть в sRes (но сделаем запрос для надежности)
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
          messages: [{ role: "user", content: `Ты YouTube-продюсер. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". Дай на РУССКОМ: 1. ПОДРОБНЫЙ разбор хита (почему залетел + идею-клона). 2. 5 жестких ошибок. 3. 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

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

    // ... здесь остался твой код для task === 'explain' и task === 'detailed'

    if (task === 'explain') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ подробно: почему это важно для алгоритмов 2025 и дай план исправления из 3 шагов.` }]
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
          messages: [{ role: "user", content: `Сделай на РУССКОМ детальный план на 14 дней для канала "${channelTitle}". JSON: {"contentPlan":[{"day":1,"topic":""}]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      return res.json(JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
