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

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`);
    const sData: any = await searchRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден');
    const channelId = sData.items[0].id.channelId;

    // 2. Сбор данных (Статистика + Аутлаеры + Хит + Видео для графика)
    const nicheSearch = niche.length < 4 ? `${niche} нейросети технологии обзор` : `${niche} обзор технологии`;
    
    const [statsRes, outliersRes, topVideoRes, latestVideosRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(nicheSearch)}&type=video&order=viewCount&maxResults=5&publishedAfter=2024-01-01T00:00:00Z&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    const tData: any = await topVideoRes.json();
    const lvData: any = await latestVideosRes.json();

    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;

    // СБОР ДАННЫХ ДЛЯ ГРАФИКА (с реальными просмотрами)
    let userVideos = [];
    if (lvData.items?.length) {
        const videoIds = lvData.items.map((v: any) => v.id.videoId).join(',');
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount)
        })).reverse();
    }

    // Референсы со ссылками
    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    })) || [];

    const bestVideoTitle = tData.items?.[0]?.snippet?.title || "Не найдено";

    // 3. ЗАПРОС К ИИ (ЖЕСТКИЕ ТРЕБОВАНИЯ К ДЕТАЛИЗАЦИИ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — топовый YouTube продюсер. Твоя задача — спасти канал "${channelTitle}" (ниша: ${niche}).
            
            АНАЛИЗ ТВОЕГО ХИТА: "${bestVideoTitle}". 
            
            ТРЕБОВАНИЯ К ОТВЕТУ (НА РУССКОМ):
            1. ХИТ: Почему "${bestVideoTitle}" залетело? Дай идею "Клона" с заголовком и объясни, почему она наберет в 2 раза больше.
            2. КОНТЕНТ-ПЛАН НА 14 ДНЕЙ: Для каждого дня напиши: 
               - Кликбейтный заголовок.
               - Сценарий: ХУК (первые 5 сек), СУТЬ (3 тезиса), ПРИЗЫВ.
               - ПОЧЕМУ ЭТО ЗАЛЕТИТ: Психологический триггер.
            3. МОНЕТИЗАЦИЯ: 3 способа заработать в нише ${niche} без AdSense.

            ВЕРНИ JSON: 
            {
              "mistakes": ["минимум 5"], 
              "tips": ["анализ хита + идея клона + 5 советов"], 
              "contentPlan": [{"day":1, "topic": "ЗАГОЛОВОК | СЦЕНАРИЙ | ПОЧЕМУ ЗАЛЕТИТ"}],
              "seoPack": {"recommendedTags":[], "titleTemplates":[]},
              "scripts": [], "competitors": [], "collaborations": [], "monetization": []
            }` 
        }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

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

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
