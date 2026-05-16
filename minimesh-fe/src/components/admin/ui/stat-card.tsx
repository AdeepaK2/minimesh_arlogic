import { GlassCard } from "./glass-card";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
}

export function StatCard({ label, value, change, trend }: StatCardProps) {
  const up = trend === "up";
  return (
    <GlassCard className="admin-card-hover p-5" glow>
      <p className="minimesh-eyebrow tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-landing-heading">{value}</p>
      <p
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${
          up ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        <span aria-hidden>{up ? "↑" : "↓"}</span>
        {change}
        <span className="text-landing-subtle">vs last period</span>
      </p>
    </GlassCard>
  );
}
