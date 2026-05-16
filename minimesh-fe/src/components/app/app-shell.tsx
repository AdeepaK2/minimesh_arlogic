"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { AppSidebar } from "./app-sidebar";
import { ProjectsDashboard } from "../projects/projects-dashboard";

export function AppShell() {
  const router = useRouter();
  const { accessToken, isLoading, signOut, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace("/login");
    }
  }, [accessToken, isLoading, router]);

  if (isLoading) {
    return (
      <main className="grid min-h-dvh place-items-center bg-app text-primary">
        <p className="text-sm text-secondary">Loading MiniMesh</p>
      </main>
    );
  }

  if (!accessToken) {
    return (
      <main className="grid min-h-dvh place-items-center bg-app text-primary">
        <p className="text-sm text-secondary">Redirecting to login</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh bg-app text-primary max-md:flex-col">
      <AppSidebar userEmail={user?.email} onSignOut={() => void signOut()} />
      <ProjectsDashboard accessToken={accessToken} />
    </main>
  );
}
