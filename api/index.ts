import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json());

// Проверка ключа YouTube
function checkYoutubeKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY не найден в Environment Variables Vercel.');
  return key;
}

// ГЛАВНЫЙ МАРШРУТ
app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = checkYoutubeKey();

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${apiKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (sData.error) throw new Error(sData.error.message);
    if (!sData.items?.length) throw new Error('Канал не найден');
    const channelId = sData.items[0].id.channelId;
    const channelTitle = sData.items[0].snippet.title;

    // 2. Сбор данных о видео (твоя логика)
    const vRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=5&type=video&key=${apiKey}`);
    const vData: any = await vRes.json();
    const userVideos = vData.items?.map((v: any) => ({ title: v.snippet.title })) || [];

    // 3. AI Анализ через Gemini
    const geminiKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) throw new Error('Ключ Gemini не найден. Введите его в поле или в настройках Vercel.');

    const genAI = new GoogleGenAI(geminiKey);
    // ИСПРАВЛЕНО: gemini-1.5-flash (самая стабильная бесплатная модель)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `Ты YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
    Недавние видео: ${JSON.stringify(userVideos)}.
    Дай детальную стратегию: ошибки, советы, контент-план на 5 дней и 3 сценария.
    ОТВЕТЬ СТРОГО В JSON: 
    {"mistakes": [], "tips": [], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        userVideos: userVideos,
        aiAnalysis: JSON.parse(text)
      }
    });
  } catch (error: any) {
    console.error('SERVER ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Дополнительный маршрут для превью
app.post('/api/generate-thumbnail-prompt', async (req, res) => {
    try {
        const { title, customGeminiKey } = req.body;
        const geminiKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY;
        const genAI = new GoogleGenAI(geminiKey!);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(`Create Midjourney prompt for YouTube thumbnail: ${title}`);
        res.json({ imagePrompt: result.response.text() });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// ЭКСПОРТ ДЛЯ VERCEL
export default app;
