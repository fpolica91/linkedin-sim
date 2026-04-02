"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User { id: string; name: string; email: string; plan: string; }
interface SimResult {
  reactions: { persona: string; role: string; reaction: string; sentiment: string; would_engage: boolean; }[];
  metrics: { predicted_likes: number; predicted_comments: number; predicted_shares: number; engagement_rate: number; };
  analysis: { overall_score: number; tone: string; cringe_factor: number; strengths: string[]; weaknesses: string[]; improved_version: string; };
  usage?: { plan: string; remaining: number; };
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState("");
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState<SimResult | null>(null);
  const [error, setError] = useState("");

  // Auth forms
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPass, setRegPass] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(data => { setUser(data.user); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: loginEmail, password: loginPass }) });
    const data = await res.json();
    if (data.error) { setAuthError(data.error); return; }
    setUser(data.user);
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: regName, email: regEmail, password: regPass }) });
    const data = await res.json();
    if (data.error) { setAuthError(data.error); return; }
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setResult(null);
  };

  const simulate = async () => {
    if (!post.trim()) return;
    setSimulating(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e: any) { setError(e.message); } finally { setSimulating(false); }
  };

  const scoreColor = (s: number) => s >= 75 ? "text-green-500" : s >= 50 ? "text-yellow-500" : "text-red-500";
  const scoreBg = (s: number) => s >= 75 ? "bg-green-500" : s >= 50 ? "bg-yellow-500" : "bg-red-500";
  const sentimentColor = (s: string) => s === "positive" ? "text-green-500" : s === "negative" ? "text-red-500" : "text-muted-foreground";

  if (loading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading...</p></div>;

  // Auth screen
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">LinkedIn Post Simulator</CardTitle>
            <CardDescription>Predict how your network reacts before you post</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={login} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@example.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" placeholder="••••••••" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
                  </div>
                  {authError && <p className="text-sm text-red-500">{authError}</p>}
                  <Button type="submit" className="w-full">Sign In</Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={register} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" value={regName} onChange={e => setRegName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input id="reg-email" type="email" placeholder="you@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input id="reg-password" type="password" placeholder="Min 8 characters" value={regPass} onChange={e => setRegPass(e.target.value)} required minLength={8} />
                  </div>
                  {authError && <p className="text-sm text-red-500">{authError}</p>}
                  <Button type="submit" className="w-full">Create Account</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Simulator screen
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">LinkedIn Post Simulator</h1>
          <div className="flex items-center gap-4">
            <Badge variant={user.plan === "free" ? "secondary" : "default"}>{user.plan === "free" ? `${user.name} · Free` : `${user.name} · Pro`}</Badge>
            <Button variant="ghost" size="sm" onClick={logout}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <Textarea placeholder="Write or paste your LinkedIn post here..." value={post} onChange={e => setPost(e.target.value)} className="min-h-[200px] text-base" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{post.length} characters</span>
            <Button onClick={simulate} disabled={simulating || !post.trim()} size="lg">
              {simulating ? "Simulating..." : "Simulate Reactions"}
            </Button>
          </div>
        </div>

        {error && <Card className="border-red-500"><CardContent className="pt-6"><p className="text-red-500">{error}</p></CardContent></Card>}

        {result && (
          <div className="space-y-6 animate-in fade-in">
            {/* Usage */}
            {result.usage && result.usage.plan === "free" && (
              <p className="text-sm text-muted-foreground text-center">{result.usage.remaining} simulations remaining today · <a href="/pricing" className="text-primary underline">Upgrade to Pro</a></p>
            )}

            {/* Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Likes", value: result.metrics.predicted_likes, icon: "👍" },
                { label: "Comments", value: result.metrics.predicted_comments, icon: "💬" },
                { label: "Shares", value: result.metrics.predicted_shares, icon: "🔄" },
                { label: "Engagement", value: `${result.metrics.engagement_rate}%`, icon: "📊" },
              ].map(m => (
                <Card key={m.label}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <div className="text-lg">{m.icon}</div>
                    <div className="text-2xl font-bold">{m.value}</div>
                    <div className="text-xs text-muted-foreground">{m.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Score */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Overall Score</span>
                  <span className={`font-bold text-lg ${scoreColor(result.analysis.overall_score)}`}>{result.analysis.overall_score}/100</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${scoreBg(result.analysis.overall_score)}`} style={{ width: `${result.analysis.overall_score}%` }} />
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">Tone: <Badge variant="outline">{result.analysis.tone}</Badge></span>
                  <span className="text-muted-foreground">Cringe: {"🔥".repeat(result.analysis.cringe_factor)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Reactions */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Simulated Reactions</h2>
              <div className="space-y-3">
                {result.reactions.map((r, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-semibold">{r.persona}</span>
                          <span className="text-sm text-muted-foreground ml-2">{r.role}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={r.sentiment === "positive" ? "default" : r.sentiment === "negative" ? "destructive" : "secondary"} className={sentimentColor(r.sentiment)}>{r.sentiment}</Badge>
                          <Badge variant={r.would_engage ? "default" : "outline"}>{r.would_engage ? "✓ engage" : "✗ skip"}</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{r.reaction}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Analysis */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Analysis</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-green-500">Strengths</CardTitle></CardHeader>
                  <CardContent>{result.analysis.strengths.map((s, i) => <p key={i} className="text-sm mb-1">• {s}</p>)}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-red-500">Weaknesses</CardTitle></CardHeader>
                  <CardContent>{result.analysis.weaknesses.map((w, i) => <p key={i} className="text-sm mb-1">• {w}</p>)}</CardContent>
                </Card>
              </div>
            </div>

            {/* Improved */}
            <Card>
              <CardHeader><CardTitle className="text-base">Suggested Rewrite</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed whitespace-pre-wrap">{result.analysis.improved_version}</p></CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
