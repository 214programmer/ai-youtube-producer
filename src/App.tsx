import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null);
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
    <div className="min-h-screen bg-black text-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">AI PRODUCER <span className="text-emerald-500">ULTRA</span></h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-4 lg:col-span-1 h-fit">
            <Input placeholder="URL канала" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="bg-black border-zinc-800" />
            <Input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="bg-black border-zinc-800" />
            <Input type="password" placeholder="Ключ Groq (gsk_...)" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="bg-black border-zinc-800" />
            <Button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 h-14 font-black">
              {isLoading ? <Loader2 className="animate-spin" /> : "ПОЛУЧИТЬ ГЛУБОКИЙ АУДИТ"}
            </Button>
          </Card>

          <div className="lg:col-span-3 space-y-8">
            {data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl"><p className="text-emerald-400 font-black text-xl">{data.channelData.subscribers.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Подписчиков</p></div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl"><p className="text-emerald-400 font-black text-xl">{data.channelData.totalViews.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Просмотров</p></div>
                  <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl"><p className="text-emerald-400 font-black text-xl">{data.channelData.videoCount}</p><p className="text-[10px] text-zinc-500 uppercase">Видео</p></div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-red-500/5 border-red-500/20 p-6 space-y-4">
                        <h4 className="text-red-500 font-bold flex items-center"><AlertTriangle className="mr-2"/> ОШИБКИ</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => <p key={i} className="text-sm bg-zinc-900 p-4 rounded-xl">{m}</p>)}
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/20 p-6 space-y-4">
                        <h4 className="text-emerald-500 font-bold flex items-center"><Lightbulb className="mr-2"/> СОВЕТЫ РОСТА</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => <p key={i} className="text-sm bg-zinc-900 p-4 rounded-xl">{t}</p>)}
                    </Card>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xl font-black text-violet-400">КОНТЕНТ-ПЛАН НА 14 ДНЕЙ</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                            <div key={i} className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                                <p className="text-emerald-500 font-black text-xs">ДЕНЬ {p.day}</p>
                                <p className="text-sm mt-2">{p.topic}</p>
                            </div>
                        ))}
                    </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
