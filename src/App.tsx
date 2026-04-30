import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardTitle } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, FileText, Zap, DollarSign, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTask, setLoadingTask] = useState<string | null>(null);
  
  const [data, setData] = useState<any>(null);
  const [planData, setPlanData] = useState<any>(null);
  const [businessData, setBusinessData] = useState<any>(null);

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setPlanData(null); setBusinessData(null);
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

  const handleProFeature = async (task: string) => {
    setLoadingTask(task);
    try {
      const res = await fetch('/api/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelTitle: data.channelData.title, niche, apiKey: customGeminiKey, task })
      });
      const result = await res.json();
      
      if (task === 'plan') setPlanData(result.contentPlan);
      if (task === 'business') setBusinessData(result);
    } catch (e: any) { alert(e.message); } finally { setLoadingTask(null); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-4 border-b border-zinc-800 pb-8">
          <div className="bg-emerald-500 p-2 rounded-xl"><Youtube className="w-8 h-8 text-black" /></div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">AI PRODUCER <span className="text-emerald-500">V3</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-5 shadow-2xl sticky top-10">
              <Input placeholder="URL канала" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="bg-black border-zinc-800" />
              <Input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="bg-black border-zinc-800" />
              <Input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="bg-black border-zinc-800" />
              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-14 rounded-2xl text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : <Search className="mr-2"/>} БЫСТРЫЙ АУДИТ
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                {/* 1. Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Видео", v: data.channelData.videoCount},
                    {l: "Конкуренты", v: data.outlierVideos.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl text-center">
                      <p className="text-xl font-black text-emerald-400 font-mono">{s.v.toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-2">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* 2. График */}
                <Card className="bg-zinc-900 border-zinc-800 p-8 rounded-[40px]">
                   <CardTitle className="mb-4 text-xs uppercase text-zinc-500">Динамика просмотров</CardTitle>
                   <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none', borderRadius:'20px'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={6} dot={{r:8, fill:'#10b981', strokeWidth:0}} activeDot={{r:10, fill:'#fff'}} />
                      </LineChart>
                    </ResponsiveContainer>
                   </div>
                </Card>

                {/* 3. ВОТ ОНИ ВИДЕО КОНКУРЕНТОВ (КЛИКАБЕЛЬНЫЕ) */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black flex items-center italic text-emerald-500 uppercase tracking-tighter">
                      <Zap className="mr-2 fill-yellow-500 text-yellow-500"/> ВИРУСНЫЕ ВИДЕО В НИШЕ
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group-hover:border-emerald-500 transition-all shadow-xl">
                                    <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-transform" />
                                    <div className="p-3">
                                        <p className="text-xs font-bold line-clamp-2 leading-tight h-8">{v.title}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* 4. Ошибки и Советы */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black"><AlertTriangle className="mr-2 inline w-4 h-4"/> КРИТИЧЕСКИЕ ОШИБКИ</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => <div key={i} className="p-4 bg-zinc-900/50 border border-red-500/10 rounded-2xl text-sm">{m}</div>)}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black"><Lightbulb className="mr-2 inline w-4 h-4"/> ТОЧКИ РОСТА</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => <div key={i} className="p-4 bg-zinc-900/50 border border-emerald-500/10 rounded-2xl text-sm">{t}</div>)}
                    </div>
                </div>

                {/* ========================================= */}
                {/* 5. ПАНЕЛЬ PRO-ИНСТРУМЕНТОВ (ТВОЯ ИДЕЯ) */}
                {/* ========================================= */}
                <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-[40px] space-y-6">
                   <h3 className="text-2xl font-black text-white italic text-center uppercase">PRO Инструменты ИИ</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Кнопка Плана */}
                      <Button onClick={() => handleProFeature('plan')} disabled={loadingTask === 'plan' || planData} className={`h-16 rounded-2xl font-black ${planData ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                        {loadingTask === 'plan' ? <Loader2 className="animate-spin mr-2"/> : <FileText className="mr-2"/>}
                        {planData ? "ПЛАН СГЕНЕРИРОВАН" : "КОНТЕНТ-ПЛАН (14 ДНЕЙ)"}
                      </Button>

                      {/* Кнопка Бизнеса */}
                      <Button onClick={() => handleProFeature('business')} disabled={loadingTask === 'business' || businessData} className={`h-16 rounded-2xl font-black ${businessData ? 'bg-zinc-800 text-zinc-500' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                        {loadingTask === 'business' ? <Loader2 className="animate-spin mr-2"/> : <DollarSign className="mr-2"/>}
                        {businessData ? "БИЗНЕС-СТРАТЕГИЯ ГОТОВА" : "SEO И МОНЕТИЗАЦИЯ"}
                      </Button>
                      
                   </div>
                </div>

                {/* Вывод Плана */}
                {planData && (
                    <div className="space-y-4 animate-in slide-in-from-bottom-10">
                        <h3 className="text-2xl font-black text-violet-400">ПЛАН НА 14 ДНЕЙ</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {planData.map((p:any, i:number) => (
                                <div key={i} className="p-6 bg-[#18181b] rounded-3xl border border-zinc-800">
                                    <span className="bg-violet-600 text-white px-4 py-1 rounded-full font-black text-xs">ДЕНЬ {p.day}</span>
                                    <p className="text-base mt-4 text-zinc-200">{p.topic}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Вывод Бизнеса */}
                {businessData && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-10">
                        <h3 className="text-2xl font-black text-blue-400">SEO И БИЗНЕС</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="bg-[#18181b] border-zinc-800 p-6 space-y-4">
                               <h4 className="font-bold text-white">Теги для копирования:</h4>
                               <div className="flex flex-wrap gap-2">{businessData.seoPack.recommendedTags.map((t:string, i:number)=><span key={i} className="px-2 py-1 bg-zinc-800 rounded text-xs">{t}</span>)}</div>
                            </Card>
                            <Card className="bg-[#18181b] border-zinc-800 p-6 space-y-4">
                               <h4 className="font-bold text-white">Монетизация:</h4>
                               <ul className="space-y-2">{businessData.monetization.map((m:string, i:number)=><li key={i} className="text-sm text-zinc-400">• {m}</li>)}</ul>
                            </Card>
                        </div>
                    </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
