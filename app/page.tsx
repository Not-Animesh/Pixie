import React from 'react';

export default function Home() {
  return (
    <main style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.badge}>Next.js Boilerplate CLI 🚀</div>
        <h1 style={styles.title}>
          Your Premium SaaS Stack <span style={styles.gradient}>Is Ready</span>
        </h1>
        <p style={styles.subtitle}>
          Congratulations! Your customized Next.js boilerplate has been successfully scaffolded with all your selected databases, components, and authentication configurations.
        </p>
        
        <div style={styles.ctaGroup}>
          <a href="https://nextjs.org/docs" target="_blank" rel="noopener noreferrer" style={styles.primaryCta}>
            Read Next.js Docs
          </a>
          <a href="#features" style={styles.secondaryCta}>
            Explore Stack Files
          </a>
        </div>
      </div>

      <section id="features" style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.icon}>⚡</div>
          <h3 style={styles.cardTitle}>App Router Ready</h3>
          <p style={styles.cardText}>Built using modern Next.js 15 App Router with full Server Components and safe SEO presets.</p>
        </div>
        
        <div style={styles.card}>
          <div style={styles.icon}>🔒</div>
          <h3 style={styles.cardTitle}>Modular Auth</h3>
          <p style={styles.cardText}>Pre-configured middleware rules and pages for secure, lightning-fast session validation.</p>
        </div>

        <div style={styles.card}>
          <div style={styles.icon}>🗄️</div>
          <h3 style={styles.cardTitle}>Database Integration</h3>
          <p style={styles.cardText}>Configured connections, client instances, schemas, and live migration configurations.</p>
        </div>
      </section>

      <footer style={styles.footer}>
        Created with <span style={{ color: '#ec4899' }}>♥</span> by{' '}
        <a
          href="https://www.youtube.com/@tubeguruji"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#71717a', textDecoration: 'underline', transition: 'color 0.2s' }}
        >
          Tubeguruji
        </a>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090b',
    color: '#fafafa',
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
    padding: '2rem',
    boxSizing: 'border-box',
  },
  hero: {
    textAlign: 'center',
    maxWidth: '800px',
    marginBottom: '4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-block',
    padding: '0.5rem 1rem',
    borderRadius: '9999px',
    backgroundColor: '#27272a',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#38bdf8',
    marginBottom: '1.5rem',
    border: '1px solid #3f3f46',
  },
  title: {
    fontSize: '3rem',
    fontWeight: 800,
    letterSpacing: '-0.025em',
    lineHeight: 1.2,
    margin: '0 0 1rem 0',
  },
  gradient: {
    background: 'linear-gradient(to right, #38bdf8, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#a1a1aa',
    lineHeight: 1.6,
    margin: '0 0 2rem 0',
    maxWidth: '600px',
  },
  ctaGroup: {
    display: 'flex',
    gap: '1rem',
  },
  primaryCta: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    backgroundColor: '#38bdf8',
    color: '#09090b',
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'opacity 0.2s',
  },
  secondaryCta: {
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#fafafa',
    fontWeight: 600,
    textDecoration: 'none',
    border: '1px solid #3f3f46',
    transition: 'background-color 0.2s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '2rem',
    width: '100%',
    maxWidth: '1000px',
    marginBottom: '4rem',
  },
  card: {
    backgroundColor: '#18181b',
    border: '1px solid #27272a',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  icon: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    margin: '0 0 0.5rem 0',
  },
  cardText: {
    fontSize: '0.875rem',
    color: '#a1a1aa',
    lineHeight: 1.5,
    margin: 0,
  },
  footer: {
    fontSize: '0.875rem',
    color: '#71717a',
    marginTop: 'auto',
  },
};
