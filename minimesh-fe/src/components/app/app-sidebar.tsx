"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface AppSidebarProps {
  userEmail?: string;
  onSignOut: () => void;
}

export function AppSidebar({ userEmail, onSignOut }: AppSidebarProps) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-ui bg-panel max-md:w-full max-md:border-b max-md:border-r-0">
      <div className="border-b border-ui px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          MiniMesh
        </p>
        <h1 className="mt-2 text-xl font-semibold text-primary">Dashboard</h1>
      </div>

      <nav className="flex-1 px-3 py-4">
        <Link
          className="block border border-accent bg-accent-soft px-3 py-2 text-sm font-semibold text-primary"
          href="/dashboard"
        >
          Projects
        </Link>
      </nav>

      <div className="grid gap-3 border-t border-ui p-4">
        <ThemeToggle />
        {userEmail ? (
          <p className="truncate text-xs text-secondary">{userEmail}</p>
        ) : null}
        <button
          className="border border-ui bg-field px-3 py-2 text-sm font-semibold text-primary transition hover:border-accent"
          type="button"
          onClick={onSignOut}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
