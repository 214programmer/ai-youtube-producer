import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, {text: string, loading: boolean}>>({});

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setExplanations({});
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

  const handleExplain = async (text: string) => {
    if (explanations[text]) return;
    setExplanations(prev => ({...prev, [text]: {text: '', loading: true}}));
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, apiKey: customGeminiKey })
      });
      const result = await res.json();
      setExplanations(prev => ({...prev, [text]: {text: result.explanation, loading: false}}));
    } catch (e: any) { alert(e.message); }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI PRODUCER <span className="text-emerald-500 font-mono">X</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Form */}
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit shadow-2xl">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/20">
              {isLoading ? <Loader2 className="animate-spin" /> : "ЗАПУСТИТЬ АНАЛИЗ"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData?.subscribers},
                    {l: "Просмотры", v: data.channelData?.totalViews},
                    {l: "Видео", v: data.channelData?.videoCount},
                    {l: "Конкуренты", v: data.outlierVideos?.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center">
                      <p className="text-2xl font-black text-emerald-400">{s.v?.toLocaleString() || 0}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Diagram */}
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos}>
                            <CartesianGrid stroke="#27272a" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#52525b" fontSize={10} />
                            <Tooltip contentStyle={{backgroundColor:'#09090b', borderRadius:'15px', border:'none'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mistakes */}
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black flex items-center text-xs uppercase tracking-widest"><AlertTriangle className="mr-2 w-4 h-4"/> Критические ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm text-zinc-300 leading-relaxed italic">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="flex items-center text-[10px] font-black text-red-500 uppercase hover:text-red-400 transition-colors">
                                    <HelpCircle className="w-3 h-3 mr-1"/> {explanations[m]?.loading ? "Загрузка..." : "ПОДРОБНЕЕ"}
                                </button>
                                {explanations[m]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-red-500/10 animate-in fade-in slide-in-from-top-2">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    {/* Strategy */}
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black flex items-center text-xs uppercase tracking-widest"><Lightbulb className="mr-2 w-4 h-4"/> Стратегия роста</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm text-zinc-300 leading-relaxed">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="flex items-center text-[10px] font-black text-emerald-500 uppercase hover:text-emerald-400 transition-colors">
                                    <HelpCircle className="w-3 h-3 mr-1"/> {explanations[t]?.loading ? "Загрузка..." : "ПОЧЕМУ ЭТО ВАЖНО?"}
                                </button>
                                {explanations[t]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-emerald-500/10 animate-in fade-in slide-in-from-top-2">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* References */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black italic text-emerald-500 uppercase">РЕФЕРЕНСЫ НИШИ (КЛИКАЙ)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all shadow-xl">
                                <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-all duration-500" alt="" />
                                <div className="p-4"><p className="text-[10px] font-bold line-clamp-2 text-zinc-100">{v.title}</p></div>
                            </a>
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
