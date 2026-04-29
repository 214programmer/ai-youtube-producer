import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, Download, Users, DollarSign, Zap, ImageIcon } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
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
      if (d.error) throw new Error(d.error);

      // We use Pollinations space for a free generation by URL
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(d.imagePrompt)}?width=1280&height=720&nologo=true`;
      
      setThumbnails(prev => ({...prev, [index]: {loading: false, url: imageUrl}}));
    } catch (e: any) {
      alert('Ошибка при генерации превью: ' + e.message);
      setThumbnails(prev => ({...prev, [index]: {loading: false}}));
    }
  };

  const handleAnalyze = async (useMock = false) => {
    if (!channelUrl || !niche) {
      setError('Заполните все поля, пожалуйста.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setData(null);

    const endpoint = useMock ? '/api/analyze-mock' : '/api/analyze';

    try {
      // 1. Fetch channel and video data from our YouTube backend
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ channelUrl, niche, characterName: 'Мятный Дух', customGeminiKey })
      });

      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Server error');
      }

      const youtubeData = result.data;
      
      setData(youtubeData);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-strategy-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex items-center space-x-3 pb-8 border-b border-zinc-800">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <Youtube className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50">AI YouTube Producer</h1>
            <p className="text-zinc-400">Pro Edition</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form setup */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Параметры анализа</CardTitle>
                <CardDescription>Введите данные о вашем канале</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Ссылка на канал (или @handle)</label>
                  <Input 
                    placeholder="Например: https://youtube.com/@mychannel" 
                    value={channelUrl}
                    onChange={(e) => setChannelUrl(e.target.value)}
                  />
                  <p className="text-xs text-zinc-500">Вставьте ID (UC...), @никнейм или полную ссылку</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">Ниша</label>
                  <Input 
                    placeholder="Например: animation, funny shorts" 
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-300">API ключ Gemini (опционально, если ошибка лимитов)</label>
                  <Input 
                    type="password"
                    placeholder="Ваш личный Gemini API Key" 
                    value={customGeminiKey}
                    onChange={(e) => setCustomGeminiKey(e.target.value)}
                  />
                  <p className="text-[10px] text-zinc-500">Поможет, если стандартный ключ перегружен. Можно получить в Google AI Studio.</p>
                </div>

                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                  onClick={() => handleAnalyze(false)}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Запустить анализ
                </Button>

                {error?.includes("YOUTUBE_API_KEY") && (
                   <Button 
                   className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 mt-2" 
                   onClick={() => handleAnalyze(true)}
                   disabled={isLoading}
                 >
                   Запустить Демо-режим (Mock Data)
                 </Button>
                )}
              </CardContent>
            </Card>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
                <p className="font-semibold mb-1">Ошибка:</p>
                {error}
              </div>
            )}
          </div>

          {/* Results Display */}
          <div className="lg:col-span-2 space-y-6">
            {!data && !isLoading && (
              <div className="h-full min-h-[400px] border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500">
                <div className="text-center space-y-2">
                  <Youtube className="w-12 h-12 mx-auto text-zinc-700" />
                  <p>В ожидании запуска стратегии...</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="h-full min-h-[400px] border border-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-400 space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                <p>AI собирает данные и генерирует уникальные рекомендации...</p>
              </div>
            )}

            {data && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Stats row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-xl font-mono text-emerald-400">{data.channelData.subscribers.toLocaleString()}</CardTitle>
                      <CardDescription>Подписчиков</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-xl font-mono text-emerald-400">{data.channelData.totalViews.toLocaleString()}</CardTitle>
                      <CardDescription>Всего просмотров</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-xl font-mono text-emerald-400">{data.userVideos?.length || 0}</CardTitle>
                      <CardDescription>Недавних видео</CardDescription>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-xl font-mono text-emerald-400">{data.outlierVideos?.length || 0}</CardTitle>
                      <CardDescription>Вирусных видео</CardDescription>
                    </CardHeader>
                  </Card>
                </div>

                {/* AI Insights Card */}
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader>
                    <CardTitle>Динамика просмотров последних видео</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[...data.userVideos].reverse().map((v, i) => ({ name: `Видео ${i+1}`, views: v.views, title: v.title }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-lg max-w-[200px]">
                                  <p className="text-zinc-400 text-xs mb-1">{label}</p>
                                  <p className="text-zinc-100 text-sm font-medium leading-tight mb-2 line-clamp-3">
                                    {payload[0].payload.title}
                                  </p>
                                  <p className="text-emerald-400 font-bold text-sm">
                                    {payload[0].value?.toLocaleString('ru-RU')} просмотров
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line type="monotone" dataKey="views" name="Просмотры" stroke="#10b981" strokeWidth={3} dot={{ fill: '#09090b', stroke: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Outliers */}
                {data.outlierVideos && data.outlierVideos.length > 0 && (
                  <div className="space-y-4 pt-4">
                    <h3 className="text-xl font-semibold tracking-tight flex items-center">
                      <TrendingUp className="w-5 h-5 text-emerald-500 mr-2" /> Референсы: Вирусные видео в нише
                    </h3>
                    <div className="flex space-x-4 overflow-x-auto pb-4 snap-x">
                      {data.outlierVideos.map((v: any, i: number) => (
                        <div key={i} className="flex-none w-64 snap-start">
                           <Card className="h-full overflow-hidden border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
                             <div className="aspect-video bg-zinc-800 relative">
                               {v.thumbnail ? (
                                 <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               ) : (
                                 <div className="flex items-center justify-center w-full h-full"><Youtube className="text-zinc-600 w-8 h-8" /></div>
                               )}
                               <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono text-emerald-400 font-medium">
                                 {v.views >= 1000000 ? (v.views/1000000).toFixed(1) + 'M' : v.views >= 1000 ? Math.floor(v.views/1000) + 'K' : v.views}
                               </div>
                             </div>
                             <CardContent className="p-4">
                               <p className="font-medium text-sm line-clamp-2 leading-tight text-zinc-200" title={v.title}>{v.title}</p>
                               <p className="text-xs text-zinc-500 mt-2">{v.channelTitle}</p>
                             </CardContent>
                           </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
                   {/* Left Column: AI Insights & SEO */}
                   <div className="space-y-6">
                      <Card className="border-emerald-500/20 bg-emerald-500/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-4">
                          <div>
                            <CardTitle className="text-emerald-500 flex items-center text-lg">
                               <Lightbulb className="w-5 h-5 mr-2" /> Главные выводы ИИ
                            </CardTitle>
                          </div>
                          <Button onClick={handleDownload} className="bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs px-3 h-8">
                            <Download className="w-4 h-4 mr-2" /> JSON
                          </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div>
                            <h4 className="flex items-center text-sm font-semibold text-red-400 mb-3">
                              <AlertTriangle className="w-4 h-4 mr-2" /> Ошибки
                            </h4>
                            <ul className="space-y-2">
                              {data.aiAnalysis.mistakes.map((m: string, i: number) => (
                                <li key={i} className="text-sm text-zinc-300 bg-red-500/10 p-3 rounded-md border border-red-500/10 leading-relaxed">{m}</li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <h4 className="flex items-center text-sm font-semibold text-emerald-400 mb-3">
                              <TrendingUp className="w-4 h-4 mr-2" /> Точки роста
                            </h4>
                            <ul className="space-y-2">
                              {data.aiAnalysis.tips.map((t: string, i: number) => (
                                <li key={i} className="text-sm text-zinc-300 bg-emerald-500/10 p-3 rounded-md border border-emerald-500/10 leading-relaxed">{t}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>

                      {data.aiAnalysis.seoPack && (
                        <Card className="bg-zinc-900/40 border-zinc-800">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center">
                              <Search className="w-5 h-5 mr-2 text-zinc-400" /> SEO и Позиционирование
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-5 text-sm text-zinc-300">
                            <div>
                              <p className="font-semibold text-zinc-200 mb-3">Хештеги для охватов:</p>
                              <div className="flex flex-wrap gap-2">
                                {data.aiAnalysis.seoPack.recommendedTags?.map((tag: string, i: number) => (
                                  <span key={i} className="px-2.5 py-1 bg-zinc-800 rounded-md text-xs font-mono text-zinc-400">{tag}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="font-semibold text-zinc-200 mb-3">Шаблоны заголовков:</p>
                              <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                                {data.aiAnalysis.seoPack.titleTemplates?.map((title: string, i: number) => (
                                  <li key={i} className="leading-snug">{title}</li>
                                ))}
                              </ul>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {data.aiAnalysis.competitors && data.aiAnalysis.competitors.length > 0 && (
                        <Card className="bg-zinc-900/40 border-zinc-800">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center">
                              <Zap className="w-5 h-5 mr-2 text-yellow-500" /> Фишки аутлаеров
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-zinc-300">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                              {data.aiAnalysis.competitors.map((item: string, i: number) => (
                                <li key={i} className="leading-snug">{item}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {data.aiAnalysis.collaborations && data.aiAnalysis.collaborations.length > 0 && (
                        <Card className="bg-zinc-900/40 border-zinc-800">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center">
                              <Users className="w-5 h-5 mr-2 text-blue-400" /> Идеи коллабораций
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-zinc-300">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                              {data.aiAnalysis.collaborations.map((item: string, i: number) => (
                                <li key={i} className="leading-snug">{item}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}

                      {data.aiAnalysis.monetization && data.aiAnalysis.monetization.length > 0 && (
                        <Card className="bg-zinc-900/40 border-zinc-800">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center">
                              <DollarSign className="w-5 h-5 mr-2 text-emerald-400" /> Стратегия монетизации
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2 text-sm text-zinc-300">
                            <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                              {data.aiAnalysis.monetization.map((item: string, i: number) => (
                                <li key={i} className="leading-snug">{item}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      )}
                   </div>

                   {/* Right Column: Planner & Scripts */}
                   <div className="space-y-6">
                      {data.aiAnalysis.contentPlan && data.aiAnalysis.contentPlan.length > 0 && (
                        <Card className="bg-zinc-900/40 border-zinc-800">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg">Контент-план на {data.aiAnalysis.contentPlan.length} дней</CardTitle>
                          </CardHeader>
                          <CardContent>
                             <div className="space-y-3">
                               {data.aiAnalysis.contentPlan.map((item: any, i: number) => (
                                 <div key={i} className="flex gap-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 items-center">
                                   <div className="flex-none bg-emerald-500/10 text-emerald-400 font-mono font-bold w-10 h-10 flex items-center justify-center rounded-full shrink-0">
                                     D{item.day}
                                   </div>
                                   <div className="text-sm text-zinc-300 leading-snug">
                                     {item.topic}
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </CardContent>
                        </Card>
                      )}

                      {data.aiAnalysis.scripts && data.aiAnalysis.scripts.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold tracking-tight text-white/90 pt-2">Готовые сценарии</h3>
                          {data.aiAnalysis.scripts.map((script: any, i: number) => (
                            <Card key={i} className="bg-zinc-900/50 border-zinc-800/80">
                              <CardHeader className="pb-3 border-b border-zinc-800/50">
                                <CardTitle className="text-base text-zinc-100">#{i+1} {script.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="pt-4 space-y-4">
                                 <div>
                                   <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Сценарий (Озвучка)</p>
                                   <p className="text-sm text-zinc-200 leading-relaxed disabled">{script.script}</p>
                                 </div>
                                 <div>
                                   <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Анимация (Экран)</p>
                                   <p className="text-sm text-zinc-400 leading-relaxed">{script.visuals}</p>
                                 </div>
                                 <div className="pt-2 border-t border-zinc-800/50">
                                   <Button 
                                     onClick={() => handleGenerateThumbnail(script.title, script.visuals, i)}
                                     disabled={thumbnails[i]?.loading}
                                     className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
                                   >
                                     {thumbnails[i]?.loading ? (
                                       <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                     ) : (
                                       <ImageIcon className="w-4 h-4 mr-2" />
                                     )}
                                     Сгенерировать превью
                                   </Button>
                                   
                                   {thumbnails[i]?.url && (
                                     <div className="mt-4">
                                       <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Обложка</p>
                                       <img 
                                         src={thumbnails[i].url} 
                                         alt="Сгенерированное превью" 
                                         className="w-full text-zinc-600 italic text-sm aspect-video object-cover rounded-xl border border-zinc-700 shadow-md bg-zinc-800" 
                                       />
                                     </div>
                                   )}
                                 </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
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
