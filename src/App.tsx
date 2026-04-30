import React, { useState } from 'react';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, FileText, Zap, ExternalLink } from 'lucide-react';

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
        body: JSON.stringify({ channelTitle: data.channelData.title, niche, apiKey: customGeminiKey, task: 'plan' })
      });
      const deepData = await res.json();
      setData({ ...data, aiAnalysis: { ...data.aiAnalysis, contentPlan: deepData.contentPlan } });
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI YOUTUBE PRO <span className="text-emerald-500">ULTRA</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Форма */}
          <div className="lg:col-span-1 space-y-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 h-fit shadow-2xl">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm focus:border-emerald-500 outline-none transition-all" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center transition-all">
              {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "НАЧАТЬ АНАЛИЗ"}
            </button>
          </div>

          {/* Результаты */}
          <div className="lg:col-span-3 space-y-8">
            {!data && !isLoading && <div className="h-64 border-2 border-dashed border-zinc-800 rounded-[40px] flex items-center justify-center text-zinc-700 font-black tracking-widest text-xl italic">READY FOR ACTION</div>}
            
            {isLoading && <div className="h-64 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-12 h-12 animate-spin text-emerald-500"/><p className="text-zinc-500 animate-pulse font-bold uppercase tracking-tighter">Scanning algorithms...</p></div>}

            {data && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Видео", v: data.channelData.videoCount},
                    {l: "Конкуренты", v: data.outlierVideos.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center shadow-xl">
                      <p className="text-2xl font-black text-emerald-400 font-mono leading-none">{s.v.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2 tracking-widest">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* Кнопка глубокого отчета */}
                {!data.aiAnalysis.contentPlan.length && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 rounded-[30px] flex items-center justify-center text-xl font-black italic shadow-2xl shadow-violet-900/20 transition-all border-t border-violet-400/20">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3 w-7 h-7"/> : <FileText className="mr-3 w-7 h-7"/>}
                        СФОРМИРОВАТЬ ПЛАН НА 14 ДНЕЙ
                    </button>
                )}

                {/* Конкуренты */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black flex items-center italic text-emerald-500 uppercase tracking-tighter"><Zap className="mr-2 fill-yellow-500 text-yellow-500 w-5 h-5"/> Топ видео в нише</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all shadow-xl">
                                <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-all duration-500" alt="" />
                                <div className="p-4">
                                    <p className="text-[11px] font-bold line-clamp-2 leading-tight text-zinc-100">{v.title}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Ошибки и Советы */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-[35px] space-y-4 shadow-2xl">
                        <h4 className="text-red-500 font-black flex items-center text-xs tracking-widest uppercase"><AlertTriangle className="mr-2 w-4 h-4"/> ОШИБКИ</h4>
                        <div className="space-y-2">{data.aiAnalysis.mistakes.map((m:string, i:number) => <div key={i} className="text-sm text-zinc-300 bg-black/40 p-4 rounded-2xl border border-zinc-800 leading-relaxed italic">“ {m} ”</div>)}</div>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[35px] space-y-4 shadow-2xl">
                        <h4 className="text-emerald-500 font-black flex items-center text-xs tracking-widest uppercase"><Lightbulb className="mr-2 w-4 h-4"/> СТРАТЕГИЯ</h4>
                        <div className="space-y-2">{data.aiAnalysis.tips.map((t:string, i:number) => <div key={i} className="text-sm text-zinc-300 bg-black/40 p-4 rounded-2xl border border-zinc-800 leading-relaxed">{t}</div>)}</div>
                    </div>
                </div>

                {/* План на 14 дней */}
                {data.aiAnalysis.contentPlan.length > 0 && (
                    <div className="pt-10 border-t border-zinc-800 space-y-6 animate-in slide-in-from-bottom-10 duration-1000">
                        <h3 className="text-3xl font-black text-violet-400 italic text-center uppercase tracking-tighter">План развития</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[30px] hover:border-violet-500/40 transition-all shadow-xl">
                                    <span className="bg-violet-600 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase">День {p.day}</span>
                                    <p className="text-base font-bold mt-4 text-zinc-100 leading-tight">{p.topic}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
