"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="minimesh-admin admin-mesh-bg relative h-dvh overflow-hidden">
      <div className="hero-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      {/* Desktop: fixed sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <AdminSidebar />
      </div>

      {/* Mobile: overlay sidebar */}
      {sidebarOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      ) : null}

      {/* Main column — offset for fixed sidebar on desktop */}
      <div className="relative z-10 flex h-dvh min-w-0 flex-col lg:ml-64">
        <AdminTopbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <main className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
