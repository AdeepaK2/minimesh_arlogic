"use client";

import { PageHeader } from "@/components/admin/ui/glass-card";
import { GlassCard } from "@/components/admin/ui/glass-card";

const sections = [
  {
    title: "API keys",
    description: "Manage platform and service API keys.",
    fields: [{ label: "Production key", value: "mm_live_••••••••••••4f2a", type: "password" }],
  },
  {
    title: "AI model settings",
    description: "Default model version, quality presets, and timeouts.",
    fields: [
      { label: "Model version", value: "minimesh-v2.1", type: "text" },
      { label: "Max poly count", value: "50000", type: "text" },
    ],
  },
  {
    title: "GPU scaling",
    description: "Auto-scale inference cluster based on queue depth.",
    fields: [{ label: "Max GPU nodes", value: "12", type: "text" }],
  },
  {
    title: "Payment gateway",
    description: "Stripe configuration and webhook endpoints.",
    fields: [{ label: "Webhook URL", value: "https://api.minimesh.ai/webhooks/stripe", type: "text" }],
  },
  {
    title: "Email templates",
    description: "Transactional email IDs and sender settings.",
    fields: [{ label: "From address", value: "hello@minimesh.ai", type: "email" }],
  },
  {
    title: "Security",
    description: "2FA enforcement, session TTL, and IP allowlists.",
    fields: [{ label: "Session TTL (hours)", value: "24", type: "text" }],
  },
];

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        description="Platform configuration, integrations, and security controls."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {sections.map((section) => (
          <GlassCard key={section.title} className="p-6">
            <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{section.description}</p>
            <div className="mt-6 space-y-4">
              {section.fields.map((field) => (
                <label key={field.label} className="block">
                  <span className="text-xs font-medium text-zinc-500">{field.label}</span>
                  <input
                    type={field.type}
                    defaultValue={field.value}
                    className="mt-1.5 h-10 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white focus:border-cyan-500/40 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              className="admin-btn-primary mt-6 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              Save changes
            </button>
          </GlassCard>
        ))}
      </div>
    </>
  );
}
