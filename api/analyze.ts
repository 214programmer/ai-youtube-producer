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

    if (!apiKey) return res.status(400).json({ error: 'Вставьте API ключ (Groq) в поле ввода.' });

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!searchRes.items?.length) throw new Error('Канал не найден');
    const channelId = searchRes.items[0].id.channelId;

    // 2. Сбор статистики и последних видео для графика
    const [statsData, lvData, outliersData, topVideoRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " обзор обучение")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
    ]);

    const channelStats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;
    const bestVideoTitle = topVideoRes.items?.[0]?.snippet?.title || "Не найдено";

    // РЕАЛЬНЫЕ ПРОСМОТРЫ ДЛЯ ГРАФИКА
    let userVideos = [];
    if (lvData.items?.length) {
        const videoIds = lvData.items.map((v: any) => v.id.videoId).join(',');
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount)
        })).reverse();
    }

    // Референсы со ссылками и реальными просмотрами
    const outlierVideos = [];
    if (outliersData.items?.length) {
        const oIds = outliersData.items.map((v: any) => v.id.videoId).join(',');
        const oStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${oIds}&key=${ytKey}`).then(r => r.json());
        outliersData.items.forEach((v: any, i: number) => {
            outlierVideos.push({
                title: v.snippet.title,
                channelTitle: v.snippet.channelTitle,
                thumbnail: v.snippet.thumbnails?.high?.url,
                views: parseInt(oStats.items[i]?.statistics?.viewCount || '0'),
                url: `https://www.youtube.com/watch?v=${v.id.videoId}`
            });
        });
    }

    // 3. ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты элитный продюсер. Канал: "${channelTitle}", ниша: "${niche}". Твой хит: "${bestVideoTitle}".
            ЗАДАЧА НА РУССКОМ:
            1. ХИТ: Почему "${bestVideoTitle}" залетело? Дай идею "Клона" с готовым названием.
            2. SEO: Дай 10 тегов и 5 ГОТОВЫХ кликбейтных заголовков (БЕЗ шаблонов типа %название%).
            3. ПЛАН НА 14 ДНЕЙ: Для каждого дня напиши: [Название] | [Сценарий: Хук, Тезисы] | [Психология: почему кликнут].
            4. МОНЕТИЗАЦИЯ: 3 способа для ниши ${niche}.
            ВЕРНИ JSON: {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":""}], "scripts":[], "competitors":[], "collaborations":[], "monetization":[]}` 
        }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: parseInt(channelStats.subscriberCount), 
            totalViews: parseInt(channelStats.viewCount), 
            videoCount: parseInt(channelStats.videoCount) 
        },
        userVideos, 
        outlierVideos,
        aiAnalysis: parsed
      }
    });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default app;
