import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { GlowLineChart } from "@/components/admin/ui/charts";
import { plans, revenueSeries } from "@/lib/admin/mock-data";

export default function AdminRevenuePage() {
  return (
    <>
      <PageHeader
        title="Revenue"
        description="MRR, plan breakdown, and revenue trends across MiniMesh AI."
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <GlassCard className="p-6" glow>
          <p className="text-xs uppercase tracking-wider text-zinc-500">MRR</p>
          <p className="mt-2 text-3xl font-bold text-white">$84,879</p>
          <p className="mt-1 text-sm text-emerald-400">+18.6% this month</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500">ARR</p>
          <p className="mt-2 text-3xl font-bold text-white">$1.02M</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-wider text-zinc-500">ARPU</p>
          <p className="mt-2 text-3xl font-bold text-white">$25.84</p>
        </GlassCard>
      </section>

      <GlassCard className="mt-8 p-6" glow>
        <h2 className="text-sm font-semibold text-white">Revenue over time</h2>
        <div className="mt-6 h-48">
          <GlowLineChart data={revenueSeries} gradientId="revenue-page" height={192} />
        </div>
      </GlassCard>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className="p-5">
            <h3 className="font-semibold text-white">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold text-cyan-300">
              ${plan.revenue.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500">{plan.subscribers} subscribers</p>
          </GlassCard>
        ))}
      </section>
    </>
  );
}
