import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const hfToken = (customGeminiKey || '').trim();

    // 1. ДЕМО-РЕЖИМ
    if (hfToken === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал", subscribers: 1250, totalViews: 45000, videoCount: 12 },
          userVideos: [{ title: "Как использовать ИИ", views: 500 }, { title: "Тест системы", views: 300 }],
          outlierVideos: [{ title: "Вирусное видео в нише", views: 1000000, channelTitle: "AI Master" }],
          aiAnalysis: {
            mistakes: ["Слишком длинные заголовки", "Мало Shorts", "Плохое качество звука"],
            tips: ["Делайте монтаж динамичнее", "Добавьте субтитры", "Используйте трендовую музыку"],
            seoPack: { recommendedTags: ["#ИИ", "#технологии"], titleTemplates: ["Секрет [Ниша]"] },
            contentPlan: [{ day: 1, topic: "Обзор нейросетей" }, { day: 2, topic: "Кейсы" }, { day: 3, topic: "Гайд" }, { day: 4, topic: "Топ сервисов" }, { day: 5, topic: "Итоги" }],
            scripts: [{ title: "Хук для Shorts", script: "Это изменит всё...", visuals: "Быстрая нарезка" }],
            competitors: ["Следите за трендами"], collaborations: ["Совместный обзор"], monetization: ["Реклама"]
          }
        }
      });
    }

    // 2. РЕАЛЬНЫЙ РЕЖИМ
    if (!hfToken.startsWith('hf_')) {
      return res.status(400).json({ error: 'Нужен токен Hugging Face (hf_...)' });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'YouTube API ключ не найден в настройках Vercel.' });

    // Поиск данных канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (sData.error) throw new Error(sData.error.message);
    if (!sData.items?.length) throw new Error('Канал не найден');

    const channelItem = sData.items[0];
    const channelId = channelItem.id.channelId;
    const channelTitle = channelItem.snippet.title;

    // Сбор видео (последние 2)
    const vRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=2&type=video&key=${ytKey}`);
    const vData: any = await vRes.json();
    const userVideos = vData.items?.map((v: any) => ({ title: v.snippet.title, views: 0 })) || [];

    // Запрос к Hugging Face
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [{ role: "user", content: `Проанализируй YouTube канал "${channelTitle}" в нише "${niche}". Дай стратегию. Ответь СТРОГО в JSON: {"mistakes": ["ошибка 1", "ошибка 2", "ошибка 3"], "tips": ["совет 1", "совет 2", "совет 3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [{"day":1, "topic":""}, {"day":2, "topic":""}, {"day":3, "topic":""}, {"day":4, "topic":""}, {"day":5, "topic":""}], "scripts": [{"title":"", "script":"", "visuals":""}], "competitors": [], "collaborations": [], "monetization": []}` }]
      })
    });

    const aiData: any = await aiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message || "Ошибка ИИ (возможно, лимит токенов)");

    const resultText = aiData.choices[0].message.content;
    const cleanJson = resultText.replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: 0, totalViews: 0, videoCount: 0 },
        userVideos,
        outlierVideos: [{ title: "Популярное видео", views: 500000, channelTitle: "Конкурент" }],
        aiAnalysis: JSON.parse(cleanJson)
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
