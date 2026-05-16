"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchBillingPlansCatalog,
  fetchBillingUsage,
  setBillingPlan,
  type BillingPlanId,
  type BillingPlansCatalogResponse,
  type BillingUsageResponse,
} from "@/lib/api/billing";

const fmt = new Intl.NumberFormat(undefined, { notation: "compact" });

interface DashboardPlansBannerProps {
  accessToken: string;
}

export function DashboardPlansBanner({
  accessToken,
}: DashboardPlansBannerProps) {
  const [catalog, setCatalog] = useState<BillingPlansCatalogResponse | null>(
    null,
  );
  const [usage, setUsage] = useState<BillingUsageResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<BillingPlanId | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [planCatalog, snapshot] = await Promise.all([
        fetchBillingPlansCatalog(),
        fetchBillingUsage(accessToken),
      ]);
      setCatalog(planCatalog);
      setUsage(snapshot);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Plans failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(handle);
  }, [load]);

  const pct = useMemo(() => {
    const limit =
      usage?.assignedTier.monthlyTokenLimit ??
      catalog?.basis.freeMonthlyTokens ??
      1;
    const raw = usage ? usage.monthlyGenerationTokensUsed / limit : 0;
    return Math.min(100, Math.round(raw * 1000) / 10);
  }, [catalog, usage]);

  async function selectPlan(plan: BillingPlanId) {
    setUpdating(plan);
    setError(null);

    try {
      setUsage(await setBillingPlan(accessToken, plan));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update plan.",
      );
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <aside className="border-b border-ui bg-field px-6 py-6">
        <p className="text-sm text-muted">Loading plans...</p>
      </aside>
    );
  }

  if (!catalog || !usage) {
    return null;
  }

  return (
    <aside className="border-b border-ui bg-field px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[220px] max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
            Usage & billing
          </p>
          <h2 className="mt-1 text-lg font-semibold text-primary">
            {usage.assignedTier.label} · {fmt.format(usage.monthlyGenerationTokensUsed)} /{" "}
            {fmt.format(usage.assignedTier.monthlyTokenLimit)} tokens this UTC month
          </h2>
          <p className="mt-1 text-xs text-muted">
            Resets {new Date(usage.periodEndsAtUtc).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-ui">
            <div
              className="h-2 rounded-full bg-accent transition-[width]"
              style={{
                width: `${pct}%`,
              }}
              aria-valuenow={pct}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-secondary">
            Starter and Pro limits multiply the server&apos;s&nbsp;
            <code className="text-[10px] text-primary">PLAN_PAID_MONTHLY_TOKEN_USD</code> factor
            (default {(catalog.basis.paidTokensPerUsd / 1000).toFixed(0)}k tokens per $1 billed).
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {catalog.tiers.map((tier) => (
          <article
            key={tier.id}
            className={
              tier.id === usage.assignedPlanId
                ? "border-2 border-accent bg-panel px-5 py-5 shadow-sm"
                : "border border-ui bg-panel px-5 py-5 transition hover:border-accent"
            }
          >
            <p className="text-xs uppercase tracking-[0.14em] text-muted">{tier.label}</p>
            <p className="mt-3 text-2xl font-semibold text-primary">
              {tier.priceUsd === 0 ? "Free" : `$${tier.priceUsd}`}
              <span className="ml-2 text-xs font-normal text-muted">/month</span>
            </p>
            <p className="mt-4 text-sm leading-6 text-secondary">
              Approximately{" "}
              <strong className="font-semibold text-primary">
                {fmt.format(tier.monthlyTokenLimit)}
              </strong>{" "}
              generation tokens (input + output) after each scene run.
            </p>
            <button
              type="button"
              className={`mt-5 w-full border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                tier.id === usage.assignedPlanId
                  ? "border-ui bg-muted/30 text-primary"
                  : "border-accent bg-accent text-accent-contrast hover:bg-accent-strong"
              }`}
              disabled={tier.id === usage.assignedPlanId || updating !== null}
              onClick={() => void selectPlan(tier.id)}
            >
              {tier.id === usage.assignedPlanId
                ? "Current plan"
                : updating === tier.id
                  ? "Updating…"
                  : tier.priceUsd === 0
                    ? "Use free tier"
                    : "Activate"}
            </button>
            {tier.priceUsd > 0 ? (
              <p className="mt-2 text-[11px] leading-4 text-muted">
                Payments are stubbed — this toggles allowances for demos; replace with Stripe
                Checkout when you&apos;re ready.
              </p>
            ) : null}
          </article>
        ))}
      </div>
    </aside>
  );
}
