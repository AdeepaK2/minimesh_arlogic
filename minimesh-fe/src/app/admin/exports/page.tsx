import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { exportStats } from "@/lib/admin/mock-data";

const popularModels = [
  { name: "Crystal fox", downloads: 1240 },
  { name: "Desk lamp PBR", downloads: 892 },
  { name: "Sci-fi drone", downloads: 756 },
  { name: "Medieval sword", downloads: 621 },
];

export default function AdminExportsPage() {
  return (
    <>
      <PageHeader
        title="Export management"
        description="Track GLB, FBX, OBJ exports, web embeds, and popular downloads."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {exportStats.map((e) => (
          <GlassCard key={e.format} className="p-5" glow>
            <p className="text-xs uppercase tracking-wider text-zinc-500">{e.format}</p>
            <p className="mt-2 text-2xl font-bold text-white">
              {e.count.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-cyan-400">{e.pct}% of total</p>
          </GlassCard>
        ))}
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Web embeds</h2>
          <p className="mt-4 text-3xl font-bold text-white">804</p>
          <p className="text-sm text-zinc-500">Active embeds this month</p>
          <p className="mt-4 text-xs text-emerald-400">+22% vs last month</p>
        </GlassCard>
        <GlassCard className="p-6">
          <h2 className="text-sm font-semibold text-white">Popular models</h2>
          <ul className="mt-4 space-y-3">
            {popularModels.map((m, i) => (
              <li key={m.name} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  <span className="mr-2 font-mono text-zinc-600">#{i + 1}</span>
                  {m.name}
                </span>
                <span className="font-mono text-cyan-300">{m.downloads}</span>
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>
    </>
  );
}
