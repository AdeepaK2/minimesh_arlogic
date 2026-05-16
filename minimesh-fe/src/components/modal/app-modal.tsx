"use client";

import { FormEvent } from "react";

export type ModalRequest =
  | {
      id: number;
      kind: "prompt";
      title: string;
      description?: string;
      label: string;
      defaultValue?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      tone?: "default" | "danger";
      resolve: (value: string | null) => void;
    }
  | {
      id: number;
      kind: "confirm";
      title: string;
      description?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      tone?: "default" | "danger";
      resolve: (value: boolean) => void;
    };

interface AppModalProps {
  request: ModalRequest | null;
  onClose: () => void;
}

export function AppModal({ request, onClose }: AppModalProps) {
  if (!request) {
    return null;
  }

  function closeWith(result: string | boolean | null) {
    if (!request) {
      return;
    }

    if (request.kind === "prompt") {
      request.resolve(typeof result === "string" ? result : null);
    } else {
      request.resolve(Boolean(result));
    }

    onClose();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!request) {
      return;
    }

    if (request.kind === "prompt") {
      const formData = new FormData(event.currentTarget);
      const value = String(formData.get("prompt") ?? "").trim();

      closeWith(value || null);
      return;
    }

    closeWith(true);
  }

  const isDanger = request.tone === "danger";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 px-4">
      <form
        className="w-full max-w-md border border-ui bg-panel p-5 shadow-xl"
        onSubmit={handleSubmit}
      >
        <h2 className="text-lg font-semibold text-primary">{request.title}</h2>
        {request.description ? (
          <p className="mt-2 text-sm leading-6 text-secondary">
            {request.description}
          </p>
        ) : null}

        {request.kind === "prompt" ? (
          <label className="mt-5 grid gap-2 text-sm font-medium text-primary">
            {request.label}
            <input
              autoFocus
              defaultValue={request.defaultValue ?? ""}
              name="prompt"
              className="border border-ui bg-field px-3 py-3 text-primary outline-none transition focus:border-accent"
            />
          </label>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            className="border border-ui bg-field px-4 py-2 text-sm font-semibold text-primary transition hover:border-accent"
            type="button"
            onClick={() => closeWith(request.kind === "prompt" ? null : false)}
          >
            {request.cancelLabel ?? "Cancel"}
          </button>
          <button
            className={`border px-4 py-2 text-sm font-semibold transition ${
              isDanger
                ? "border-danger bg-danger-soft text-danger hover:opacity-80"
                : "border-accent bg-accent text-accent-contrast hover:bg-accent-strong"
            }`}
            type="submit"
          >
            {request.confirmLabel ?? "Continue"}
          </button>
        </div>
      </form>
    </div>
  );
}
