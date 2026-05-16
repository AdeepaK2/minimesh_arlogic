"use client";

import { useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="minimesh-admin admin-mesh-bg relative flex min-h-dvh">
      <div className="hero-glow pointer-events-none fixed inset-0 z-0" aria-hidden />

      <div className="relative z-10 flex min-h-dvh w-full">
        <div className="hidden lg:block">
          <AdminSidebar />
        </div>

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

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar onMenuToggle={() => setSidebarOpen((v) => !v)} />
          <main className="flex-1 overflow-auto p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
