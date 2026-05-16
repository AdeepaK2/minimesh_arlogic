export const dashboardStats = [
  { label: "Total Users", value: "24,891", change: "+12.4%", trend: "up" as const },
  { label: "Active Subscribers", value: "3,284", change: "+8.2%", trend: "up" as const },
  { label: "Monthly Revenue", value: "$48.2k", change: "+18.6%", trend: "up" as const },
  { label: "AI Generations Today", value: "12,407", change: "+24.1%", trend: "up" as const },
  { label: "Export Count", value: "8,932", change: "+6.3%", trend: "up" as const },
  { label: "API Requests", value: "1.2M", change: "-2.1%", trend: "down" as const },
];

export const revenueSeries = [32, 38, 35, 42, 48, 45, 52, 58, 54, 62, 68, 72];
export const subscriptionSeries = [1200, 1450, 1680, 1920, 2100, 2480, 2840, 3100, 3284];
export const generationSeries = [420, 580, 720, 890, 1100, 980, 1240, 1380, 1520, 1240, 1180, 1240];

export const users = [
  {
    id: "u1",
    name: "Alex Chen",
    email: "alex@studio.io",
    plan: "Pro",
    usage: "84%",
    lastActive: "2 min ago",
    generations: 342,
    exports: 128,
    status: "active" as const,
    avatar: "AC",
  },
  {
    id: "u2",
    name: "Maya Patel",
    email: "maya@arcade.dev",
    plan: "Studio",
    usage: "62%",
    lastActive: "14 min ago",
    generations: 891,
    exports: 412,
    status: "active" as const,
    avatar: "MP",
  },
  {
    id: "u3",
    name: "Jordan Lee",
    email: "jordan@mail.com",
    plan: "Free",
    usage: "100%",
    lastActive: "1 hr ago",
    generations: 5,
    exports: 2,
    status: "active" as const,
    avatar: "JL",
  },
  {
    id: "u4",
    name: "Sam Rivera",
    email: "sam@nova.design",
    plan: "Pro",
    usage: "41%",
    lastActive: "3 hr ago",
    generations: 156,
    exports: 89,
    status: "active" as const,
    avatar: "SR",
  },
  {
    id: "u5",
    name: "Taylor Kim",
    email: "taylor@forge.co",
    plan: "Pro",
    usage: "91%",
    lastActive: "Yesterday",
    generations: 278,
    exports: 201,
    status: "suspended" as const,
    avatar: "TK",
  },
  {
    id: "u6",
    name: "Riley Morgan",
    email: "riley@lumen.studio",
    plan: "Studio",
    usage: "55%",
    lastActive: "2 days ago",
    generations: 1204,
    exports: 567,
    status: "active" as const,
    avatar: "RM",
  },
];

export const plans = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    yearly: 0,
    subscribers: 18420,
    revenue: 0,
    enabled: true,
    limits: { models: 5, exports: 10, api: 100 },
    features: ["GLB export", "Community support", "Watermarked preview"],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 19,
    yearly: 190,
    subscribers: 2840,
    revenue: 53960,
    enabled: true,
    limits: { models: 100, exports: 500, api: 10000 },
    features: ["All formats", "Embed snippets", "Priority queue", "No watermark"],
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 49,
    yearly: 490,
    subscribers: 631,
    revenue: 30919,
    enabled: true,
    limits: { models: 500, exports: 2000, api: 100000 },
    features: ["SSO", "Team seats", "API access", "Dedicated support"],
  },
];

export const generations = [
  { id: "g1", prompt: "Low-poly crystal fox, game-ready", user: "alex@studio.io", status: "completed" as const, time: "1.2s", gpu: "42%" },
  { id: "g2", prompt: "Modern desk lamp, PBR materials", user: "maya@arcade.dev", status: "processing" as const, time: "—", gpu: "78%" },
  { id: "g3", prompt: "Sci-fi drone with glowing edges", user: "sam@nova.design", status: "failed" as const, time: "—", gpu: "12%" },
  { id: "g4", prompt: "Medieval sword, stylized", user: "riley@lumen.studio", status: "moderation" as const, time: "—", gpu: "0%" },
  { id: "g5", prompt: "Minimalist chair, Scandinavian", user: "jordan@mail.com", status: "completed" as const, time: "0.9s", gpu: "35%" },
];

export const exportStats = [
  { format: "GLB", count: 4821, pct: 54 },
  { format: "FBX", count: 2104, pct: 24 },
  { format: "OBJ", count: 1203, pct: 13 },
  { format: "Web Embed", count: 804, pct: 9 },
];

export const categoryBreakdown = [
  { label: "Characters", value: 32 },
  { label: "Props", value: 24 },
  { label: "Architecture", value: 18 },
  { label: "Vehicles", value: 14 },
  { label: "Other", value: 12 },
];

export const activityFeed = [
  { time: "Just now", event: "Pro upgrade", detail: "maya@arcade.dev → Studio" },
  { time: "2m ago", event: "Generation completed", detail: "alex@studio.io — crystal fox" },
  { time: "5m ago", event: "GLB export", detail: "riley@lumen.studio — 2.4 MB" },
  { time: "8m ago", event: "API spike", detail: "12.4k requests / 5 min" },
  { time: "12m ago", event: "Failed generation", detail: "sam@nova.design — timeout" },
  { time: "18m ago", event: "New signup", detail: "casey@pixel.games — Free" },
];

export const apiUsageSeries = [820, 940, 880, 1100, 1240, 1180, 1320, 1450, 1380, 1520, 1480, 1620];
