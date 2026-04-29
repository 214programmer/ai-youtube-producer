import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim();

    if (apiKey === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал", subscribers: 1000, totalViews: 50000, videoCount: 10 },
          userVideos: [], outlierVideos: [],
          aiAnalysis: { mistakes: ["Ошибка 1"], tips: ["Совет 1"], seoPack: {recommendedTags: ["#тег"], titleTemplates: ["Заголовок"]}, contentPlan: [], scripts: [], competitors: [], collaborations: [], monetization: [] }
        }
      });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Analyze YouTube channel "${channelTitle}" (niche: ${niche}). Return ONLY a JSON object. ALL values in arrays must be SIMPLE STRINGS, not objects. Format: {"mistakes": ["string", "string"], "tips": ["string", "string"], "seoPack": {"recommendedTags": ["#tag1"], "titleTemplates": ["template1"]}, "contentPlan": [{"day": 1, "topic": "string"}], "scripts": [{"title": "string", "script": "string", "visuals": "string"}], "competitors": ["string"], "collaborations": ["string"], "monetization": ["string"]}` 
        }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    // ФОРМИРУЕМ ОТВЕТ, КОТОРЫЙ НЕ СЛОМАЕТ REACT
    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: 0, 
            totalViews: 0, 
            videoCount: 0 
        },
        userVideos: [],
        outlierVideos: [],
        aiAnalysis: {
            mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes.map(String) : [],
            tips: Array.isArray(parsed.tips) ? parsed.tips.map(String) : [],
            seoPack: {
                recommendedTags: Array.isArray(parsed.seoPack?.recommendedTags) ? parsed.seoPack.recommendedTags.map(String) : [],
                titleTemplates: Array.isArray(parsed.seoPack?.titleTemplates) ? parsed.seoPack.titleTemplates.map(String) : []
            },
            contentPlan: Array.isArray(parsed.contentPlan) ? parsed.contentPlan : [],
            scripts: Array.isArray(parsed.scripts) ? parsed.scripts : [],
            competitors: Array.isArray(parsed.competitors) ? parsed.competitors.map(String) : [],
            collaborations: Array.isArray(parsed.collaborations) ? parsed.collaborations.map(String) : [],
            monetization: Array.isArray(parsed.monetization) ? parsed.monetization.map(String) : []
        }
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
