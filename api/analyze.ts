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

    // 2. Сбор статистики и даты создания
    const [statsRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " trending")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    const channelStats = stData.items[0].statistics;
    const channelSnippet = stData.items[0].snippet;
    const channelTitle = channelSnippet.title;
    
    // ВЫЧИСЛЯЕМ ВОЗРАСТ КАНАЛА В ДНЯХ
    const publishedAt = new Date(channelSnippet.publishedAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - publishedAt.getTime());
    const daysOld = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    })) || [];

    // 3. АГРЕССИВНЫЙ ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — жесткий, гениальный Growth Hacker и YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            
            СТАТИСТИКА КАНАЛА (ОЧЕНЬ ВАЖНО):
            - Подписчиков: ${channelStats.subscriberCount}
            - Видео загружено: ${channelStats.videoCount}
            - ВОЗРАСТ КАНАЛА: ${daysOld} дней!
            
            ВНИМАНИЕ: Если каналу мало дней (например, ${daysOld}), КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в ошибки "у вас мало подписчиков" или "мало просмотров". Для нового канала это норма! Оценивай соотношение: загрузить ${channelStats.videoCount} видео за ${daysOld} дней — это хороший или плохой темп?
            
            БОРЬБА С БАНАЛЬНОСТЬЮ:
            ЗАПРЕЩЕНО писать очевидные советы вроде "делайте качественный звук", "красивые превью", "регулярно выкладывайте видео". 
            ДАЙ ТОЛЬКО НЕОЧЕВИДНЫЕ, ЖЕСТКИЕ И РАБОЧИЕ СТРАТЕГИИ. Используй психологию удержания, триггеры кликабельности, алгоритмы YouTube 2024 года. Ищи ошибки в позиционировании и идеях, а не в цифрах.

            НАПИШИ ОГРОМНЫЙ ОБЪЕМ ТЕКСТА НА РУССКОМ ЯЗЫКЕ.
            ВЕРНИ СТРОГО В JSON: 
            {"mistakes":["5 глубоких ошибок алгоритмов/позиционирования"], "tips":["10 неочевидных хакерских советов по росту"], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":"подробная идея с кликбейтом"}], "scripts":[{"title":"","script":"подробный текст","visuals":""}], "competitors":["5 конкретных фишек конкурентов"], "collaborations":["5 нестандартных идей для коллаб"], "monetization":["5 хитрых способов заработка"]}
            Пиши развернуто в каждом пункте.` 
        }],
        temperature: 0.7, // Сделали ИИ чуть более креативным
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
        userVideos: [], 
        outlierVideos,
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
