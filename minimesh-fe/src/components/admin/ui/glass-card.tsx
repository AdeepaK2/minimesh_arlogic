import { type ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export function GlassCard({ children, className = "", glow }: GlassCardProps) {
  return (
    <div
      className={`admin-glass minimesh-glass-card rounded-2xl ${
        glow ? "admin-glow-border" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="minimesh-eyebrow">{eyebrow}</p> : null}
        <h1
          className={`font-bold tracking-tight text-landing-heading ${eyebrow ? "mt-2 text-3xl" : "text-2xl sm:text-3xl"}`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm text-landing-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

