"use client";

import { useState } from "react";
import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";
import { plans } from "@/lib/admin/mock-data";

export default function AdminPricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <>
      <PageHeader
        title="Pricing & subscriptions"
        description="Edit plans, pricing, feature limits, and Stripe integration status."
        action={
          <div className="admin-segment-wrap flex items-center gap-1">
            <button
              type="button"
              onClick={() => setYearly(false)}
              className={`admin-segment-btn ${!yearly ? "admin-segment-active" : ""}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setYearly(true)}
              className={`admin-segment-btn ${yearly ? "admin-segment-active" : ""}`}
            >
              Yearly
            </button>
          </div>
        }
      />

      <GlassCard className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <span className="admin-pulse h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-sm text-zinc-300">Stripe connected</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
            Live mode
          </span>
        </div>
        <p className="text-sm text-zinc-500">
          Total MRR: <span className="font-semibold text-white">$84,879</span>
        </p>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <GlassCard
            key={plan.id}
            className={`flex flex-col p-6 ${plan.id === "pro" ? "admin-glow-border" : ""}`}
            glow={plan.id === "pro"}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  defaultChecked={plan.enabled}
                  className="peer sr-only"
                />
                <span className="admin-toggle-track h-6 w-11 rounded-full bg-zinc-700/80 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
              </label>
            </div>
            <p className="mt-4 text-3xl font-bold text-white">
              ${yearly ? plan.yearly : plan.monthly}
              <span className="text-sm font-normal text-zinc-500">
                /{yearly ? "yr" : "mo"}
              </span>
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {plan.subscribers.toLocaleString()} subscribers · $
              {plan.revenue.toLocaleString()} revenue
            </p>

            <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Limits
              </p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="admin-gradient-text font-semibold">{plan.limits.models}</p>
                  <p className="text-zinc-600">models</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="admin-gradient-text font-semibold">{plan.limits.exports}</p>
                  <p className="text-zinc-600">exports</p>
                </div>
                <div className="rounded-lg bg-white/5 p-2">
                  <p className="admin-gradient-text font-semibold">{plan.limits.api}</p>
                  <p className="text-zinc-600">API</p>
                </div>
              </div>
            </div>

            <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-400">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="admin-gradient-text">✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              type="button"
              className="admin-btn-outline mt-6 w-full rounded-xl py-2.5 text-sm font-medium"
            >
              Edit plan
            </button>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
