export default function HomePage() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Дайбилет</h1>
      <p>Next.js full-stack monorepo — F1 shell.</p>
      <p>
        Health: <a href="/api/health">/api/health</a>
      </p>
    </main>
  );
}
