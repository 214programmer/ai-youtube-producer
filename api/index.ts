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
      return res.status(400).json({ error: 'Пожалуйста, вставьте API ключ OpenRouter.' });
    }

    // 1. YouTube часть
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. Список БЕСПЛАТНЫХ моделей для перебора (самые стабильные на сегодня)
    const models = [
      "google/gemini-2.0-flash-exp:free",
      "google/gemini-flash-1.5-8b:free",
      "meta-llama/llama-3.1-8b-instruct:free"
    ];

    let lastAiError = "";

    for (const modelId of models) {
      try {
        console.log(`Пробую модель: ${modelId}`);
        const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://vercel.com',
            'X-Title': 'AI Producer'
          },
          body: JSON.stringify({
            model: modelId,
            messages: [
              {
                role: "user",
                content: `Проанализируй YouTube канал "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Ответ СТРОГО в JSON: {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
              }
            ],
            response_format: { type: 'json_object' }
          })
        });

        const aiData: any = await aiResponse.json();

        if (aiData.choices && aiData.choices[0]) {
          const resultText = aiData.choices[0].message.content;
          // Если получили ответ - отдаем его и выходим из цикла
          return res.json({
            status: 'success',
            data: {
              channelData: { title: channelTitle },
              aiAnalysis: JSON.parse(resultText)
            }
          });
        } else {
          lastAiError = aiData.error?.message || "Неизвестная ошибка модели";
        }
      } catch (e: any) {
        lastAiError = e.message;
        continue; // Пробуем следующую модель из списка
      }
    }

    // Если ни одна модель не подошла
    throw new Error(`Все бесплатные модели сейчас перегружены или недоступны. Ошибка: ${lastAiError}`);

  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка: ' + error.message });
  }
});

export default app;
