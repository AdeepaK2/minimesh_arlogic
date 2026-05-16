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
    <GlassCard className="p-5 transition hover:border-cyan-500/30" glow>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
      <p
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${
          up ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        <span aria-hidden>{up ? "↑" : "↓"}</span>
        {change}
        <span className="text-zinc-600">vs last period</span>
      </p>
    </GlassCard>
  );
}
