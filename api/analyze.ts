import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim();

    if (!apiKey.startsWith('gsk_')) {
      return res.status(400).json({ error: 'Вставьте API ключ GROQ (начинается на gsk_)' });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'YouTube API ключ не настроен в Vercel.' });

    // 1. Поиск канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) return res.status(404).json({ error: 'Канал не найден.' });
    const channelTitle = sData.items[0].snippet.title;

    // 2. Запрос к GROQ (Llama 3.3)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Analyze YouTube channel "${channelTitle}" (niche: ${niche}). Return ONLY valid JSON object with keys: mistakes, tips, seoPack, contentPlan, scripts, competitors, collaborations, monetization. No extra words.` 
        }],
        temperature: 0.3
      })
    });

    const aiData: any = await aiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const resultText = aiData.choices[0].message.content;
    
    // 3. Вырезаем JSON из ответа (самая важная часть!)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("ИИ не вернул JSON. Ответ: " + resultText.substring(0, 100));
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: parsedData
      }
    });

  } catch (error: any) {
    console.error("SERVER ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
