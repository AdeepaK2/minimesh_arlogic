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
          <p className="text-xs uppercase tracking-wider text-landing-muted">MRR</p>
          <p className="mt-2 text-3xl font-bold text-landing-heading">$84,879</p>
          <p className="mt-1 text-sm text-emerald-400">+18.6% this month</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-wider text-landing-muted">ARR</p>
          <p className="mt-2 text-3xl font-bold text-landing-heading">$1.02M</p>
        </GlassCard>
        <GlassCard className="p-6">
          <p className="text-xs uppercase tracking-wider text-landing-muted">ARPU</p>
          <p className="mt-2 text-3xl font-bold text-landing-heading">$25.84</p>
        </GlassCard>
      </section>

      <GlassCard className="relative isolate mt-8 overflow-hidden p-6" glow>
        <h2 className="text-sm font-semibold text-landing-heading">Revenue over time</h2>
        <p className="mt-1 text-xs text-landing-muted">Last 12 months</p>
        <div className="relative mt-6 w-full">
          <GlowLineChart
            data={revenueSeries}
            gradientId="revenue-page"
            height={192}
            className="rounded-lg"
          />
        </div>
      </GlassCard>

      <section className="relative z-10 mt-10 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <GlassCard key={plan.id} className="p-5">
            <h3 className="font-semibold text-landing-heading">{plan.name}</h3>
            <p className="mt-2 text-2xl font-bold admin-gradient-text">
              ${plan.revenue.toLocaleString()}
            </p>
            <p className="text-xs text-landing-muted">
              {plan.subscribers.toLocaleString()} subscribers
            </p>
          </GlassCard>
        ))}
      </section>
    </>
  );
}
