import React, { useState } from 'react';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, niche, customGeminiKey })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-zinc-800 pb-4">
          <h1 className="text-3xl font-black italic">AI YOUTUBE PRO</h1>
        </header>

        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-4">
          <input className="w-full p-3 bg-black border border-zinc-700 rounded text-white" placeholder="Ссылка на канал" value={channelUrl} onChange={e => setChannelUrl(e.target.value)} />
          <input className="w-full p-3 bg-black border border-zinc-700 rounded text-white" placeholder="Ниша" value={niche} onChange={e => setNiche(e.target.value)} />
          <input type="password" className="w-full p-3 bg-black border border-zinc-700 rounded text-white" placeholder="Ключ Groq" value={customGeminiKey} onChange={e => setCustomGeminiKey(e.target.value)} />
          <button onClick={handleAnalyze} className="w-full p-3 bg-emerald-600 font-bold rounded">
            {isLoading ? "Анализ..." : "ЗАПУСТИТЬ АНАЛИЗ"}
          </button>
        </div>

        {data && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
               <div className="p-4 bg-zinc-900 rounded border border-zinc-800">Подписчики: {data.channelData.subscribers}</div>
               <div className="p-4 bg-zinc-900 rounded border border-zinc-800">Просмотры: {data.channelData.totalViews}</div>
               <div className="p-4 bg-zinc-900 rounded border border-zinc-800">Видео: {data.channelData.videoCount}</div>
            </div>

            <div className="h-64 bg-zinc-900 p-4 rounded border border-zinc-800">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#333" />
                        <XAxis dataKey="title" hide />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="views" stroke="#10b981" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-red-900/20 border border-red-900 rounded">
                    <h3 className="font-bold mb-2">ОШИБКИ</h3>
                    {data.aiAnalysis.mistakes.map((m:string, i:number) => <p key={i} className="text-sm">• {m}</p>)}
                </div>
                <div className="p-4 bg-emerald-900/20 border border-emerald-900 rounded">
                    <h3 className="font-bold mb-2">СОВЕТЫ</h3>
                    {data.aiAnalysis.tips.map((t:string, i:number) => <p key={i} className="text-sm">• {t}</p>)}
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
