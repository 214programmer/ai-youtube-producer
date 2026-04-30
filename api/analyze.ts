import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim(); 

    if (!apiKey) {
      return res.status(400).json({ error: 'Пожалуйста, вставьте ваш API ключ в поле ввода.' });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'Критическая ошибка: Добавьте YOUTUBE_API_KEY в Vercel!' });

    // 1. Поиск канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`);
    const sData: any = await searchRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден. Проверьте ссылку.');
    
    const channelId = sData.items[0].id.channelId;

    // 2. Сбор статистики канала и последних видео (ДЛЯ ГРАФИКА)
    const [statsRes, videosSearchRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const vsData: any = await videosSearchRes.json();
    const channelStats = stData.items[0].statistics;
    const channelSnippet = stData.items[0].snippet;
    const channelTitle = channelSnippet.title;
    
    const publishedAt = new Date(channelSnippet.publishedAt);
    const today = new Date();
    const daysOld = Math.ceil(Math.abs(today.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)); 

    // Сбор РЕАЛЬНЫХ просмотров для ГРАФИКА
    let userVideos = [];
    if (vsData.items?.length) {
        const videoIds = vsData.items.map((v: any) => v.id.videoId).join(',');
        const videoStatsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`);
        const vStData: any = await videoStatsRes.json();
        userVideos = vStData.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount)
        })).reverse(); // Переворачиваем, чтобы старые были слева, новые справа
    }

    // 3. Умный поиск конкурентов (Улучшаем запрос)
    // Добавляем слова "guide", "tutorial" к нише, чтобы находить полезные видео, а не мусор
    const searchNiche = niche.length <= 3 ? `${niche} нейросети обзор` : niche; 
    const oRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchNiche)}&type=video&order=relevance&maxResults=5&key=${ytKey}`);
    const oData: any = await oRes.json();
    
    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    })) || [];

    // 4. ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — жесткий Growth Hacker и YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            
            СТАТИСТИКА: Подписчиков: ${channelStats.subscriberCount}. Видео загружено: ${channelStats.videoCount}. ВОЗРАСТ КАНАЛА: ${daysOld} дней!
            ВНИМАНИЕ: Если каналу мало дней (например, ${daysOld}), КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в ошибки "у вас мало подписчиков". Оценивай соотношение: загрузить ${channelStats.videoCount} видео за ${daysOld} дней — это хороший или плохой темп?
            
            ЗАПРЕЩЕНО писать очевидные советы вроде "делайте качественный звук", "красивые превью". ДАЙ ТОЛЬКО ЖЕСТКИЕ И РАБОЧИЕ СТРАТЕГИИ по удержанию и кликабельности в нише ${niche}.

            ВЕРНИ СТРОГО В JSON: 
            {"mistakes":["5 глубоких ошибок алгоритмов/позиционирования"], "tips":["10 неочевидных хакерских советов по росту"], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":"подробная идея с кликбейтом"}], "scripts":[{"title":"","script":"подробный текст","visuals":""}], "competitors":["5 конкретных фишек конкурентов"], "collaborations":["5 нестандартных идей для коллаб"], "monetization":["5 хитрых способов заработка"]}` 
        }],
        temperature: 0.7,
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
        userVideos, // ГРАФИК ВЕРНУЛСЯ
        outlierVideos, // ТЕПЕРЬ ПО НИШЕ
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
