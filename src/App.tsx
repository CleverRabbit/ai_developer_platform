import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  LayoutDashboard, 
  Plus, 
  Settings, 
  MessageSquare, 
  LogOut, 
  Play, 
  Square, 
  Trash2, 
  ExternalLink,
  Bot,
  Code,
  Terminal,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

// Types
interface Project {
  id: number;
  name: string;
  status: string;
  port: number;
  created_at: string;
}

interface User {
  id: number;
  username: string;
  role: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [tgToken, setTgToken] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a Senior Python Developer. Generate clean, optimized Flask code.");

  // AI State
  const [prompt, setPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) setUser(JSON.parse(savedUser));
    
    fetchSettings();
    if (savedUser) fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      toast.error("Failed to fetch projects");
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.gemini_key) setGeminiKey(data.gemini_key);
      if (data.tg_token) setTgToken(data.tg_token);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);
    } catch (e) {
      console.error("Failed to fetch settings");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (authMode === "login") {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
          localStorage.setItem("token", data.token);
          fetchProjects();
          toast.success("Logged in successfully");
        } else {
          setAuthMode("login");
          toast.success("Registered successfully. Please login.");
        }
      } else {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error("Auth failed");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    toast.info("Logged out");
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      toast.success(`${key} saved`);
    } catch (e) {
      toast.error(`Failed to save ${key}`);
    }
  };

  const handleProjectAction = async (id: number, action: "start" | "stop" | "delete") => {
    try {
      const method = action === "delete" ? "DELETE" : "POST";
      const endpoint = action === "delete" ? `/api/projects/${id}` : `/api/projects/${id}/${action}`;
      const res = await fetch(endpoint, { method });
      if (res.ok) {
        toast.success(`Project ${action}ed`);
        fetchProjects();
      } else {
        const data = await res.json();
        toast.error(data.error);
      }
    } catch (e) {
      toast.error(`Action ${action} failed`);
    }
  };

  const generateAndDeploy = async () => {
    if (!geminiKey) return toast.error("Please set Gemini API Key in settings");
    if (!prompt) return toast.error("Please enter an idea");

    setGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction: systemPrompt }
      });

      const code = response.text;
      setAiResponse(code);

      // Deploy
      const projectName = prompt.split(" ").slice(0, 3).join("_") + "_" + Date.now().toString().slice(-4);
      const deployRes = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName, code }),
      });
      
      if (deployRes.ok) {
        toast.success("Project generated and deployed!");
        fetchProjects();
        setActiveTab("dashboard");
      } else {
        const data = await deployRes.json();
        toast.error(data.error);
      }
    } catch (e: any) {
      toast.error("Generation failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-zinc-800 rounded-2xl">
                  <Bot className="w-8 h-8 text-zinc-100" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">AI Developer</CardTitle>
              <CardDescription className="text-zinc-400">
                {authMode === "login" ? "Enter your credentials to access your workspace" : "Create an account to start building"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    className="bg-zinc-800 border-zinc-700 focus:ring-zinc-600"
                    placeholder="admin" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    className="bg-zinc-800 border-zinc-700 focus:ring-zinc-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
                  {authMode === "login" ? "Sign In" : "Sign Up"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <button 
                  onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                  className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                >
                  {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <Toaster theme="dark" position="top-right" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex">
      {/* Sidebar */}
      <div className="w-64 border-r border-zinc-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-zinc-800 rounded-lg">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-bold tracking-tight">AI Developer</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "dashboard" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </button>
          <button 
            onClick={() => setActiveTab("ai")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "ai" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"}`}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Project</span>
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === "settings" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900"}`}
          >
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.username}</p>
              <p className="text-xs text-zinc-500 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-8 max-w-6xl mx-auto"
            >
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
                  <p className="text-zinc-400">Manage your AI-generated microservices</p>
                </div>
                <Button onClick={() => setActiveTab("ai")} className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200 gap-2">
                  <Plus className="w-4 h-4" />
                  New Project
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                  <Card key={project.id} className="bg-zinc-900 border-zinc-800 text-zinc-100 group">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="p-2 bg-zinc-800 rounded-lg">
                          <Terminal className="w-5 h-5 text-zinc-400" />
                        </div>
                        <Badge variant={project.status === "running" ? "default" : "secondary"} className={project.status === "running" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"}>
                          {project.status}
                        </Badge>
                      </div>
                      <CardTitle className="mt-4">{project.name}</CardTitle>
                      <CardDescription className="text-zinc-500">Port: {project.port}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex gap-2 mt-4">
                        {project.status === "running" ? (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handleProjectAction(project.id, "stop")}
                          >
                            <Square className="w-4 h-4 mr-2" />
                            Stop
                          </Button>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="secondary" 
                            className="flex-1 bg-zinc-800 hover:bg-zinc-700"
                            onClick={() => handleProjectAction(project.id, "start")}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20"
                          onClick={() => handleProjectAction(project.id, "delete")}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {projects.length === 0 && (
                  <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                    <div className="p-4 bg-zinc-900 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Code className="w-8 h-8 text-zinc-700" />
                    </div>
                    <h3 className="text-lg font-medium text-zinc-300">No projects yet</h3>
                    <p className="text-zinc-500 mt-1">Generate your first project using AI</p>
                    <Button onClick={() => setActiveTab("ai")} variant="link" className="mt-4 text-zinc-100">
                      Get started
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-8 max-w-4xl mx-auto"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">New Project</h1>
                <p className="text-zinc-400">Describe your idea and let the AI build it</p>
              </div>

              <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label>What do you want to build?</Label>
                    <textarea 
                      className="w-full h-32 bg-zinc-800 border-zinc-700 rounded-xl p-4 focus:ring-2 focus:ring-zinc-600 outline-none transition-all resize-none"
                      placeholder="e.g. A simple Flask API that returns the current weather in London"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-4">
                    <Button 
                      onClick={generateAndDeploy} 
                      disabled={generating}
                      className="flex-1 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 h-12 text-lg font-semibold"
                    >
                      {generating ? (
                        <div className="flex items-center gap-2">
                          <motion.div 
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                          >
                            <Bot className="w-5 h-5" />
                          </motion.div>
                          Generating...
                        </div>
                      ) : (
                        "Generate & Deploy"
                      )}
                    </Button>
                  </div>

                  {aiResponse && (
                    <div className="mt-8 space-y-2">
                      <Label>Generated Code</Label>
                      <ScrollArea className="h-64 rounded-xl border border-zinc-800 bg-black p-4">
                        <pre className="text-xs font-mono text-zinc-400">
                          {aiResponse}
                        </pre>
                      </ScrollArea>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
                <p className="text-zinc-400">Configure your AI and system integrations</p>
              </div>

              <div className="space-y-6">
                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-zinc-400" />
                      API Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Gemini API Key</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="password"
                          className="bg-zinc-800 border-zinc-700"
                          value={geminiKey}
                          onChange={(e) => setGeminiKey(e.target.value)}
                          placeholder="Enter your Gemini API key"
                        />
                        <Button variant="secondary" onClick={() => saveSetting("gemini_key", geminiKey)}>Save</Button>
                      </div>
                      <p className="text-xs text-zinc-500">Used for code generation and project analysis</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Telegram Bot Token</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="password"
                          className="bg-zinc-800 border-zinc-700"
                          value={tgToken}
                          onChange={(e) => setTgToken(e.target.value)}
                          placeholder="Enter your BotFather token"
                        />
                        <Button variant="secondary" onClick={() => saveSetting("tg_token", tgToken)}>Save</Button>
                      </div>
                      <p className="text-xs text-zinc-500">Enable remote management via Telegram</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="w-5 h-5 text-zinc-400" />
                      AI Behavior
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>System Instruction</Label>
                      <textarea 
                        className="w-full h-32 bg-zinc-800 border-zinc-700 rounded-xl p-4 focus:ring-2 focus:ring-zinc-600 outline-none transition-all resize-none"
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                      />
                      <Button className="w-full mt-2" variant="secondary" onClick={() => saveSetting("system_prompt", systemPrompt)}>
                        Update Instruction
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Toaster theme="dark" position="top-right" />
    </div>
  );
}
