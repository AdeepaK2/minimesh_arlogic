"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleCardProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  badge?: string;
  children: ReactNode;
}

export function CollapsibleCard({
  title,
  subtitle,
  defaultOpen = false,
  badge,
  children,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="sb-utility-card overflow-hidden rounded-lg border border-landing bg-landing-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition hover:bg-landing-hover"
        aria-expanded={open}
      >
        <svg
          className={`h-3.5 w-3.5 shrink-0 text-landing-subtle transition ${open ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-landing-heading">{title}</span>
          {subtitle ? (
            <span className="block truncate text-[10px] text-landing-subtle">{subtitle}</span>
          ) : null}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full border border-landing bg-landing-surface px-2 py-0.5 text-[10px] font-medium text-landing-muted">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? <div className="border-t border-landing px-3 py-3">{children}</div> : null}
    </div>
  );
}
