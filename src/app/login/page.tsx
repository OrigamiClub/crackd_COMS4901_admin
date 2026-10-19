"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/utils/supabase/client";

function LoginError() {
  const error = useSearchParams().get("error");
  return error ? (
    <p className="text-sm text-red-700">Login didn&apos;t go through. Try again.</p>
  ) : null;
}

export default function LoginPage() {
  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
      <span className="text-5xl" aria-hidden>
        🐹
      </span>
      <h1 className="page-title">Crackd admin</h1>
      <p className="max-w-sm text-sm">
        Staff only. Sign in with the Google account that has admin access.
      </p>
      <button type="button" onClick={handleGoogleLogin} className="btn-primary">
        Continue with Google
      </button>
      <Suspense>
        <LoginError />
      </Suspense>
    </main>
  );
}
