import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Command } from "lucide-react";
import { auth } from "@/auth";
import { AuthBackground } from "@/components/auth/auth-background";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <div className="relative container grid min-h-screen flex-col items-center justify-center px-6 lg:max-w-none lg:grid-cols-2 lg:px-0">
      {/* Left panel */}
      <div className="relative hidden h-full flex-col overflow-hidden bg-[#050505] p-10 text-white lg:flex dark:border-r">
        <AuthBackground />

        <div className="relative z-20 flex items-center gap-2 text-lg font-medium">
          <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.15)]">
            <Command className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            KnotEngine Dashboard
          </span>
        </div>

        <div className="relative z-20 mt-auto">
          <div className="grid gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-white/90">
              The Protocol for Commerce
            </h2>
            <p className="max-w-105 text-lg leading-relaxed text-zinc-500 italic">
              &ldquo;Institutional-grade infrastructure for secure,
              non-custodial stablecoin settlements.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-full p-4 lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-87.5">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome to KnotEngine
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to access your merchant dashboard
            </p>
          </div>

          <Suspense
            fallback={
              <div className="bg-muted h-28 w-full animate-pulse rounded-md" />
            }
          >
            <LoginForm />
          </Suspense>

          <p className="text-muted-foreground px-8 text-center text-xs leading-relaxed">
            By continuing, you agree to our{" "}
            <a
              href="/terms"
              className="hover:text-primary underline underline-offset-4"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="hover:text-primary underline underline-offset-4"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
