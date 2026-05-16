"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "./auth-provider";

interface AuthScreenProps {
  initialMode?: "signin" | "signup";
}

export function AuthScreen({ initialMode = "signin" }: AuthScreenProps) {
  const router = useRouter();
  const {
    accessToken,
    error: sessionError,
    isConfigured,
    isLoading,
    signIn,
    signUp,
  } = useAuth();
  const [mode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(sessionError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && accessToken) {
      router.replace("/dashboard");
    }
  }, [accessToken, isLoading, router]);

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
    <main className="minimesh-branded minimesh-mesh-bg relative flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="hero-glow pointer-events-none fixed inset-0" aria-hidden />
      <section className="minimesh-glass-card relative z-10 w-full max-w-md rounded-2xl p-8">
        <Link href="/" className="mb-6 flex items-center gap-2.5">
          <Image src="/logo.svg" alt="" width={36} height={36} priority />
          <span className="text-lg font-semibold tracking-tight text-landing-heading">
            MiniMesh <span className="text-[var(--landing-accent)]">AI</span>
          </span>
        </Link>

        <p className="minimesh-eyebrow">
          {mode === "signin" ? "Welcome back" : "Get started"}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-landing-heading">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-landing-muted">
          {mode === "signin"
            ? "Sign in to generate, save, and version your 3D scenes."
            : "Create an account to start building versioned 3D scenes."}
        </p>

        {!isConfigured ? (
          <p className="minimesh-alert-warn mt-5">
            Supabase frontend environment variables are missing.
          </p>
        ) : null}

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-landing-heading">
            Email
            <input
              className="minimesh-input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-landing-heading">
            Password
            <input
              className="minimesh-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>

          {error ? <p className="minimesh-alert-error">{error}</p> : null}

          {message ? <p className="minimesh-alert-success">{message}</p> : null}

          <button
            className="minimesh-btn-primary"
            type="submit"
            disabled={!isConfigured || isSubmitting}
          >
            {isSubmitting
              ? "Please wait…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <Link
          className="mt-6 block text-center text-sm font-medium text-[var(--landing-accent)] transition hover:brightness-110"
          href={mode === "signin" ? "/signup" : "/login"}
        >
          {mode === "signin"
            ? "Need an account? Sign up"
            : "Already have an account? Sign in"}
        </Link>

        <Link
          href="/"
          className="mt-4 block text-center text-xs text-landing-subtle transition hover:text-landing-heading"
        >
          ← Back to home
        </Link>
      </section>
    </main>
  );
}
