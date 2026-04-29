import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const hfToken = (customGeminiKey || '').trim();

    // 1. ДЕМО-РЕЖИМ (работает мгновенно)
    if (hfToken === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал", subscribers: 1250, totalViews: 45000, videoCount: 12 },
          userVideos: [{ title: "Видео 1", views: 500 }, { title: "Видео 2", views: 300 }],
          outlierVideos: [{ title: "Вирусное видео", views: 1000000, channelTitle: "Автор" }],
          aiAnalysis: {
            mistakes: ["Ошибка 1", "Ошибка 2"], tips: ["Совет 1", "Совет 2"],
            seoPack: { recommendedTags: ["#тег"], titleTemplates: ["Шаблон"] },
            contentPlan: [{ day: 1, topic: "Тема" }], scripts: [{ title: "Сценарий", script: "Текст", visuals: "Картинка" }],
            competitors: ["Фишка"], collaborations: ["Идея"], monetization: ["Способ"]
          }
        }
      });
    }

    // 2. РЕАЛЬНЫЙ РЕЖИМ
    if (!hfToken.startsWith('hf_')) return res.status(400).json({ error: 'Нужен токен Hugging Face (hf_...)' });

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'YouTube API ключ не найден в настройках Vercel.' });

    // YouTube API
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (sData.error) return res.status(400).json({ error: 'YouTube Error: ' + sData.error.message });
    if (!sData.items?.length) return res.status(404).json({ error: 'Канал не найден' });

    const channelTitle = sData.items[0].snippet.title;

    // ЗАПРОС К ИИ (Используем быструю модель 7B вместо медленной 72B)
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-7B-Instruct",
        messages: [{ role: "user", content: `JSON ONLY. Анализ YouTube канала "${channelTitle}" (ниша: ${niche}). Дай 3 ошибки и 3 совета. Формат: {"mistakes": [], "tips": [], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [{"day":1, "topic":""}], "scripts": [{"title":"", "script":"", "visuals":""}], "competitors": [], "collaborations": [], "monetization": []}` }],
        max_tokens: 1000
      })
    });

    const aiData: any = await aiResponse.json();
    if (aiData.error) return res.status(400).json({ error: 'ИИ Ошибка: ' + (aiData.error.message || aiData.error) });

    const resultText = aiData.choices[0].message.content;
    const cleanJson = resultText.replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: 0, totalViews: 0, videoCount: 0 },
        userVideos: [],
        outlierVideos: [],
        aiAnalysis: JSON.parse(cleanJson)
      }
    });

  } catch (error: any) {
    // Возвращаем JSON даже при ошибке, чтобы избежать символа '<'
    res.status(500).json({ error: 'Критическая ошибка: ' + error.message });
  }
});

export default app;
