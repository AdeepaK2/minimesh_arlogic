import type { Metadata } from "next";
import { AdminThemeInitScript } from "@/components/admin/admin-theme-init-script";
import { AdminThemeProvider } from "@/components/admin/admin-theme-provider";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Admin — MiniMesh AI",
  description: "MiniMesh AI internal admin portal",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminThemeInitScript />
      <AdminThemeProvider>
        <AdminShell>{children}</AdminShell>
      </AdminThemeProvider>
    </>
  );
}
