import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { GlowLineChart, MiniBarChart } from "@/components/admin/ui/charts";
import { apiUsageSeries } from "@/lib/admin/mock-data";

export default function AdminApiUsagePage() {
  return (
    <>
      <PageHeader
        title="API usage"
        description="Request volume, rate limits, errors, and top API consumers."
      />

      <section className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Requests today", value: "1.2M" },
          { label: "Error rate", value: "0.12%" },
          { label: "P99 latency", value: "142ms" },
          { label: "Rate limit hits", value: "38" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
          </GlassCard>
        ))}
      </section>

      <GlassCard className="mt-8 p-6" glow>
        <h2 className="text-sm font-semibold text-white">Request volume (12 mo)</h2>
        <div className="mt-6 h-40">
          <GlowLineChart data={apiUsageSeries} gradientId="api-usage" />
        </div>
      </GlassCard>

      <GlassCard className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">Hourly distribution</h2>
        <div className="mt-6">
          <MiniBarChart data={apiUsageSeries} />
        </div>
      </GlassCard>
    </>
  );
}
