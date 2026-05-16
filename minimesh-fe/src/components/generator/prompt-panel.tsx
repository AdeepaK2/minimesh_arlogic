"use client";

import {
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import type { SceneChatMessage } from "@/lib/scene/types";

interface PromptPanelProps {
  embedded?: boolean;
  canExport: boolean;
  canSave: boolean;
  canSaveVersion: boolean;
  chatInput: string;
  error: string | null;
  isBusy: boolean;
  messages: SceneChatMessage[];
  projectName?: string | null;
  sceneName?: string | null;
  selectedEntityName?: string | null;
  selectedEntityPartCount: number;
  userEmail?: string;
  warnings: string[];
  onChatInputChange: (value: string) => void;
  onExport: () => void;
  onSave: () => void;
  onSignOut: () => void;
  onSubmit: () => void;
}

type AgentMode = "generate" | "edit" | "refine";

export function PromptPanel({
  embedded = false,
  canExport,
  canSave,
  canSaveVersion,
  chatInput,
  error,
  isBusy,
  messages,
  projectName,
  sceneName,
  selectedEntityName,
  selectedEntityPartCount,
  userEmail,
  warnings,
  onChatInputChange,
  onExport,
  onSave,
  onSignOut,
  onSubmit,
}: PromptPanelProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mode = getMode(Boolean(sceneName), selectedEntityName);
  const canSend = chatInput.trim().length >= 3 && !isBusy;
  const contextTarget =
    selectedEntityName ?? sceneName ?? "No scene yet";
  const contextMeta = selectedEntityName
    ? `${selectedEntityPartCount} parts selected`
    : sceneName
      ? "Whole scene"
      : "Start with a prompt below";

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isBusy, error, warnings]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) {
      return;
    }

    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
  }, [chatInput]);

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        onSubmit();
      }
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-panel text-primary">
      {!embedded ? (
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-ui px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-primary">Agent</p>
            {userEmail ? (
              <p className="mt-0.5 truncate text-xs text-muted">{userEmail}</p>
            ) : null}
          </div>
          <button
            className="rounded-lg border border-ui px-2.5 py-1.5 text-xs font-medium text-secondary transition hover:border-accent hover:text-primary"
            type="button"
            onClick={onSignOut}
          >
            Sign out
          </button>
        </header>
      ) : null}

      <ContextPills
        contextMeta={contextMeta}
        contextTarget={contextTarget}
        mode={mode}
        projectName={projectName}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isBusy ? (
          <EmptyState mode={mode} />
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isBusy ? <WorkingIndicator mode={mode} /> : null}
          </div>
        )}

        {error ? (
          <p className="mt-3 rounded-xl border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {warnings.length > 0 ? (
          <p className="mt-3 rounded-xl border border-warning bg-warning-soft px-3 py-2 text-sm text-warning">
            {warnings.join(" ")}
          </p>
        ) : null}

        <div ref={scrollAnchorRef} className="h-px" aria-hidden />
      </div>

      <div className="shrink-0 space-y-3 border-t border-ui bg-app/60 px-4 py-4">
        <ComposerCard
          canSend={canSend}
          chatInput={chatInput}
          isBusy={isBusy}
          mode={mode}
          textareaRef={textareaRef}
          onChange={onChatInputChange}
          onKeyDown={handleComposerKeyDown}
          onSubmit={onSubmit}
          sceneName={sceneName}
          selectedEntityName={selectedEntityName}
        />

        <QuickActions
          canExport={canExport}
          canSave={canSave}
          canSaveVersion={canSaveVersion}
          isBusy={isBusy}
          mode={mode}
          onExport={onExport}
          onSave={onSave}
          onSubmit={onSubmit}
        />
      </div>
    </section>
  );
}

