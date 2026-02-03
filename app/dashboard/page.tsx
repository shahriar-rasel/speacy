import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/auth/login");
  }

  return (
    <main className="app">
      <section className="dashboard">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Instructor</p>
            <h1>Dashboard</h1>
          </div>
          <form action="/auth/logout" method="post">
            <button className="btn ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>

        <div className="card">
          <h2>Welcome back</h2>
          <p className="lead">You are signed in as {data.user.email}</p>
          <p className="lead">Visit the teacher reports at /teacher.</p>
        </div>
      </section>
    </main>
  );
}
