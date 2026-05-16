import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { generations } from "@/lib/admin/mock-data";

const statusStyles = {
  completed: "bg-emerald-500/10 text-emerald-400",
  processing: "bg-cyan-500/10 text-cyan-400",
  failed: "bg-rose-500/10 text-rose-400",
  moderation: "bg-amber-500/10 text-amber-400",
};

export default function AdminModelsPage() {
  return (
    <>
      <PageHeader
        title="AI model generation"
        description="Monitor prompts, queue status, failures, moderation, and GPU utilization."
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Queue depth", value: "24" },
          { label: "GPU cluster", value: "78%" },
          { label: "Avg. process time", value: "1.1s" },
          { label: "Failed (24h)", value: "18" },
        ].map((s) => (
          <GlassCard key={s.label} className="p-4">
            <p className="text-xs text-zinc-500">{s.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{s.value}</p>
          </GlassCard>
        ))}
      </section>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-5 py-4">Prompt</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">GPU</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {generations.map((g) => (
              <tr key={g.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="max-w-xs truncate px-5 py-4 text-zinc-200">{g.prompt}</td>
                <td className="px-5 py-4 text-zinc-500">{g.user}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[g.status]}`}
                  >
                    {g.status}
                  </span>
                </td>
                <td className="px-5 py-4 font-mono text-zinc-400">{g.time}</td>
                <td className="px-5 py-4 font-mono text-cyan-300/80">{g.gpu}</td>
                <td className="px-5 py-4">
                  <button type="button" className="text-xs text-cyan-400 hover:text-cyan-300">
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      <GlassCard className="mt-6 p-6">
        <h2 className="text-sm font-semibold text-white">Moderation queue</h2>
        <p className="mt-2 text-sm text-zinc-500">1 item pending review</p>
        <button
          type="button"
          className="mt-4 rounded-xl border border-amber-500/30 px-4 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
        >
          Open moderation queue
        </button>
      </GlassCard>
    </>
  );
}
