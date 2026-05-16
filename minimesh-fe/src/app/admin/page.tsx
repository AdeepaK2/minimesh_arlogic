import { StatCard } from "@/components/admin/ui/stat-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { GlowLineChart, GlowDonutChart } from "@/components/admin/ui/charts";
import {
  activityFeed,
  categoryBreakdown,
  dashboardStats,
  exportStats,
  generationSeries,
  revenueSeries,
} from "@/lib/admin/mock-data";

export default function AdminDashboardPage() {
  const donutSegments = exportStats.map((e, i) => ({
    value: e.pct,
    color: ["#22d3ee", "#a78bfa", "#34d399", "#f472b6"][i] ?? "#71717a",
  }));

  return (
    <>
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          Platform health, growth, and AI generation activity at a glance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {dashboardStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlassCard className="col-span-2 p-6" glow>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Revenue</h2>
              <p className="mt-1 text-xs text-zinc-500">Last 12 months</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
              +18.6%
            </span>
          </div>
          <div className="mt-6 h-36">
            <GlowLineChart data={revenueSeries} gradientId="rev" />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Export formats</h2>
          <p className="mt-1 text-xs text-zinc-500">Distribution this month</p>
          <div className="mt-6 flex items-center gap-6">
            <GlowDonutChart segments={donutSegments} />
            <ul className="space-y-2 text-sm">
              {exportStats.map((e) => (
                <li key={e.format} className="flex justify-between gap-4 text-zinc-400">
                  <span>{e.format}</span>
                  <span className="font-mono text-zinc-200">{e.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">AI generations</h2>
          <p className="mt-1 text-xs text-zinc-500">Daily volume (7d)</p>
          <div className="mt-6 h-32">
            <GlowLineChart data={generationSeries} gradientId="gen" height={128} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Top categories</h2>
          <p className="mt-1 text-xs text-zinc-500">Generated model types</p>
          <ul className="mt-6 space-y-4">
            {categoryBreakdown.map((c) => (
              <li key={c.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-zinc-400">{c.label}</span>
                  <span className="text-zinc-200">{c.value}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                    style={{ width: `${c.value}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="mt-6 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Live activity</h2>
          <span className="flex items-center gap-2 text-xs text-cyan-400">
            <span className="admin-pulse h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Real-time
          </span>
        </div>
        <ul className="mt-4 divide-y divide-white/5">
          {activityFeed.map((a, i) => (
            <li key={i} className="flex gap-4 py-3 text-sm">
              <span className="w-16 shrink-0 font-mono text-xs text-zinc-600">{a.time}</span>
              <span className="font-medium text-cyan-300/90">{a.event}</span>
              <span className="truncate text-zinc-500">{a.detail}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  );
}
