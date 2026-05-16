import { StatCard } from "@/components/admin/ui/stat-card";
import { GlassCard, PageHeader } from "@/components/admin/ui/glass-card";
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
    color: ["#0891b2", "#0e7490", "#14b8a6", "#0284c7"][i] ?? "#64748b",
  }));

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Platform health, growth, and AI generation activity at a glance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {dashboardStats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <GlassCard className="col-span-2 p-6" glow>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-landing-heading">Revenue</h2>
              <p className="mt-1 text-xs text-landing-subtle">Last 12 months</p>
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
          <h2 className="text-sm font-semibold text-landing-heading">Export formats</h2>
          <p className="mt-1 text-xs text-landing-subtle">Distribution this month</p>
          <div className="mt-6 flex items-center gap-6">
            <GlowDonutChart segments={donutSegments} />
            <ul className="space-y-2 text-sm">
              {exportStats.map((e) => (
                <li key={e.format} className="flex justify-between gap-4 text-landing-muted">
                  <span>{e.format}</span>
                  <span className="font-mono text-landing-heading">{e.pct}%</span>
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-landing-heading">AI generations</h2>
          <p className="mt-1 text-xs text-landing-subtle">Daily volume (7d)</p>
          <div className="mt-6 h-32">
            <GlowLineChart data={generationSeries} gradientId="gen" height={128} />
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-landing-heading">Top categories</h2>
          <p className="mt-1 text-xs text-landing-subtle">Generated model types</p>
          <ul className="mt-6 space-y-4">
            {categoryBreakdown.map((c) => (
              <li key={c.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-landing-muted">{c.label}</span>
                  <span className="text-landing-heading">{c.value}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-landing-hover">
                  <div
                    className="admin-accent-bar h-full rounded-full"
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
          <h2 className="text-sm font-semibold text-landing-heading">Live activity</h2>
          <span className="flex items-center gap-2 text-xs text-[var(--landing-accent)]">
            <span className="admin-pulse h-1.5 w-1.5 rounded-full bg-cyan-400" />
            Real-time
          </span>
        </div>
        <ul className="mt-4 divide-y divide-white/5">
          {activityFeed.map((a, i) => (
            <li key={i} className="flex gap-4 py-3 text-sm">
              <span className="w-16 shrink-0 font-mono text-xs text-landing-subtle">{a.time}</span>
              <span className="font-medium text-cyan-300/90">{a.event}</span>
              <span className="truncate text-landing-subtle">{a.detail}</span>
            </li>
          ))}
        </ul>
      </GlassCard>
    </>
  );
}
