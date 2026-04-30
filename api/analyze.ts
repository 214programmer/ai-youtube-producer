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

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!searchRes.items?.length) throw new Error('Канал не найден');
    const channelId = searchRes.items[0].id.channelId;

    // УМНЫЙ ПОИСК: добавляем "геймплей обзор", если ниша Игры
    const refinedNiche = niche.toLowerCase() === 'игры' ? 'геймплей обзор игры' : niche;

    const [statsRes, lvRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedNiche + " trending 2024")}&type=video&order=viewCount&maxResults=6&key=${ytKey}`).then(r => r.json())
    ]);

    const channelStats = statsRes.items[0].statistics;
    const channelTitle = statsRes.items[0].snippet.title;

    const videoIds = lvRes.items.map((v: any) => v.id.videoId).join(',');
    const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`).then(r => r.json());
    const userVideos = vStats.items.map((v: any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();

    const outlierVideos = outliersRes.items.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    }));

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Дай краткий аудит на РУССКОМ для канала "${channelTitle}" (ниша: ${niche}). 3 ошибки и 3 совета. JSON: {"mistakes":[], "tips":[]}` }],
        response_format: { type: 'json_object' }
      })
    });
    const aiData: any = await aiResponse.json();
    const parsedAi = JSON.parse(aiData.choices[0].message.content);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(channelStats.subscriberCount), totalViews: parseInt(channelStats.viewCount), videoCount: parseInt(channelStats.videoCount) },
        userVideos, outlierVideos,
        aiAnalysis: { ...parsedAi, contentPlan: [], scripts: [], monetization: [], seoPack: {recommendedTags:[], titleTemplates:[]} }
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
export default app;
