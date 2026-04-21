import { useState, useEffect } from "react";
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Bell, 
  RefreshCw, 
  Calendar, 
  Newspaper,
  ShieldAlert,
  Settings as SettingsIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { analyzeMarket, MarketAnalysis } from "@/src/services/geminiService";
import axios from "axios";
import { cn } from "@/lib/utils";

export default function App() {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem("discord_webhook") || "");
  const [showSettings, setShowSettings] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [autoPoll, setAutoPoll] = useState(localStorage.getItem("auto_poll") === "true");
  const [autoPush, setAutoPush] = useState(localStorage.getItem("auto_push") === "true");
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [currentTime, setCurrentTime] = useState(new Date());

  const performAnalysis = async (isAuto = false) => {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "undefined") {
      alert("CRITICAL ERROR: GEMINI_API_KEY is missing. Please add it to your Vercel Environment Variables and redeploy.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await analyzeMarket();
      setAnalysis(result);
      
      if (isAuto && autoPush && webhookUrl) {
        await pushBriefing(result);
      }
    } catch (error) {
      console.error("Analysis failed", error);
      alert("Market scan failed. Check the browser console for details.");
    } finally {
      setLoading(false);
      setTimeLeft(15 * 60);
    }
  };

  const pushBriefing = async (data: MarketAnalysis) => {
    if (!data || !webhookUrl) return;
    setNotifying(true);
    try {
      const message = `
**🚨 Trading Sentinel Briefing 🚨**
**Status:** ${data.status}
**Sentiment Score:** ${data.sentimentScore}/10
**Reasoning:** ${data.reasoning}

**Asset Expected Directions:**
${data.assetDirections?.map(a => `• **${a.asset}:** ${a.direction} - *${a.reasoning}*`).join("\n") || "No asset direction data"}

**Short Squeeze Risk:** ${data.shortSqueezeRisk.level}
*${data.shortSqueezeRisk.warning}*

**Top News:**
${data.techNews.map(n => `• ${n.headline} (${n.sentiment})`).join("\n")}

**Key Events:**
${data.economicCalendar.filter(e => e.impact === "High").map(e => `• ${e.time}: ${e.event}`).join("\n")}
      `;
      
      // Directly POST to Discord Webhook to avoid Vercel backend routing issues
      await axios.post(webhookUrl, { 
        content: message,
        username: "Trading Sentinel",
        avatar_url: "https://cdn-icons-png.flaticon.com/512/2586/2586117.png"
      });
    } catch (error) {
      console.error("Failed to send notification:", error);
      alert("Failed to push to Discord. Ensure your Webhook URL is valid.");
    } finally {
      setNotifying(false);
    }
  };

  const handleManualPush = async () => {
    if (!analysis) return;
    await pushBriefing(analysis);
    alert("Briefing pushed to Discord!");
  };

  useEffect(() => {
    performAnalysis();
    if (!localStorage.getItem("discord_webhook")) {
      setShowSettings(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("discord_webhook", webhookUrl);
    localStorage.setItem("auto_poll", String(autoPoll));
    localStorage.setItem("auto_push", String(autoPush));
  }, [webhookUrl, autoPoll, autoPush]);

  useEffect(() => {
    if (!autoPoll) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          performAnalysis(true);
          return 15 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoPoll, autoPush, webhookUrl]);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "GO": return "text-green-400 border-green-500/20 bg-green-500/10";
      case "NO-GO": return "text-yellow-400 border-yellow-500/20 bg-yellow-500/10";
      case "HARD LOCK": return "text-red-400 border-red-500/20 bg-red-500/10";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-orange-500/30">
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.5)]">
              <ShieldAlert className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">Trading Sentinel</h1>
              <div className="flex items-center gap-3 mt-1.5">
                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-white/10", autoPoll ? "text-orange-400 border-orange-500/30" : "text-gray-600")}>
                  {autoPoll ? "AUTO-POLL ACTIVE" : "MANUAL MODE"}
                </Badge>
                {autoPoll && (
                  <p className="text-[10px] text-orange-500/90 font-mono font-bold tracking-widest">NEXT SCAN: {formatTime(timeLeft)}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setShowSettings(!showSettings)}
                className={cn("text-gray-400 hover:text-white hover:bg-white/5 h-10 w-10", showSettings && "text-orange-500 bg-orange-500/10")}
              >
                <SettingsIcon className="w-5 h-5" />
              </Button>
              {!webhookUrl && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-ping" />
              )}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => performAnalysis(false)} 
              disabled={loading}
              className="border-white/10 bg-white/5 hover:bg-white/10 text-xs uppercase tracking-widest font-bold h-10 px-4"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh
            </Button>
            <Button 
              size="sm" 
              onClick={handleManualPush}
              disabled={!analysis || notifying || !webhookUrl}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs uppercase tracking-widest font-bold h-10 px-4 shadow-[0_0_15px_rgba(234,88,12,0.3)]"
            >
              <Bell className="w-4 h-4 mr-2" />
              Push Briefing
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        <AnimatePresence mode="wait">
          {showSettings && (
            <motion.div 
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: "auto", opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <Card className="bg-white/5 border-orange-500/20 shadow-[0_0_30px_rgba(234,88,12,0.1)]">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xs uppercase tracking-[0.2em] text-orange-500 font-black">Sentinel Configuration</CardTitle>
                  <CardDescription className="text-gray-400 text-[10px]">Configure your automation and notification endpoints</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Discord Webhook URL</label>
                      {!webhookUrl && <span className="text-[9px] text-orange-500 animate-pulse font-bold">REQUIRED FOR PUSH NOTIFICATIONS</span>}
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://discord.com/api/webhooks/..." 
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500/50 font-mono text-white placeholder:text-gray-700 transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={cn("flex items-center justify-between p-5 rounded-xl border transition-all", autoPoll ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/5")}>
                      <div>
                        <p className="text-sm font-bold text-white">Auto-Poll Market</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tight mt-0.5">Scan every 15 minutes</p>
                      </div>
                      <Button 
                        variant={autoPoll ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoPoll(!autoPoll)}
                        className={cn("font-bold text-[10px]", autoPoll ? "bg-orange-600 hover:bg-orange-700" : "border-white/10 hover:bg-white/10")}
                      >
                        {autoPoll ? "ACTIVE" : "DISABLED"}
                      </Button>
                    </div>

                    <div className={cn("flex items-center justify-between p-5 rounded-xl border transition-all", autoPush ? "bg-orange-500/10 border-orange-500/30" : "bg-white/5 border-white/5")}>
                      <div>
                        <p className="text-sm font-bold text-white">Auto-Push Briefing</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-tight mt-0.5">Send to Discord on every scan</p>
                      </div>
                      <Button 
                        variant={autoPush ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAutoPush(!autoPush)}
                        className={cn("font-bold text-[10px]", autoPush ? "bg-orange-600 hover:bg-orange-700" : "border-white/10 hover:bg-white/10")}
                      >
                        {autoPush ? "ACTIVE" : "DISABLED"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && !analysis ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <div className="relative">
              <RefreshCw className="w-16 h-16 text-orange-500 animate-spin" />
              <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-white font-black text-lg tracking-[0.3em] uppercase italic">Scanning Markets</p>
              <p className="text-gray-500 font-mono text-[10px] tracking-widest uppercase">Aggregating News & Economic Data...</p>
            </div>
          </div>
        ) : analysis ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="bg-white/5 border-white/10 overflow-hidden relative group">
                  <div className={cn("absolute top-0 left-0 w-1.5 h-full transition-all group-hover:w-2", 
                    analysis.status === "GO" ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]" : 
                    analysis.status === "NO-GO" ? "bg-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]" : "bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                  )} />
                  <CardHeader>
                    <CardDescription className="uppercase tracking-[0.2em] text-[10px] font-bold text-gray-500">Session Status</CardDescription>
                    <CardTitle className={cn("text-5xl font-black italic flex items-center gap-4 mt-2", getStatusColor(analysis.status))}>
                      {analysis.status}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 text-sm leading-relaxed font-medium">{analysis.reasoning}</p>
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardDescription className="uppercase tracking-[0.2em] text-[10px] font-bold text-gray-500">Market Sentiment</CardDescription>
                    <CardTitle className="text-5xl font-black text-white mt-2">
                      {analysis.sentimentScore}<span className="text-gray-600 text-2xl ml-1">/10</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${analysis.sentimentScore * 10}%` }}
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                      />
                    </div>
                    <div className="flex justify-between text-[9px] uppercase tracking-widest text-gray-500 font-black">
                      <span>Extreme Fear</span>
                      <span>Neutral</span>
                      <span>Extreme Greed</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {analysis.shortSqueezeRisk.level !== "Low" && (
                <Alert className={cn("border-orange-500/30 bg-orange-500/10 py-6", 
                  analysis.shortSqueezeRisk.level === "High" ? "border-red-500/50 bg-red-500/10" : ""
                )}>
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                  <div className="ml-3">
                    <AlertTitle className="text-orange-500 uppercase tracking-[0.2em] text-xs font-black">
                      Short Squeeze Alert: {analysis.shortSqueezeRisk.level}
                    </AlertTitle>
                    <AlertDescription className="text-white text-sm mt-2 italic font-medium leading-relaxed">
                      {analysis.shortSqueezeRisk.warning}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              {/* Asset Expected Directions */}
              {analysis.assetDirections && analysis.assetDirections.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-white font-black">Expected Daily Direction</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.assetDirections.map((asset, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-white/5 bg-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-black text-white">{asset.asset}</span>
                            <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5", 
                              asset.direction === "Bullish" ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                              asset.direction === "Bearish" ? "bg-red-500/20 text-red-400 border border-red-500/30" : 
                              "bg-gray-500/20 text-gray-400 border border-white/10"
                            )}>
                              {asset.direction}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed font-medium">
                            {asset.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-white/5 border-white/10">
                <CardHeader className="flex flex-row items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <Newspaper className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-white font-black">Tech Sector Intel</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-8">
                  <div className="space-y-10">
                    {analysis.techNews.map((news, i) => (
                      <div key={i} className="group">
                        <div className="flex items-start justify-between gap-6 mb-3">
                          <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors leading-tight">{news.headline}</h3>
                          <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5 shrink-0", 
                            news.sentiment === "Bullish" ? "bg-green-500/20 text-green-400 border border-green-500/30" : 
                            news.sentiment === "Bearish" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-gray-500/20 text-gray-400 border border-white/10"
                          )}>
                            {news.sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed font-medium">{news.summary}</p>
                        {i < analysis.techNews.length - 1 && <Separator className="mt-10 bg-white/5" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-8">
              <Card className="bg-white/5 border-white/10 h-fit">
                <CardHeader className="border-b border-white/5 pb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-orange-500" />
                    <CardTitle className="text-xs uppercase tracking-[0.2em] text-white font-black">Economic Calendar</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-6">
                      {analysis.economicCalendar.map((event, i) => (
                        <div key={i} className="flex gap-4 items-start group">
                          <div className="font-mono text-[11px] text-orange-500/70 pt-1 shrink-0 font-bold">{event.time}</div>
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">{event.event}</span>
                              {event.impact === "High" && (
                                <Badge variant="destructive" className="text-[8px] h-4 px-1.5 uppercase font-black bg-red-600">High Impact</Badge>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500 italic leading-relaxed">{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="bg-orange-600/5 border-orange-600/20">
                <CardHeader>
                  <CardTitle className="text-[10px] uppercase tracking-[0.2em] text-orange-500 font-black">Sentinel Protocol</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    "NO TRADING AGAINST 1H TREND",
                    "HARD LOCK 30M BEFORE/AFTER RED FOLDERS",
                    "WATCH FOR BULLISH DIVERGENCE (SQUEEZE RISK)"
                  ].map((rule, i) => (
                    <div key={i} className="flex items-center gap-3 text-[10px] text-gray-300 font-bold tracking-tight">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-600 shadow-[0_0_8px_rgba(234,88,12,0.8)]" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="text-center py-40 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <RefreshCw className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">No active session data</p>
            <Button variant="link" onClick={() => performAnalysis(false)} className="text-orange-500 mt-2">Initialize Scan</Button>
          </div>
        )}
      </main>

      <footer className="border-t border-white/5 py-12 mt-20 bg-black/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-[0.3em] text-gray-600 font-black">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>SENTINEL SYSTEM ONLINE // {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} BST</span>
          </div>
          <div className="flex gap-8">
            <div className="flex flex-col items-end">
              <span className="text-gray-800">London Open</span>
              <span className="text-gray-400 mt-1">08:00 BST</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-gray-800">NY Open</span>
              <span className="text-gray-400 mt-1">14:30 BST</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
