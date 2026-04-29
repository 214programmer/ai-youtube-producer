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
      return res.status(400).json({ error: 'Пожалуйста, вставьте ваш API ключ OpenRouter.' });
    }

    // 1. YouTube часть (используем ключ из настроек Vercel)
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();

    if (sData.error) {
        return res.status(400).json({ error: 'Ошибка YouTube: ' + sData.error.message });
    }

    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. Запрос к OpenRouter с использованием Gemma 4 31B
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://vercel.com',
        'X-Title': 'AI Youtube Producer'
      },
      body: JSON.stringify({
        model: "google/gemma-4-31b:free", // ТА САМАЯ МОДЕЛЬ С ТВОЕГО СКРИНШОТА
        messages: [
          {
            role: "user",
            content: `Проанализируй YouTube канал "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Ответ СТРОГО в формате JSON: {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    
    if (aiData.error) {
        return res.status(400).json({ error: 'Ошибка ИИ: ' + (aiData.error.message || 'Модель недоступна') });
    }

    const resultText = aiData.choices[0].message.content;

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(resultText)
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Критическая ошибка: ' + error.message });
  }
});

export default app;
