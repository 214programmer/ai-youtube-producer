import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, DollarSign, FileText, ExternalLink } from 'lucide-react';

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
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-10">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI PRODUCER <span className="text-emerald-500">ULTRA</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 h-fit">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-sm outline-none focus:border-emerald-500" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center transition-all">
              {isLoading ? <Loader2 className="animate-spin" /> : "НАЧАТЬ АНАЛИЗ"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Видео", v: data.channelData.videoCount},
                    {l: "Конкуренты", v: data.outlierVideos.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center">
                      <p className="text-2xl font-black text-emerald-400 font-mono">{s.v.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase mt-2">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* РАЗБОР ХИТА - ТВОЙ ЛЮБИМЫЙ РАЗДЕЛ */}
                <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-[40px] shadow-2xl">
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-4 uppercase flex items-center">
                        <Zap className="mr-3 fill-emerald-500"/> РАЗБОР ВАШЕГО ХИТА
                    </h3>
                    <p className="text-zinc-300 leading-relaxed text-lg italic">
                        {data.aiAnalysis.bestVideoAnalysis}
                    </p>
                </div>

                {/* Референсы (КЛИКАБЕЛЬНЫЕ) */}
                <div className="space-y-4">
                    <h3 className="text-xl font-bold flex items-center text-zinc-400 italic tracking-widest uppercase"><TrendingUp className="mr-2 text-emerald-500"/> Топ видео в нише</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all">
                                <div className="relative">
                                    <img src={v.thumbnail} className="aspect-video object-cover w-full" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink/></div>
                                </div>
                                <div className="p-4"><p className="text-[11px] font-bold line-clamp-2 text-zinc-100">{v.title}</p></div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Ошибки и Стратегия */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-[35px] space-y-4">
                        <h4 className="text-red-500 font-black flex items-center text-xs tracking-widest uppercase"><AlertTriangle className="mr-2 w-4 h-4"/> КРИТИЧЕСКИЕ ОШИБКИ</h4>
                        <div className="space-y-2">{data.aiAnalysis.mistakes.map((m:string, i:number) => <div key={i} className="text-sm text-zinc-400 bg-black/40 p-4 rounded-2xl border border-zinc-800 leading-relaxed italic">“ {m} ”</div>)}</div>
                    </div>
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[35px] space-y-4">
                        <h4 className="text-emerald-500 font-black flex items-center text-xs tracking-widest uppercase"><Lightbulb className="mr-2 w-4 h-4"/> СТРАТЕГИЯ РОСТА</h4>
                        <div className="space-y-2">{data.aiAnalysis.tips.map((t:string, i:number) => <div key={i} className="text-sm text-zinc-300 bg-black/40 p-4 rounded-2xl border border-zinc-800 leading-relaxed">{t}</div>)}</div>
                    </div>
                </div>

                {/* Монетизация и Сценарии */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] space-y-4">
                        <h4 className="text-yellow-500 font-black flex items-center text-xs tracking-widest uppercase"><DollarSign className="mr-2 w-4 h-4"/> МОНЕТИЗАЦИЯ</h4>
                        {data.aiAnalysis.monetization.map((m:string, i:number) => <div key={i} className="text-sm text-zinc-400">• {m}</div>)}
                    </div>
                    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] space-y-4">
                        <h4 className="text-violet-500 font-black flex items-center text-xs tracking-widest uppercase"><FileText className="mr-2 w-4 h-4"/> СЦЕНАРИЙ SHORTS</h4>
                        {data.aiAnalysis.scripts.map((s:any, i:number) => (
                            <div key={i} className="space-y-2">
                                <p className="text-sm text-zinc-200 font-bold">{s.title}</p>
                                <p className="text-xs text-zinc-400 italic">{s.script}</p>
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
