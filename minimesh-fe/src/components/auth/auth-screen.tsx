"use client";

import { FormEvent, useState } from "react";
import { useAuth } from "./auth-provider";

export function AuthScreen() {
  const { error: sessionError, isConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(sessionError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setMessage("Account created. Check your email if confirmation is enabled.");
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Authentication failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-app px-4 text-primary">
      <section className="w-full max-w-md border border-ui bg-panel p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
          MiniMesh
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-secondary">
          Sign in to generate, save, and version your 3D scenes.
        </p>

        {!isConfigured ? (
          <p className="mt-5 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
            Supabase frontend environment variables are missing.
          </p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium">
            Email
            <input
              className="border border-ui bg-field px-3 py-3 text-primary outline-none transition focus:border-accent"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Password
            <input
              className="border border-ui bg-field px-3 py-3 text-primary outline-none transition focus:border-accent"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {error ? (
            <p className="border border-danger bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}

          {message ? (
            <p className="border border-success bg-success-soft px-3 py-2 text-sm text-success">
              {message}
            </p>
          ) : null}

          <button
            className="border border-accent bg-accent px-4 py-3 text-sm font-semibold text-accent-contrast transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={!isConfigured || isSubmitting}
          >
            {isSubmitting
              ? "Please wait"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          className="mt-4 text-sm font-medium text-accent transition hover:text-accent-strong"
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setMessage(null);
          }}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
