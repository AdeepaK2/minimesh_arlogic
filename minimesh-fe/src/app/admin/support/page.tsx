import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";

const tickets = [
  { id: "#1042", subject: "Export failing for GLB", user: "alex@studio.io", priority: "high", status: "open" },
  { id: "#1041", subject: "Billing question — Studio plan", user: "maya@arcade.dev", priority: "medium", status: "open" },
  { id: "#1040", subject: "API rate limit increase", user: "riley@lumen.studio", priority: "low", status: "resolved" },
  { id: "#1039", subject: "Account suspension appeal", user: "taylor@forge.co", priority: "high", status: "pending" },
];

export default function AdminSupportPage() {
  return (
    <>
      <PageHeader
        title="Support tickets"
        description="Customer support queue and ticket resolution."
        action={
          <span className="rounded-full bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-400">
            3 open
          </span>
        }
      />

      <GlassCard className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-zinc-500">
              <th className="px-5 py-4">ID</th>
              <th className="px-5 py-4">Subject</th>
              <th className="px-5 py-4">User</th>
              <th className="px-5 py-4">Priority</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {tickets.map((t) => (
              <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                <td className="px-5 py-4 font-mono text-cyan-400">{t.id}</td>
                <td className="px-5 py-4 text-white">{t.subject}</td>
                <td className="px-5 py-4 text-zinc-500">{t.user}</td>
                <td className="px-5 py-4 capitalize text-zinc-400">{t.priority}</td>
                <td className="px-5 py-4">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      t.status === "resolved"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : t.status === "open"
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "bg-amber-500/10 text-amber-400"
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <button type="button" className="text-xs text-cyan-400">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </>
  );
}
