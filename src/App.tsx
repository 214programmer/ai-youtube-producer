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
  const [deepReportDone, setDeepReportDone] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setDeepReportDone(false);
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
      setDeepReportDone(true);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-4 border-b border-zinc-800 pb-8">
          <div className="bg-emerald-500 p-2 rounded-xl"><Youtube className="w-8 h-8 text-black" /></div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">AI PRODUCER <span className="text-emerald-500">V2</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-5 shadow-2xl">
              <Input placeholder="URL канала" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="bg-black border-zinc-800" />
              <Input placeholder="Ваша ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="bg-black border-zinc-800" />
              <Input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="bg-black border-zinc-800" />
              <Button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 font-black h-14 rounded-2xl text-lg">
                {isLoading ? <Loader2 className="animate-spin" /> : "НАЧАТЬ АУДИТ"}
              </Button>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Видео", v: data.channelData.videoCount},
                    {l: "Виральные", v: data.outlierVideos.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl text-center">
                      <p className="text-xl font-black text-emerald-400">{s.v.toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-2">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* ===== ВОТ ЭТА КНОПКА ===== */}
                {!deepReportDone && (
                    <div className="p-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-[30px] animate-pulse">
                        <Button 
                            onClick={handleDeepReport} 
                            disabled={isDeepLoading} 
                            className="w-full h-24 bg-[#09090b] hover:bg-zinc-900 rounded-[26px] text-2xl font-black uppercase text-red-500"
                        >
                            {isDeepLoading ? <Loader2 className="animate-spin mr-3 w-8 h-8"/> : <FileText className="mr-3 w-8 h-8"/>}
                            🔥 ПОЛУЧИТЬ ПЛАН НА 14 ДНЕЙ 🔥
                        </Button>
                    </div>
                )}
                {/* ========================== */}

                <Card className="bg-zinc-900 border-zinc-800 p-8 rounded-[40px]">
                   <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none', borderRadius:'20px'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={6} dot={{r:8, fill:'#10b981', strokeWidth:0}} />
                      </LineChart>
                    </ResponsiveContainer>
                   </div>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black"><AlertTriangle className="mr-2 inline"/> ОШИБКИ</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => <div key={i} className="p-5 bg-zinc-900/50 border border-red-500/10 rounded-3xl text-sm">{m}</div>)}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black"><Lightbulb className="mr-2 inline"/> ТОЧКИ РОСТА</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => <div key={i} className="p-5 bg-zinc-900/50 border border-emerald-500/10 rounded-3xl text-sm">{t}</div>)}
                    </div>
                </div>

                {deepReportDone && (
                    <div className="space-y-8 pt-10 border-t border-zinc-800">
                        <h3 className="text-4xl font-black text-violet-400 text-center">План на 14 дней</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-8 bg-zinc-900 rounded-[40px] border border-zinc-800">
                                    <span className="bg-violet-600 text-white px-5 py-1 rounded-full font-black text-xs">ДЕНЬ {p.day}</span>
                                    <p className="text-lg font-bold mt-4 text-zinc-100">{p.topic}</p>
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