function ContextPills({
  projectName,
  contextTarget,
  contextMeta,
  mode,
}: {
  projectName?: string | null;
  contextTarget: string;
  contextMeta: string;
  mode: AgentMode;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-ui px-4 py-2.5">
      <ContextPill
        icon={<FolderIcon />}
        label={projectName ?? "Project"}
        title={projectName ?? "Current project"}
      />
      <ContextPill
        icon={<SceneIcon />}
        label={contextTarget}
        sublabel={contextMeta}
        title={contextTarget}
      />
      <span className="ml-auto rounded-full border border-ui bg-field px-2.5 py-1 text-[11px] font-medium text-secondary">
        {getModeLabel(mode)}
      </span>
    </div>
  );
}

function ContextPill({
  icon,
  label,
  sublabel,
  title,
}: {
  icon: ReactNode;
  label: string;
  sublabel?: string;
  title?: string;
}) {
  return (
    <div
      className="flex max-w-[48%] min-w-0 items-center gap-2 rounded-full border border-ui bg-field px-3 py-1.5"
      title={title ?? label}
    >
      <span className="shrink-0 text-muted">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium text-primary">
          {label}
        </span>
        {sublabel ? (
          <span className="block truncate text-[10px] text-muted">
            {sublabel}
          </span>
        ) : null}
      </span>
    </div>
  );
}

function EmptyState({ mode }: { mode: AgentMode }) {
  const copy: Record<AgentMode, string> = {
    generate:
      "Describe the scene you want — style, lighting, objects, and mood.",
    edit: "Ask for changes to the whole scene while keeping unrelated parts.",
    refine: "Describe how to change only the selected entity.",
  };

  return (
    <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl border border-ui bg-field text-accent">
        <SparkIcon />
      </div>
      <p className="text-sm font-medium text-primary">What should we build?</p>
      <p className="mt-2 max-w-[260px] text-sm leading-6 text-muted">
        {copy[mode]}
      </p>
    </div>
  );
}

function ChatMessage({ message }: { message: SceneChatMessage }) {
  const isUser = message.role === "user";

  return (
    <article
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <div
        className={`flex max-w-[92%] flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
          isUser
            ? "rounded-tr-md bg-accent-soft text-primary"
            : "rounded-tl-md border border-ui bg-field text-primary"
        }`}
      >
        <MessageMeta message={message} />
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </article>
  );
}

function MessageMeta({ message }: { message: SceneChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted">
      <span>{isUser ? "You" : "Agent"}</span>
      {message.action ? (
        <>
          <span aria-hidden>·</span>
          <span className="normal-case tracking-normal text-secondary">
            {getActionLabel(message.action)}
          </span>
        </>
      ) : null}
      {message.targetName ? (
        <>
          <span aria-hidden>·</span>
          <span className="truncate normal-case tracking-normal text-secondary">
            {message.targetName}
          </span>
        </>
      ) : null}
      <span aria-hidden>·</span>
      <StatusLabel
        status={message.status}
        versionNumber={message.versionNumber}
      />
    </div>
  );
}

function StatusLabel({
  status,
  versionNumber,
}: {
  status: SceneChatMessage["status"];
  versionNumber?: number;
}) {
  const label = versionNumber ? `v${versionNumber}` : status;
  const color =
    status === "failed"
      ? "text-danger"
      : status === "pending"
        ? "text-warning"
        : "text-success";

  return (
    <span className={`normal-case tracking-normal ${color}`}>{label}</span>
  );
}

function WorkingIndicator({ mode }: { mode: AgentMode }) {
  const label: Record<AgentMode, string> = {
    generate: "Generating scene",
    edit: "Editing scene",
    refine: "Refining selection",
  };

  return (
    <div className="flex items-start gap-2 rounded-2xl rounded-tl-md border border-ui bg-field px-3.5 py-2.5 text-sm text-secondary">
      <span className="mt-0.5 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-ui border-t-accent" />
      <span>
        {label[mode]}
        <span className="animate-pulse">…</span>
      </span>
    </div>
  );
}

