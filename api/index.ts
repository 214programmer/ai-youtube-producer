import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ensure YouTube API key is available
function checkYoutubeKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    throw new Error('YOUTUBE_API_KEY не настроен. Пожалуйста, добавьте его в Environment Variables в настройках Vercel.');
  }
  return key;
}

// 1. Fetch complete YouTube data and analyze it
app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, channelId, niche, characterName, customGeminiKey } = req.body;
    const input = (channelUrl || channelId || '').trim();
    
    if (!input || !niche) {
      return res.status(400).json({ error: 'Ссылка на канал и ниша обязательны' });
    }

    const apiKey = checkYoutubeKey();

    let inputType = 'id';
    let queryValue = '';

    const matchChannelId = input.match(/(?:^|youtube\.com\/channel\/)(UC[\w-]+)/);
    const matchHandle = input.match(/(?:^|\/)(@[\w.-]+)/);
    const matchUser = input.match(/youtube\.com\/user\/([\w.-]+)/);

    if (matchChannelId) {
        inputType = 'id';
        queryValue = matchChannelId[1];
    } else if (matchHandle) {
        inputType = 'forHandle';
        queryValue = matchHandle[1];
    } else if (matchUser) {
        inputType = 'forUsername';
        queryValue = matchUser[1];
    } else {
        inputType = 'search';
        queryValue = input.replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/)?/, '');
    }

    let channelData;
    if (inputType === 'search') {
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${apiKey}`;
        const sRes = await fetch(searchUrl);
        const sData = await sRes.json();
        if (sData.error) throw new Error(sData.error.message);
        if (!sData.items || sData.items.length === 0) throw new Error(`Канал не найден: ${queryValue}`);
        const foundChannelId = sData.items[0].id.channelId;
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${foundChannelId}&key=${apiKey}`);
        channelData = await cRes.json();
    } else {
        const cRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&${inputType}=${encodeURIComponent(queryValue)}&key=${apiKey}`);
        channelData = await cRes.json();
    }

    if (channelData.error) throw new Error(channelData.error.message);
    if (!channelData.items || channelData.items.length === 0) throw new Error('Канал не найден.');
    const channelItem = channelData.items[0];
    const resolvedChannelId = channelItem.id;

    // Step 2: Get last 20 videos
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${resolvedChannelId}&order=date&maxResults=20&type=video&key=${apiKey}`);
    const searchData = await searchRes.json();

    let userVideos = [];
    if (searchData.items && searchData.items.length > 0) {
      const videoIds = searchData.items.map((i: any) => i.id.videoId).join(',');
      const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
      const videosData = await videosRes.json();
      if (!videosData.error && videosData.items) {
        userVideos = videosData.items.map((v: any) => ({
          title: v.snippet.title,
          views: parseInt(v.statistics.viewCount || '0', 10),
          likes: parseInt(v.statistics.likeCount || '0', 10),
          publishedAt: v.snippet.publishedAt,
          thumbnail: v.snippet.thumbnails?.high?.url || ''
        }));
      }
    }

    // Step 3: Find Outliers (viral videos)
    const outliersShortsRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&order=viewCount&maxResults=5&type=video&videoDuration=short&key=${apiKey}`);
    const outliersLongRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche)}&order=viewCount&maxResults=5&type=video&videoDuration=long&key=${apiKey}`);
    
    const outliersShortsData = await outliersShortsRes.json();
    const outliersLongData = await outliersLongRes.json();

    let outlierVideos = [];
    const allOutlierItems = [...(outliersShortsData.items || []), ...(outliersLongData.items || [])];

    if (allOutlierItems.length > 0) {
      const outlierIds = allOutlierItems.map((i: any) => i.id.videoId).join(',');
      const outliersVideosRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${outlierIds}&key=${apiKey}`);
      const outliersVideosData = await outliersVideosRes.json();
      if (outliersVideosData.items) {
        outlierVideos = outliersVideosData.items.map((v: any) => ({
          title: v.snippet.title,
          views: parseInt(v.statistics.viewCount || '0', 10),
          channelTitle: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails?.high?.url || ''
        })).sort((a, b) => b.views - a.views).slice(0, 10);
      }
    }

    const payloadChannelData = {
      title: channelItem.snippet.title,
      subscribers: parseInt(channelItem.statistics.subscriberCount || '0', 10),
      totalViews: parseInt(channelItem.statistics.viewCount || '0', 10),
      videoCount: parseInt(channelItem.statistics.videoCount || '0', 10)
    };

    // Step 4: AI Analysis
    let aiResult = null;
    const geminiAuthKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (geminiAuthKey) {
      const ai = new GoogleGenAI(geminiAuthKey);
      // ИСПРАВЛЕНА МОДЕЛЬ НА 1.5-flash
      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Ты YouTube-продюсер. Ниша: ${niche}. Данные канала: ${JSON.stringify(payloadChannelData)}. Видео пользователя: ${JSON.stringify(userVideos.slice(0,5))}. Виральные видео конкурентов: ${JSON.stringify(outlierVideos.slice(0,5))}. 
      Подготовь стратегию. Ответь СТРОГО в формате JSON с полями: mistakes, tips, seoPack, contentPlan, scripts, competitors, collaborations, monetization.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      aiResult = JSON.parse(text);
    }

    res.json({
      status: 'success',
      data: {
        channelData: payloadChannelData,
        userVideos,
        outlierVideos,
        aiAnalysis: aiResult
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate Thumbnail Prompt Endpoint
app.post('/api/generate-thumbnail-prompt', async (req, res) => {
  try {
    const { title, visuals, customGeminiKey } = req.body;
    const geminiAuthKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiAuthKey) throw new Error('GEMINI_API_KEY не найден.');

    const ai = new GoogleGenAI(geminiAuthKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Create a detailed Midjourney thumbnail prompt for: "${title}". Description: "${visuals}". Output only the prompt in English.`;
    const result = await model.generateContent(prompt);
    res.json({ imagePrompt: result.response.text().trim() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Экспорт для Vercel (ОБЯЗАТЕЛЬНО)
export default app;

// Запуск сервера (только не в Vercel)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
}
