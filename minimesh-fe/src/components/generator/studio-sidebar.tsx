"use client";

import { useState, type ReactNode } from "react";

export type StudioSidebarView = "agent" | "library" | "versions" | "entities";

interface StudioSidebarProps {
  userEmail?: string;
  onSignOut: () => void;
  agent: ReactNode;
  library: ReactNode;
  versions: ReactNode;
  entities: ReactNode;
  activeView?: StudioSidebarView;
  defaultView?: StudioSidebarView;
  onViewChange?: (view: StudioSidebarView) => void;
}

const views: {
  id: StudioSidebarView;
  label: string;
  title: string;
}[] = [
  { id: "agent", label: "Agent", title: "Agent" },
  { id: "library", label: "Scenes", title: "Saved scenes" },
  { id: "versions", label: "Versions", title: "Version history" },
  { id: "entities", label: "Entities", title: "Scene entities" },
];

export function StudioSidebar({
  userEmail,
  onSignOut,
  agent,
  library,
  versions,
  entities,
  activeView,
  defaultView = "agent",
  onViewChange,
}: StudioSidebarProps) {
  const [internalActiveView, setInternalActiveView] =
    useState<StudioSidebarView>(defaultView);
  const currentActiveView = activeView ?? internalActiveView;

  const activeMeta =
    views.find((view) => view.id === currentActiveView) ?? views[0];

  const panelContent: Record<StudioSidebarView, ReactNode> = {
    agent,
    library,
    versions,
    entities,
  };

  function handleViewChange(view: StudioSidebarView) {
    setInternalActiveView(view);
    onViewChange?.(view);
  }

  return (
    <aside className="flex h-full w-[min(100%,420px)] min-w-[300px] max-w-[560px] resize-x overflow-hidden border-r border-ui bg-panel max-lg:h-80 max-lg:w-full max-lg:max-w-none max-lg:resize-none max-lg:flex-col max-lg:border-b max-lg:border-r-0">
      <nav
        aria-label="Studio panels"
        className="flex w-11 shrink-0 flex-col border-r border-ui bg-field max-lg:h-11 max-lg:w-full max-lg:flex-row max-lg:border-b max-lg:border-r-0"
      >
        <div className="flex flex-1 flex-col items-center gap-1 py-2 max-lg:flex-row max-lg:justify-center max-lg:px-2 max-lg:py-0">
          {views.map((view) => (
            <ActivityButton
              key={view.id}
              active={currentActiveView === view.id}
              label={view.label}
              onClick={() => handleViewChange(view.id)}
            >
              <SidebarIcon view={view.id} />
            </ActivityButton>
          ))}
        </div>

        <div className="flex flex-col items-center gap-1 border-t border-ui py-2 max-lg:ml-auto max-lg:flex-row max-lg:border-l max-lg:border-t-0 max-lg:px-2 max-lg:py-0">
          {userEmail ? (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-md text-[11px] font-semibold text-secondary transition hover:bg-panel hover:text-primary"
              title={`${userEmail} — sign out`}
              type="button"
              onClick={onSignOut}
            >
              {userEmail.charAt(0).toUpperCase()}
            </button>
          ) : (
            <ActivityButton label="Sign out" onClick={onSignOut}>
              <SignOutIcon />
            </ActivityButton>
          )}
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <PanelTitleBar title={activeMeta.title} />
        <div className="min-h-0 flex-1 overflow-hidden">
          {panelContent[currentActiveView]}
        </div>
      </div>
    </aside>
  );
}

function PanelTitleBar({ title }: { title: string }) {
  return (
    <div className="flex h-10 shrink-0 items-center border-b border-ui px-4">
      <h2 className="truncate text-sm font-semibold text-primary">{title}</h2>
    </div>
  );
}

function ActivityButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      aria-label={label}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md transition ${
        active
          ? "bg-panel text-accent shadow-sm ring-1 ring-ui"
          : "text-muted hover:bg-panel/70 hover:text-primary"
      }`}
      title={label}
      type="button"
      onClick={onClick}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-accent"
        />
      ) : null}
      {children}
    </button>
  );
}

function SidebarIcon({ view }: { view: StudioSidebarView }) {
  switch (view) {
    case "library":
      return <FilesIcon />;
    case "versions":
      return <HistoryIcon />;
    case "entities":
      return <LayersIcon />;
    default:
      return <ChatIcon />;
  }
}

function ChatIcon() {
  return (
    <svg aria-hidden className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path
        d="M21 15a4 4 0 01-4 4H8l-5 3V7a4 4 0 014-4h10a4 4 0 014 4v8z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FilesIcon() {
  return (
    <svg aria-hidden className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path
        d="M8 6h12v12a2 2 0 01-2 2H6V6h2zm0 0V4a2 2 0 012-2h6l4 4v2"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg aria-hidden className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 8v4l3 2M21 12a9 9 0 11-2.64-6.36"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg aria-hidden className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5L12 12m0 0l8-4.5M12 12v9"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path
        d="M15 12H3m0 0l4-4m-4 4l4 4M9 5h6a2 2 0 012 2v10a2 2 0 01-2 2H9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

