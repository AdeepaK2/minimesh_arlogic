import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { GlowLineChart, GlowDonutChart, MiniBarChart } from "@/components/admin/ui/charts";
import {
  apiUsageSeries,
  categoryBreakdown,
  exportStats,
  revenueSeries,
  subscriptionSeries,
} from "@/lib/admin/mock-data";

export default function AdminAnalyticsPage() {
  const donutSegments = exportStats.map((e, i) => ({
    value: e.pct,
    color: ["#22d3ee", "#a78bfa", "#34d399", "#f472b6"][i] ?? "#71717a",
  }));

  return (
    <>
      <PageHeader
        title="Statistics & analytics"
        description="Revenue, retention, API usage, exports, and real-time platform insights."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Retention (30d)", value: "68%", sub: "+4.2%" },
          { label: "Churn rate", value: "2.1%", sub: "-0.3%" },
          { label: "Avg. gen / user", value: "4.8", sub: "+12%" },
          { label: "Embed adoption", value: "34%", sub: "+8%" },
        ].map((m) => (
          <GlassCard key={m.label} className="p-5">
            <p className="text-xs uppercase tracking-wider text-zinc-500">{m.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{m.value}</p>
            <p className="mt-1 text-xs text-emerald-400">{m.sub}</p>
          </GlassCard>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6" glow>
          <h2 className="text-sm font-semibold text-white">Revenue growth</h2>
          <div className="mt-6 h-40">
            <GlowLineChart data={revenueSeries} gradientId="analytics-rev" />
          </div>
        </GlassCard>
        <GlassCard className="p-6" glow>
          <h2 className="text-sm font-semibold text-white">Subscription growth</h2>
          <div className="mt-6 h-40">
            <GlowLineChart data={subscriptionSeries} gradientId="analytics-sub" />
          </div>
        </GlassCard>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">API usage</h2>
          <div className="mt-6">
            <MiniBarChart data={apiUsageSeries.slice(-12)} />
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Export breakdown</h2>
          <div className="mt-6 flex items-center gap-4">
            <GlowDonutChart segments={donutSegments} size={100} />
            <ul className="space-y-1 text-xs text-zinc-400">
              {exportStats.map((e) => (
                <li key={e.format}>
                  {e.format}: {e.count.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Model categories</h2>
          <ul className="mt-6 space-y-3">
            {categoryBreakdown.map((c) => (
              <li key={c.label} className="text-sm">
                <span className="text-zinc-400">{c.label}</span>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                    style={{ width: `${c.value * 3}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      <GlassCard className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">AI activity heatmap</h2>
        <p className="mt-1 text-xs text-zinc-500">Generation intensity by hour (UTC)</p>
        <div className="mt-6 grid grid-cols-12 gap-1">
          {Array.from({ length: 84 }, (_, i) => {
            const intensity = (i * 7 + 13) % 100;
            return (
              <div
                key={i}
                className="aspect-square rounded-sm"
                style={{
                  backgroundColor: `rgba(34, 211, 238, ${intensity / 120})`,
                }}
                title={`${intensity}%`}
              />
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">Geographic distribution</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Top regions: US (42%), EU (28%), APAC (18%), Other (12%) — map integration coming soon.
        </p>
        <div className="mt-6 flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] text-sm text-zinc-600">
          World map visualization
        </div>
      </GlassCard>
    </>
  );
}