function ComposerCard({
  chatInput,
  isBusy,
  canSend,
  mode,
  sceneName,
  selectedEntityName,
  textareaRef,
  onChange,
  onKeyDown,
  onSubmit,
}: {
  chatInput: string;
  isBusy: boolean;
  canSend: boolean;
  mode: AgentMode;
  sceneName?: string | null;
  selectedEntityName?: string | null;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ui bg-panel shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.03] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)] dark:ring-white/[0.04]">
      <textarea
        ref={textareaRef}
        className="block max-h-40 min-h-[88px] w-full resize-none bg-transparent px-4 pt-4 pb-2 text-sm leading-6 text-primary outline-none placeholder:text-muted disabled:opacity-60"
        rows={3}
        value={chatInput}
        disabled={isBusy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={getComposerPlaceholder(
          Boolean(sceneName),
          selectedEntityName,
        )}
      />

      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ui bg-field px-2.5 py-1 text-xs font-medium text-secondary">
            <ModeIcon mode={mode} />
            {getModeLabel(mode)}
          </span>
          <span className="hidden text-[11px] text-muted sm:inline">
            Enter to send · Shift+Enter newline
          </span>
        </div>

        <button
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-panel transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          type="button"
          aria-label={isBusy ? "Working" : "Send message"}
          disabled={!canSend}
          onClick={onSubmit}
        >
          {isBusy ? <SpinnerIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

function QuickActions({
  canExport,
  canSave,
  canSaveVersion,
  isBusy,
  mode,
  onExport,
  onSave,
  onSubmit,
}: {
  canExport: boolean;
  canSave: boolean;
  canSaveVersion: boolean;
  isBusy: boolean;
  mode: AgentMode;
  onExport: () => void;
  onSave: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <QuickPill
        disabled={isBusy}
        hint="↵"
        label={getQuickRunLabel(mode)}
        onClick={onSubmit}
      />
      <QuickPill
        disabled={isBusy || !canSave}
        hint="⌘S"
        label={canSaveVersion ? "Save version" : "Save scene"}
        onClick={onSave}
      />
      <QuickPill
        disabled={isBusy || !canExport}
        label="Export GLB"
        onClick={onExport}
      />
    </div>
  );
}

function QuickPill({
  label,
  hint,
  disabled,
  onClick,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-ui bg-panel px-3 py-1.5 text-xs font-medium text-secondary transition hover:border-accent hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {label}
      {hint ? (
        <kbd className="rounded border border-ui bg-field px-1 py-0.5 text-[10px] font-normal text-muted">
          {hint}
        </kbd>
      ) : null}
    </button>
  );
}

function getMode(hasScene: boolean, selectedEntityName?: string | null): AgentMode {
  if (!hasScene) {
    return "generate";
  }

  return selectedEntityName ? "refine" : "edit";
}

function getModeLabel(mode: AgentMode) {
  if (mode === "generate") {
    return "Generate";
  }

  if (mode === "refine") {
    return "Refine";
  }

  return "Edit scene";
}

function getQuickRunLabel(mode: AgentMode) {
  if (mode === "generate") {
    return "Generate scene";
  }

  if (mode === "refine") {
    return "Refine selection";
  }

  return "Apply edit";
}

function getComposerPlaceholder(
  hasScene: boolean,
  selectedEntityName?: string | null,
) {
  if (!hasScene) {
    return "Plan and describe a 3D scene — style, lighting, objects…";
  }

  if (selectedEntityName) {
    return `Refine ${selectedEntityName} — materials, shape, position…`;
  }

  return "Edit the scene — camera, fog, lighting, layout…";
}

function getActionLabel(action: NonNullable<SceneChatMessage["action"]>) {
  if (action === "generate") {
    return "Generate";
  }

  if (action === "refine-entity") {
    return "Refine";
  }

  return "Edit";
}

function ModeIcon({ mode }: { mode: AgentMode }) {
  if (mode === "refine") {
    return <TargetIcon />;
  }

  if (mode === "edit") {
    return <EditIcon />;
  }

  return <SparkIcon />;
}

function SendIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 19V5M5 12l7-7 7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      aria-hidden
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 3l1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M3 7h6l2 2h10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function SceneIcon() {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 19V5l8 4 8-4v14"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 20h4l10-10-4-4L4 16v4z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

