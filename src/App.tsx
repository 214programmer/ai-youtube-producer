import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, Download, Users, DollarSign, Zap, ImageIcon } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [thumbnails, setThumbnails] = useState<Record<number, {loading: boolean, url?: string}>>({});

  const handleGenerateThumbnail = async (title: string, visuals: string, index: number) => {
    setThumbnails(prev => ({...prev, [index]: {loading: true}}));
    try {
      const res = await fetch('/api/generate-thumbnail-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, visuals, customGeminiKey })
      });
      const d = await res.json();
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(d.imagePrompt)}?width=1280&height=720&nologo=true`;
      setThumbnails(prev => ({...prev, [index]: {loading: false, url: imageUrl}}));
    } catch (e: any) {
      alert('Ошибка генерации: ' + e.message);
      setThumbnails(prev => ({...prev, [index]: {loading: false}}));
    }
  };

  const handleAnalyze = async () => {
    if (!channelUrl || !niche) { setError('Заполните все поля!'); return; }
    setIsLoading(true); setError(null); setData(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, niche, customGeminiKey })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (err: any) { setError(err.message); } finally { setIsLoading(false); }
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'strategy.json';
    a.click();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between pb-8 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <Youtube className="w-10 h-10 text-emerald-500" />
            <h1 className="text-3xl font-black italic tracking-tighter">AI YOUTUBE PRO</h1>
          </div>
          {data && <Button onClick={handleDownload} variant="outline" className="border-zinc-700 text-zinc-400"><Download className="w-4 h-4 mr-2"/> JSON</Button>}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader><CardTitle>Анализ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} />
                <Input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} />
                <Input type="password" placeholder="Ключ Groq (gsk_...)" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} />
                <Button className="w-full bg-emerald-600 hover:bg-emerald-500" onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? <Loader2 className="animate-spin" /> : "Запустить"}
                </Button>
              </CardContent>
            </Card>
            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">{error}</div>}
          </div>

          <div className="lg:col-span-3 space-y-8">
            {!data && !isLoading && <div className="h-64 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 font-bold">В ОЖИДАНИИ ДАННЫХ...</div>}
            {isLoading && <div className="h-64 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-12 h-12 animate-spin text-emerald-500"/><p className="text-zinc-500 animate-pulse">ИИ строит стратегию захвата ниши...</p></div>}

            {data && (
              <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers, i: <Users/>},
                    {l: "Просмотры", v: data.channelData.totalViews, i: <TrendingUp/>},
                    {l: "Видео", v: data.channelData.videoCount, i: <Youtube/>},
                    {l: "Виральные", v: data.outlierVideos.length, i: <Zap/>}
                  ].map((s, idx) => (
                    <Card key={idx} className="bg-zinc-900 border-zinc-800 p-4">
                      <div className="text-emerald-500 mb-2">{s.i}</div>
                      <p className="text-2xl font-black font-mono">{s.v.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.l}</p>
                    </Card>
                  ))}
                </div>

                {/* Chart */}
                <Card className="bg-zinc-900 border-zinc-800 p-6">
                  <CardTitle className="mb-6 flex items-center"><TrendingUp className="mr-2 text-emerald-500"/> Динамика последних видео</CardTitle>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis dataKey="title" hide />
                        <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v)=>v >= 1000 ? (v/1000).toFixed(1)+'k' : v} />
                        <Tooltip contentStyle={{backgroundColor:'#09090b', border:'1px solid #27272a', borderRadius:'12px'}} />
                        <Line type="step" dataKey="views" stroke="#10b981" strokeWidth={4} dot={{fill:'#10b981', r:6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* References */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black italic flex items-center"><Zap className="mr-2 text-yellow-400"/> РЕФЕРЕНСЫ НИШИ (КЛИКАБЕЛЬНО)</h3>
                    <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="flex-none w-72 block group">
                                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group-hover:border-emerald-500 transition-all duration-300">
                                    <div className="relative">
                                        <img src={v.thumbnail} className="aspect-video object-cover" />
                                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-[10px] text-emerald-400 font-bold">{v.views.toLocaleString()} VIEWS</div>
                                    </div>
                                    <div className="p-4"><p className="text-sm font-bold line-clamp-2 leading-tight mb-2">{v.title}</p><p className="text-xs text-zinc-500">{v.channelTitle}</p></div>
                                </Card>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Analysis Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <Card className="bg-red-500/5 border-red-500/20 p-6">
                            <h4 className="text-red-500 font-black mb-4 flex items-center"><AlertTriangle className="mr-2"/> КРИТИЧЕСКИЕ ОШИБКИ</h4>
                            <div className="space-y-3">{data.aiAnalysis.mistakes.map((m:string, i:number) => <div key={i} className="p-3 bg-zinc-900 rounded-xl text-sm border border-zinc-800">{m}</div>)}</div>
                        </Card>
                        <Card className="bg-emerald-500/5 border-emerald-500/20 p-6">
                            <h4 className="text-emerald-500 font-black mb-4 flex items-center"><Lightbulb className="mr-2"/> ТОЧКИ РОСТА</h4>
                            <div className="space-y-3">{data.aiAnalysis.tips.map((t:string, i:number) => <div key={i} className="p-3 bg-zinc-900 rounded-xl text-sm border border-zinc-800">{t}</div>)}</div>
                        </Card>
                        <Card className="bg-zinc-900 border-zinc-800 p-6">
                            <h4 className="font-black mb-4 flex items-center text-blue-400"><Search className="mr-2"/> SEO И МОНЕТИЗАЦИЯ</h4>
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">{data.aiAnalysis.seoPack.recommendedTags.map((t:string, i:number)=> <span key={i} className="px-2 py-1 bg-zinc-800 text-[10px] rounded-md text-zinc-400">{t}</span>)}</div>
                                <div className="space-y-2">{data.aiAnalysis.seoPack.titleTemplates.map((t:string, i:number)=> <div key={i} className="text-sm italic text-zinc-300">" {t} "</div>)}</div>
                                <div className="pt-4 border-t border-zinc-800 space-y-2">
                                    <p className="text-xs font-bold text-emerald-500 uppercase">Бизнес-стратегия:</p>
                                    {data.aiAnalysis.monetization.map((m:string, i:number)=> <p key={i} className="text-sm text-zinc-400">• {m}</p>)}
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="bg-zinc-900 border-zinc-800 p-6">
                            <h4 className="font-black mb-4 text-violet-400">КОНТЕНТ-ПЛАН НА 14 ДНЕЙ</h4>
                            <div className="space-y-3 h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                                {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                    <div key={i} className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
                                        <div className="flex justify-between items-center mb-2"><span className="text-xs font-black text-emerald-500">ДЕНЬ {p.day}</span></div>
                                        <p className="text-sm leading-relaxed text-zinc-300">{p.topic}</p>
                                    </div>
                                ))}
                            </div>
                        </Card>

                        {data.aiAnalysis.scripts.map((s:any, i:number) => (
                            <Card key={i} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                                <CardHeader className="bg-zinc-800/30 border-b border-zinc-800"><CardTitle className="text-sm">Сценарий: {s.title}</CardTitle></CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div><p className="text-[10px] font-bold text-zinc-500 mb-1">СЛОВА:</p><p className="text-sm text-zinc-200">{s.script}</p></div>
                                    <div><p className="text-[10px] font-bold text-zinc-500 mb-1">КАДР:</p><p className="text-sm text-zinc-400 italic">{s.visuals}</p></div>
                                    <Button onClick={()=>handleGenerateThumbnail(s.title, s.visuals, i)} disabled={thumbnails[i]?.loading} className="w-full bg-violet-600 hover:bg-violet-500">
                                        {thumbnails[i]?.loading ? <Loader2 className="animate-spin w-4 h-4" /> : <ImageIcon className="w-4 h-4 mr-2" />} ПРЕВЬЮ
                                    </Button>
                                    {thumbnails[i]?.url && <img src={thumbnails[i].url} className="w-full aspect-video object-cover rounded-xl mt-4 border border-zinc-700" />}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
