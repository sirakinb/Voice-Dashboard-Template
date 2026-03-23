"use client";

import Image from "next/image";
import { Suspense, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  resendVerificationEmailAction,
  signInWithPasswordAction,
  signUpAction,
  verifyEmailAction,
} from "@/lib/insforge/actions";
import { templateConfig } from "@/lib/template-config";

type FormMode = "sign-in" | "sign-up" | "verify";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<FormMode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<MessageState>(
    searchParams.get("error")
      ? { type: "error", text: "Authentication failed. Please try again." }
      : null
  );
  const [isPending, startTransition] = useTransition();

  const nextPath = searchParams.get("next") || "/";
  const authConfigured = Boolean(
    process.env.NEXT_PUBLIC_INSFORGE_URL &&
      process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY
  );

  function completeAuth() {
    router.replace(nextPath);
    router.refresh();
  }

  function showVerificationStep(text: string) {
    setMode("verify");
    setMessage({ type: "success", text });
  }

  function handleSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await signInWithPasswordAction(email, password);

      if (!result.success) {
        if (result.requiresVerification) {
          showVerificationStep(
            "Your account still needs verification. Enter the 6-digit code from your email."
          );
          return;
        }

        setMessage({
          type: "error",
          text: result.error || "Unable to sign in.",
        });
        return;
      }

      completeAuth();
    });
  }

  function handleSignUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await signUpAction(name, email, password);

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || "Unable to create your account.",
        });
        return;
      }

      if (result.requiresVerification) {
        showVerificationStep(
          "We sent a verification code to your email. Enter it below to finish sign-up."
        );
        return;
      }

      completeAuth();
    });
  }

  function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const result = await verifyEmailAction(email, verificationCode);

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || "Unable to verify your email.",
        });
        return;
      }

      completeAuth();
    });
  }

  function handleResendCode() {
    setMessage(null);

    startTransition(async () => {
      const result = await resendVerificationEmailAction(email);

      if (!result.success) {
        setMessage({
          type: "error",
          text: result.error || "Unable to resend the verification code.",
        });
        return;
      }

      setMessage({
        type: "success",
        text: "A fresh verification code has been sent.",
      });
    });
  }

  return (
    <div className="glass-card w-full max-w-md rounded-[2rem] p-8 sm:p-10">
      <div className="mb-8 flex justify-center lg:hidden">
        <Image
          src={templateConfig.brand.logoSrc}
          alt={templateConfig.brand.companyName}
          width={180}
          height={72}
          className="h-14 w-auto"
          priority
        />
      </div>

      <div className="mb-8">
        <div className="glass-panel inline-flex rounded-full p-1">
          <button
            type="button"
            onClick={() => {
              setMode("sign-in");
              setMessage(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "sign-in"
                ? "bg-jackson-green/85 text-white shadow-lg"
                : "text-jackson-charcoal-muted hover:text-jackson-charcoal"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("sign-up");
              setMessage(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === "sign-up"
                ? "bg-jackson-green/85 text-white shadow-lg"
                : "text-jackson-charcoal-muted hover:text-jackson-charcoal"
            }`}
          >
            Create account
          </button>
        </div>

        <h2 className="mt-6 text-2xl font-bold text-jackson-charcoal">
          {mode === "verify"
            ? templateConfig.auth.verificationTitle
            : templateConfig.auth.signInTitle}
        </h2>
        <p className="mt-2 text-sm text-jackson-text-muted">
          {mode === "verify"
            ? templateConfig.auth.verificationSubtitle
            : templateConfig.auth.signInSubtitle}
        </p>
      </div>

      {!authConfigured && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Configure `NEXT_PUBLIC_INSFORGE_URL` and `NEXT_PUBLIC_INSFORGE_ANON_KEY`
          in `.env.local` before using live authentication.
        </div>
      )}

      {message && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-jackson-green/10 text-jackson-green"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      {mode === "verify" ? (
        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label
              htmlFor="verify-email"
              className="block text-sm font-medium text-jackson-charcoal"
            >
              Email address
            </label>
            <input
              id="verify-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="glass-input mt-2 block w-full rounded-xl px-4 py-3 text-jackson-charcoal transition focus:border-jackson-green focus:outline-none focus:ring-2 focus:ring-jackson-green/20"
            />
          </div>

          <div>
            <label
              htmlFor="verification-code"
              className="block text-sm font-medium text-jackson-charcoal"
            >
              Verification code
            </label>
            <input
              id="verification-code"
              inputMode="numeric"
              maxLength={6}
              required
              value={verificationCode}
              onChange={(event) =>
                setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="glass-input mt-2 block w-full rounded-xl px-4 py-3 text-jackson-charcoal transition focus:border-jackson-green focus:outline-none focus:ring-2 focus:ring-jackson-green/20"
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isPending || verificationCode.length !== 6 || !email.trim()}
              className="glass-button-primary flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-jackson-green focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Verifying..." : "Verify and continue"}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isPending || !email.trim()}
              className="glass-button-secondary w-full rounded-xl px-4 py-3 text-sm font-medium text-jackson-charcoal transition hover:bg-jackson-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resend code
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setVerificationCode("");
                setMessage(null);
              }}
              className="w-full text-sm text-jackson-charcoal-muted hover:text-jackson-charcoal"
            >
              Back to sign in
            </button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={mode === "sign-in" ? handleSignIn : handleSignUp}
          className="space-y-6"
        >
          {mode === "sign-up" && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-jackson-charcoal"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Taylor Morgan"
                className="glass-input mt-2 block w-full rounded-xl px-4 py-3 text-jackson-charcoal transition focus:border-jackson-green focus:outline-none focus:ring-2 focus:ring-jackson-green/20"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-jackson-charcoal"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="glass-input mt-2 block w-full rounded-xl px-4 py-3 text-jackson-charcoal transition focus:border-jackson-green focus:outline-none focus:ring-2 focus:ring-jackson-green/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-jackson-charcoal"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              className="glass-input mt-2 block w-full rounded-xl px-4 py-3 text-jackson-charcoal transition focus:border-jackson-green focus:outline-none focus:ring-2 focus:ring-jackson-green/20"
            />
          </div>

          <button
            type="submit"
            disabled={
              isPending ||
              !email.trim() ||
              !password.trim() ||
              (mode === "sign-up" && !name.trim())
            }
            className="glass-button-primary flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-jackson-green focus:ring-offset-2 focus:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? mode === "sign-in"
                ? "Signing in..."
                : "Creating account..."
              : mode === "sign-in"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="app-shell flex min-h-screen bg-jackson-cream">
      <div className="glass-hero hidden w-1/2 flex-col p-12 lg:flex">
        <div>
          <Image
            src={templateConfig.brand.logoSrc}
            alt={templateConfig.brand.companyName}
            width={180}
            height={72}
            className="h-14 w-auto"
            priority
          />
        </div>

        <div className="mt-24 max-w-4xl space-y-6">
          <h1 className="text-4xl font-bold leading-tight text-white">
            {templateConfig.auth.heroTitle}
          </h1>
          <p className="text-lg text-white/88">
            {templateConfig.auth.heroDescription}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-4">
            {templateConfig.auth.featureBadges.map((badge) => (
              <div
                key={badge}
                className="flex items-center gap-2 rounded-full bg-jackson-green/20 px-4 py-2"
              >
                <div className="h-2 w-2 rounded-full bg-jackson-green" />
                <span className="text-sm font-medium text-white">
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center justify-center px-8 lg:w-1/2 lg:px-16">
        <Suspense
          fallback={
            <div className="text-jackson-text-muted">Loading authentication...</div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
