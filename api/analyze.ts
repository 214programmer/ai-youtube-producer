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

    if (!apiKey) return res.status(400).json({ error: 'Вставьте API ключ Groq' });
    if (!ytKey) return res.status(500).json({ error: 'YouTube API ключ не настроен' });

    // 1. YouTube Поиск
    const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!sRes.items?.length) throw new Error('Канал не найден');
    const channelId = sRes.items[0].id.channelId;

    // 2. Статистика и Видео
    const [statsRes, vRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json())
    ]);

    const channelStats = statsRes.items[0].statistics;
    const channelTitle = statsRes.items[0].snippet.title;
    const recentVideos = vRes.items.map((v: any) => v.snippet.title).join(', ');

    // 3. ТРОЙНОЙ АНАЛИЗ ИИ (Чтобы не было банальностей)
    const prompt = `Ты жесткий YouTube-продюсер. Канал: "${channelTitle}", Ниша: "${niche}". Последние видео: ${recentVideos}.
    Проведи глубокий разбор:
    1. Ошибки: 5 жестких ошибок (почему они убивают охваты).
    2. Советы: 10 тактик роста (психология удержания, триггеры клика, работа с алгоритмами 2025).
    3. Контент-план: 14 дней (День, Заголовок, Сценарий, Триггер клика).
    4. Стратегия: SEO (10 тегов), 5 идей коллабораций, 5 способов монетизации.
    
    ОТВЕТЬ СТРОГО JSON: {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":""}], "competitors":[], "collaborations":[], "monetization":[]}
    Пиши максимально подробно, не будь банальным!`;

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: parseInt(channelStats.subscriberCount), totalViews: parseInt(channelStats.viewCount), videoCount: parseInt(channelStats.videoCount) },
        aiAnalysis: parsed
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
