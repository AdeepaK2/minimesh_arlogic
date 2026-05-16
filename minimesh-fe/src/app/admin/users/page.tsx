"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { users } from "@/lib/admin/mock-data";

export default function AdminUsersPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );
  const detail = users.find((u) => u.id === selected);

  return (
    <>
      <PageHeader
        title="User management"
        description="Search, filter, and manage platform users. View usage, plans, and moderation actions."
        action={
          <button
            type="button"
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            Export CSV
          </button>
        }
      />

      <GlassCard className="mb-6 p-4">
        <div className="flex flex-col gap-4 sm:flex-row">
          <input
            type="search"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none"
          />
          <select className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-300">
            <option>All plans</option>
            <option>Free</option>
            <option>Pro</option>
            <option>Studio</option>
          </select>
          <select className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-300">
            <option>All statuses</option>
            <option>Active</option>
            <option>Suspended</option>
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4 font-medium">User</th>
                  <th className="px-5 py-4 font-medium">Plan</th>
                  <th className="px-5 py-4 font-medium">Usage</th>
                  <th className="px-5 py-4 font-medium">Generations</th>
                  <th className="px-5 py-4 font-medium">Exports</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                      selected === u.id ? "bg-cyan-500/5" : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="flex items-center gap-3 text-left"
                        onClick={() => setSelected(u.id)}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/30 to-violet-500/30 text-xs font-bold text-cyan-200">
                          {u.avatar}
                        </span>
                        <span>
                          <span className="block font-medium text-white">{u.name}</span>
                          <span className="text-xs text-zinc-500">{u.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-zinc-300">
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-zinc-400">{u.usage}</td>
                    <td className="px-5 py-4 font-mono text-zinc-300">{u.generations}</td>
                    <td className="px-5 py-4 font-mono text-zinc-300">{u.exports}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          u.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Suspend
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-white/10 px-5 py-3 text-xs text-zinc-500">
            <span>Showing {filtered.length} of {users.length}</span>
            <div className="flex gap-2">
              <button type="button" className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5">
                Prev
              </button>
              <button type="button" className="rounded-lg border border-white/10 px-3 py-1 hover:bg-white/5">
                Next
              </button>
            </div>
          </div>
        </GlassCard>

        {detail ? (
          <GlassCard className="h-fit p-6" glow>
            <h3 className="text-lg font-semibold text-white">{detail.name}</h3>
            <p className="text-sm text-zinc-500">{detail.email}</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Plan</dt>
                <dd className="text-white">{detail.plan}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Last active</dt>
                <dd className="text-white">{detail.lastActive}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Generations</dt>
                <dd className="font-mono text-cyan-300">{detail.generations}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Exports</dt>
                <dd className="font-mono text-cyan-300">{detail.exports}</dd>
              </div>
            </dl>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-zinc-300 hover:bg-white/5"
              >
                View history
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-rose-500/30 py-2 text-sm text-rose-400 hover:bg-rose-500/10"
              >
                Ban user
              </button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="flex h-48 items-center justify-center p-6 text-sm text-zinc-500">
            Select a user to view details
          </GlassCard>
        )}
      </div>
    </>
  );
}
