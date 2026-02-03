"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      const redirectedFrom = searchParams.get("redirectedFrom");
      router.push(redirectedFrom || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="card auth-card">
        <h1>Welcome back</h1>
        <p className="lead">Log in to review your sessions and reports.</p>
        <div className="auth-fields">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <div className="controls">
          <button className="btn primary" onClick={handleLogin} disabled={loading}>
            Sign in
          </button>
          <button className="btn ghost" onClick={() => router.push("/auth/register")}
            disabled={loading}
          >
            Create account
          </button>
        </div>
        {error ? <div className="error">{error}</div> : null}
      </section>
    </main>
  );
}
