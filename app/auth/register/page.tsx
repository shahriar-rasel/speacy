"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleRegister = async () => {
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        },
      });
      if (signUpError) throw signUpError;
      setNotice("Check your email to confirm your account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <section className="card auth-card">
        <h1>Create account</h1>
        <p className="lead">Set up your instructor account for the dashboard.</p>
        <div className="auth-fields">
          <input
            className="input"
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
          />
          <input
            className="input"
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
          />
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
          <button className="btn primary" onClick={handleRegister} disabled={loading}>
            Create account
          </button>
          <button className="btn ghost" onClick={() => router.push("/auth/login")}
            disabled={loading}
          >
            Back to login
          </button>
        </div>
        {notice ? <div className="notice">{notice}</div> : null}
        {error ? <div className="error">{error}</div> : null}
      </section>
    </main>
  );
}
