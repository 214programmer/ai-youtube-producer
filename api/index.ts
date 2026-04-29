import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Главный маршрут анализа
app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // ВАЖНО: Мы используем ключ, который ты вводишь в поле. 
    // Назовем его apiKey, даже если на сайте написано "Gemini".
    const apiKey = customGeminiKey; 

    if (!apiKey) {
      return res.status(400).json({ error: 'Пожалуйста, введите API ключ в поле ввода.' });
    }

    // 1. YouTube часть (используем ключ из настроек Vercel)
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) {
        return res.status(500).json({ error: 'Ключ YouTube не найден в настройках Vercel (Environment Variables).' });
    }

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();

    if (sData.error) {
        return res.status(400).json({ error: 'Ошибка YouTube: ' + sData.error.message });
    }

    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. Запрос к DeepSeek (ИИ, который работает везде)
    // ВАЖНО: Вставь в поле на сайте ключ от DeepSeek!
    const aiResponse = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Ты YouTube-продюсер. Отвечай СТРОГО в формате JSON."
          },
          {
            role: "user",
            content: `Проанализируй канал "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Ответ СТРОГО в JSON: {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    
    if (aiData.error) {
        return res.status(400).json({ error: 'Ошибка ИИ: ' + aiData.error.message });
    }

    const resultText = aiData.choices[0].message.content;

    // Возвращаем результат
    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(resultText)
      }
    });

  } catch (error: any) {
    console.error('SERVER FATAL ERROR:', error.message);
    res.status(500).json({ error: 'Ошибка на сервере: ' + error.message });
  }
});

export default app;
