import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const hfToken = (customGeminiKey || '').trim();

    if (!hfToken.startsWith('hf_')) {
      return res.status(400).json({ error: 'Вставьте токен Hugging Face (hf_...)' });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // Запрос к ИИ
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hfToken}`
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          {
            role: "user",
            content: `Анализ канала "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Ответ СТРОГО в JSON: {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
          }
        ]
      })
    });

    const aiData: any = await aiResponse.json();
    if (aiData.error) throw new Error(aiData.error.message || "Ошибка ИИ");

    const resultText = aiData.choices[0].message.content;
    const cleanJson = resultText.replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(cleanJson)
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ОБЯЗАТЕЛЬНО ДЛЯ VERCEL
export default app;
