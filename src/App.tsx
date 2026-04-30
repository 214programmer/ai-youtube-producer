import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardTitle } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, Download, Zap, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
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
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-6">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic">AI YOUTUBE <span className="text-emerald-500">PRO</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-4">
              <Input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="bg-black border-zinc-800" />
              <Input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="bg-black border-zinc-800" />
              <Input type="password" placeholder="Ключ Groq (gsk_...)" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="bg-black border-zinc-800" />
              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 font-bold">
                {isLoading ? <Loader2 className="animate-spin" /> : <Search className="mr-2 w-4 h-4"/>} БЫСТРЫЙ АНАЛИЗ
              </Button>
            </Card>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 space-y-8">
            {data && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Видео", v: data.channelData.videoCount},
                    {l: "Виральные", v: data.outlierVideos.length}
                  ].map((s, idx) => (
                    <Card key={idx} className="bg-zinc-900 border-zinc-800 p-4 text-center">
                      <p className="text-xl font-black text-emerald-400">{s.v.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.l}</p>
                    </Card>
                  ))}
                </div>

                {/* Chart */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                   <CardTitle className="mb-4 text-sm uppercase text-zinc-500">Динамика просмотров</CardTitle>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={4} dot={{r:6}} />
                      </LineChart>
                    </ResponsiveContainer>
                   </div>
                </Card>

                {/* Clickable Outliers */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center"><TrendingUp className="mr-2 text-emerald-500"/> РЕФЕРЕНСЫ ВАШЕЙ НИШИ</h3>
                    <div className="flex space-x-4 overflow-x-auto pb-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="flex-none w-64 group">
                                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group-hover:border-emerald-500 transition-all">
                                    <img src={v.thumbnail} className="aspect-video object-cover" />
                                    <div className="p-3">
                                        <p className="text-xs font-bold line-clamp-2">{v.title}</p>
                                        <p className="text-[10px] text-zinc-500 mt-1">{v.channelTitle}</p>
                                    </div>
                                </Card>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Detailed Button */}
                {!data.aiAnalysis.contentPlan.length && (
                    <Button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 h-16 text-lg font-black italic">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-2"/> : <FileText className="mr-2"/>} ПОЛУЧИТЬ ПОДРОБНУЮ СТРАТЕГИЮ (14 ДНЕЙ)
                    </Button>
                )}

                {/* AI Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="bg-red-500/5 border-red-500/20 p-6 space-y-4">
                        <h4 className="text-red-500 font-bold flex items-center"><AlertTriangle className="mr-2 w-4 h-4"/> ОШИБКИ</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => <p key={i} className="text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">{m}</p>)}
                    </Card>
                    <Card className="bg-emerald-500/5 border-emerald-500/20 p-6 space-y-4">
                        <h4 className="text-emerald-500 font-bold flex items-center"><Lightbulb className="mr-2 w-4 h-4"/> ТОЧКИ РОСТА</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => <p key={i} className="text-sm text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">{t}</p>)}
                    </Card>
                </div>

                {data.aiAnalysis.contentPlan.length > 0 && (
                    <div className="space-y-6 animate-in slide-in-from-top-4 duration-500">
                        <h3 className="text-2xl font-black text-violet-400">ПОЛНЫЙ ОТЧЕТ ГОТОВ</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800">
                                    <span className="text-emerald-500 font-mono text-xs font-bold">ДЕНЬ {p.day}</span>
                                    <p className="text-sm mt-2 leading-relaxed">{p.topic}</p>
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
