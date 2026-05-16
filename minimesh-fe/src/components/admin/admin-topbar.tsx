"use client";

import { useState } from "react";

export function AdminTopbar({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-6">
        <div className="relative flex-1 max-w-md">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            placeholder="Search users, tickets, models..."
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/15"
          />
        </div>

        <div className="hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 sm:flex">
          <span className="admin-pulse h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-emerald-300">All systems operational</span>
        </div>

        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-400 transition hover:border-cyan-500/30 hover:text-white"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-cyan-400" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-white/10 py-1.5 pl-1.5 pr-3 transition hover:border-cyan-500/30"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-violet-500 text-xs font-bold text-white">
              AD
            </span>
            <span className="hidden text-sm font-medium text-zinc-200 sm:block">
              Admin
            </span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-[#12121a] py-1 shadow-xl">
              <button type="button" className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/5">
                Profile
              </button>
              <button type="button" className="block w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-white/5">
                Security
              </button>
              <button type="button" className="block w-full px-4 py-2 text-left text-sm text-rose-400 hover:bg-white/5">
                Sign out
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 text-zinc-400 lg:hidden"
          aria-label="Toggle sidebar"
          onClick={onMenuToggle}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
