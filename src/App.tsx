import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardTitle } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, FileText, Zap, ExternalLink } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [isDetailed, setIsDetailed] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setIsDetailed(false);
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

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelTitle: data.channelData.title, niche, apiKey: customGeminiKey })
      });
      const deepData = await res.json();
      setData({ ...data, aiAnalysis: { ...data.aiAnalysis, ...deepData } });
      setIsDetailed(true);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-4 border-b border-zinc-800 pb-8">
          <div className="bg-emerald-500 p-2 rounded-xl"><Youtube className="w-8 h-8 text-black" /></div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">AI PRODUCER <span className="text-emerald-500">V2</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-5 shadow-2xl">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Настройки</label>
                <Input placeholder="URL канала" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="bg-black border-zinc-800" />
                <Input placeholder="Ваша ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="bg-black border-zinc-800" />
                <Input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="bg-black border-zinc-800" />
              </div>
              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-14 rounded-2xl transition-all shadow-lg shadow-emerald-900/20 text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : "НАЧАТЬ АУДИТ"}
              </Button>
            </Card>
          </div>

          {/* Results Area */}
          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                {/* Upper Section: Stats + Deep Button */}
                <div className="flex flex-col md:flex-row gap-6 items-stretch">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-grow">
                    {[
                      {l: "Юзеры", v: data.channelData.subscribers},
                      {l: "Вьюсы", v: data.channelData.totalViews},
                      {l: "Ролики", v: data.channelData.videoCount},
                      {l: "Топ", v: data.outlierVideos.length}
                    ].map((s, i) => (
                      <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl text-center">
                        <p className="text-xl font-black text-emerald-400 font-mono leading-none">{s.v.toLocaleString()}</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase mt-2">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={handleDeepReport} 
                    disabled={isDeepLoading || isDetailed} 
                    className={`md:w-64 rounded-3xl font-black italic text-lg shadow-2xl transition-all ${isDetailed ? 'bg-zinc-800 text-zinc-500' : 'bg-violet-600 hover:bg-violet-500 animate-pulse'}`}
                  >
                    {isDeepLoading ? <Loader2 className="animate-spin" /> : isDetailed ? "ПЛАН ГОТОВ" : "ПОЛУЧИТЬ ПЛАН"}
                  </Button>
                </div>

                {/* Chart */}
                <Card className="bg-zinc-900 border-zinc-800 p-8 rounded-[40px]">
                   <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none', borderRadius:'20px', padding:'15px'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={6} dot={{r:8, fill:'#10b981', strokeWidth:0}} activeDot={{r:10, fill:'#fff'}} />
                      </LineChart>
                    </ResponsiveContainer>
                   </div>
                </Card>

                {/* Clickable References */}
                <div className="space-y-6">
                    <h3 className="text-xl font-black flex items-center italic text-emerald-500 uppercase tracking-tighter">
                      <Zap className="mr-2 fill-yellow-500 text-yellow-500"/> РЕАЛЬНЫЕ КОНКУРЕНТЫ
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block">
                                <div className="bg-zinc-900 border border-zinc-800 rounded-[30px] overflow-hidden group-hover:border-emerald-500 transition-all duration-500 shadow-xl">
                                    <div className="relative">
                                      <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-transform duration-500" />
                                      <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[9px] font-black px-2 py-1 rounded-full flex items-center">
                                        СМОТРЕТЬ <ExternalLink className="w-2 h-2 ml-1"/>
                                      </div>
                                    </div>
                                    <div className="p-5">
                                        <p className="text-sm font-bold line-clamp-2 leading-snug h-10">{v.title}</p>
                                        <p className="text-[10px] text-zinc-500 mt-4 font-medium uppercase tracking-widest">{v.channelTitle}</p>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Analysis Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black flex items-center text-xs tracking-widest uppercase"><AlertTriangle className="mr-2 w-4 h-4"/> КРИТИЧЕСКИЕ ОШИБКИ</h4>
                        <div className="space-y-3">
                          {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-zinc-900/50 border border-red-500/10 rounded-3xl text-sm leading-relaxed text-zinc-300 italic">“ {m} ”</div>
                          ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black flex items-center text-xs tracking-widest uppercase"><Lightbulb className="mr-2 w-4 h-4"/> СТРАТЕГИЯ РОСТА</h4>
                        <div className="space-y-3">
                          {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-zinc-900/50 border border-emerald-500/10 rounded-3xl text-sm leading-relaxed text-zinc-300">{t}</div>
                          ))}
                        </div>
                    </div>
                </div>

                {/* Detailed Plan Area */}
                {isDetailed && (
                    <div className="space-y-8 pt-10 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <div className="flex items-center space-x-4">
                          <div className="h-px bg-zinc-800 flex-grow"></div>
                          <h3 className="text-4xl font-black text-violet-400 italic tracking-tighter uppercase text-center">План на 14 дней</h3>
                          <div className="h-px bg-zinc-800 flex-grow"></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-8 bg-zinc-900 rounded-[40px] border border-zinc-800 hover:border-violet-500/40 transition-all shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-violet-600"></div>
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="bg-violet-600 text-white px-5 py-1 rounded-full font-black text-xs">ДЕНЬ {p.day}</span>
                                    </div>
                                    <p className="text-lg font-bold text-zinc-100 leading-tight mb-4 group-hover:text-violet-400 transition-colors">{p.topic.split('|')[0]}</p>
                                    <p className="text-sm text-zinc-400 leading-relaxed">{p.topic.split('|')[1] || p.topic}</p>
                                </div>
                            ))}
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
