"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AppModal, type ModalRequest } from "./app-modal";

type PromptOptions = Omit<
  Extract<ModalRequest, { kind: "prompt" }>,
  "id" | "kind" | "resolve"
>;

type ConfirmOptions = Omit<
  Extract<ModalRequest, { kind: "confirm" }>,
  "id" | "kind" | "resolve"
>;

export function useAppModal() {
  const nextId = useRef(1);
  const [request, setRequest] = useState<ModalRequest | null>(null);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setRequest({
        ...options,
        id: nextId.current++,
        kind: "prompt",
        resolve,
      });
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setRequest({
        ...options,
        id: nextId.current++,
        kind: "confirm",
        resolve,
      });
    });
  }, []);

  const modal = useMemo(
    () => <AppModal request={request} onClose={() => setRequest(null)} />,
    [request],
  );

  return { confirm, modal, prompt };
}
