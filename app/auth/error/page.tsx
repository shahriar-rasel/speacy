export default function AuthErrorPage() {
  return (
    <main className="app">
      <section className="card auth-card">
        <h1>Verification failed</h1>
        <p className="lead">
          We couldn't verify that link. Try again or request a new confirmation email.
        </p>
      </section>
    </main>
  );
}
