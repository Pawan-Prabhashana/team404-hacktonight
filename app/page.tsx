'use client'

import Image from 'next/image'
import Link from 'next/link'
import FeatureCard from '@/components/ui/FeatureCard'
import MarketingNav from '@/components/ui/MarketingNav'
import PhoneMockup from '@/components/ui/PhoneMockup'
import PlanCard from '@/components/ui/PlanCard'

/* ── Feature grid data ──────────────────────────────────── */
const FEATURES = [
  {
    icon: '↗️',
    title: 'Transfer money',
    description:
      'Send money instantly to anyone with an account number. Local transfers settle in real time.'
  },
  {
    icon: '📊',
    title: 'Customise your budget',
    description:
      'Set monthly spending limits per category. Smart Spend tracks every rupee automatically.'
  },
  {
    icon: '🔄',
    title: 'Exchange money',
    description:
      'Coming soon: multi-currency wallets and competitive FX rates with no hidden markups.'
  },
  {
    icon: '🏦',
    title: 'Manage your accounts',
    description:
      'Freeze, unfreeze, rename, and monitor each account from one clean dashboard.'
  },
  {
    icon: '🛡️',
    title: 'Bank-grade security',
    description:
      'Every session is cryptographically signed. Two-factor and audit logs keep you protected.'
  },
  {
    icon: '✨',
    title: 'And much more',
    description:
      'Bill radar, smart statements, AI-powered insights, and virtual card support coming in upcoming phases.'
  }
]

/* ── Plan data ───────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Serandib Standard',
    tagline: 'Free banking for everyone',
    price: 'Free',
    features: [
      'One main account',
      'Real-time transfers',
      'Smart Spend tracker',
      'Full transaction history'
    ],
    ctaLabel: 'Open Standard account',
    featured: false
  },
  {
    name: 'Serandib Plus',
    tagline: 'For active spenders',
    price: 'LKR 499',
    features: [
      'Everything in Standard',
      'Three sub-accounts',
      'Bill Radar alerts',
      'Priority support'
    ],
    ctaLabel: 'Open Plus account',
    featured: true
  },
  {
    name: 'Serandib Shield',
    tagline: 'Maximum protection',
    price: 'LKR 999',
    features: [
      'Everything in Plus',
      'Unlimited virtual cards',
      'Advanced fraud alerts',
      'Dedicated relationship manager'
    ],
    ctaLabel: 'Open Shield account',
    featured: false
  }
]

export default function HomePage() {
  return (
    <div className="marketing-shell">
      {/* ── 1. Sticky nav ──────────────────────────────────── */}
      <MarketingNav />

      {/* ── 2. Hero ────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          position: 'relative',
          minHeight: '680px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sb-navy)',
          overflow: 'hidden',
          borderRadius: '0 0 2rem 2rem'
        }}
      >
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.65
          }}
          onError={(e) => {
            ;(e.target as HTMLVideoElement).style.display = 'none'
          }}
        >
          <source src="/brand/bank-hero.mp4" type="video/mp4" />
        </video>

        {/* Subtle overlay — keeps text readable without hiding the video */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(7,31,42,0.22) 0%, rgba(7,31,42,0.42) 100%)'
          }}
        />

        {/* Content */}
        <div
          className="marketing-container fade-in-up"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '6rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem'
          }}
        >
          <h1
            style={{
              fontSize: 'clamp(2.75rem, 7vw, 5.5rem)',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              maxWidth: '820px'
            }}
          >
            The first bank
            <br />
            you&apos;ll love
          </h1>
          <p
            className="delay-100 fade-in-up"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.8)',
              maxWidth: '540px',
              lineHeight: 1.6
            }}
          >
            Bank, save, and move money in one beautifully simple app built for
            Sri Lanka.
          </p>
          <div
            className="delay-200 fade-in-up"
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <Link
              href="/sign-up"
              className="serandib-cta-white"
              style={{ fontSize: '1rem', padding: '0.875rem 2.25rem' }}
            >
              Open bank account
            </Link>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.875rem 2.25rem',
                borderRadius: '9999px',
                border: '2px solid rgba(255,255,255,0.5)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '1rem',
                textDecoration: 'none',
                transition: 'border-color 0.2s'
              }}
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── 3. App preview section ─────────────────────────── */}
      <section
        id="bank"
        style={{ padding: '5rem 0', background: 'var(--sb-white)' }}
      >
        <div className="marketing-container">
          <div
            style={{
              background: 'var(--sb-mint)',
              borderRadius: '2rem',
              padding: 'clamp(2.5rem,5vw,4rem)',
              display: 'grid',
              gridTemplateColumns: 'minmax(220px,auto) 1fr',
              gap: '4rem',
              alignItems: 'center'
            }}
            className="responsive-split"
          >
            {/* Phone mockup */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PhoneMockup />
            </div>

            {/* Text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  color: 'var(--sb-text)'
                }}
              >
                Bank for free
                <br />
                with no hidden fees
              </h2>
              <p
                style={{
                  fontSize: '1.0625rem',
                  color: 'var(--sb-muted)',
                  lineHeight: 1.7,
                  maxWidth: '460px'
                }}
              >
                Open your account in minutes and manage spending, transfers,
                bills, and savings from one modern dashboard.
              </p>
              <Link
                href="/sign-up"
                style={{
                  color: 'var(--sb-teal)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                Open a Serandib Standard account &rarr;
              </Link>
            </div>
          </div>
        </div>
        <style>{`
          @media (max-width: 640px) {
            .responsive-split { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* ── 4. Virtual card section ────────────────────────── */}
      <section style={{ padding: '5rem 0', background: 'var(--sb-white)' }}>
        <div className="marketing-container">
          <div
            style={{
              background: '#f7f7f5',
              borderRadius: '2rem',
              overflow: 'hidden',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              minHeight: '420px'
            }}
            className="responsive-split"
          >
            {/* Left text */}
            <div
              style={{
                padding: 'clamp(2.5rem,5vw,4rem)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: '1.5rem'
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(1.875rem,4vw,2.75rem)',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  color: 'var(--sb-text)'
                }}
              >
                Score free virtual cards
              </h2>
              <p
                style={{
                  fontSize: '1.0625rem',
                  color: 'var(--sb-muted)',
                  lineHeight: 1.7
                }}
              >
                Create secure virtual cards for online payments, subscriptions,
                and travel — all from your Serandib dashboard.
              </p>
              <Link
                href="/sign-up"
                style={{
                  color: 'var(--sb-teal)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                Get a virtual card &rarr;
              </Link>
            </div>

            {/* Right visual */}
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                minHeight: '300px',
                background: 'var(--sb-navy)'
              }}
            >
              <Image
                src="/brand/stock-1.png"
                alt="Serandib virtual cards"
                fill
                style={{ objectFit: 'cover', opacity: 0.7 }}
                onError={() => {}}
              />
              {/* Layered CSS cards */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <div style={{ position: 'relative', width: 220, height: 140 }}>
                  <div
                    style={{
                      position: 'absolute',
                      width: 200,
                      height: 125,
                      borderRadius: '1rem',
                      background: 'linear-gradient(135deg, #087f7a, #065e5a)',
                      transform: 'rotate(-8deg) translate(-15px, -10px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '0.75rem',
                      color: '#fff',
                      fontSize: '0.6875rem',
                      fontWeight: 600
                    }}
                  >
                    <div>
                      <div
                        style={{
                          letterSpacing: '0.15em',
                          marginBottom: '0.25rem',
                          opacity: 0.8
                        }}
                      >
                        •••• •••• •••• 4231
                      </div>
                      <div>Serandib Virtual</div>
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      width: 200,
                      height: 125,
                      borderRadius: '1rem',
                      background: 'linear-gradient(135deg, #1f2937, #374151)',
                      transform: 'rotate(2deg) translate(10px, 10px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '0.75rem',
                      color: '#fff',
                      fontSize: '0.6875rem',
                      fontWeight: 600
                    }}
                  >
                    <div>
                      <div
                        style={{
                          letterSpacing: '0.15em',
                          marginBottom: '0.25rem',
                          opacity: 0.8
                        }}
                      >
                        •••• •••• •••• 8876
                      </div>
                      <div>Serandib Shield</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Savings section ─────────────────────────────── */}
      <section
        id="savings"
        style={{ padding: '5rem 0', background: 'var(--sb-white)' }}
      >
        <div className="marketing-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '3rem',
              alignItems: 'center'
            }}
            className="responsive-split"
          >
            {/* Left text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem'
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: '-0.025em',
                  color: 'var(--sb-text)'
                }}
              >
                Make your money
                <br />
                work harder
              </h2>
              <p
                style={{
                  fontSize: '1.0625rem',
                  color: 'var(--sb-muted)',
                  lineHeight: 1.7
                }}
              >
                Set savings goals, forecast upcoming bills, and understand where
                every rupee goes with AI-powered insights.
              </p>
              <p
                style={{
                  fontSize: '1.0625rem',
                  color: 'var(--sb-muted)',
                  lineHeight: 1.7
                }}
              >
                Smart Spend breaks down your habits across categories so you can
                spend smarter — not just less.
              </p>
              <Link
                href="/sign-up"
                style={{
                  color: 'var(--sb-teal)',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                Discover Smart Spend &rarr;
              </Link>
            </div>

            {/* Right image + floating cards */}
            <div
              style={{
                position: 'relative',
                borderRadius: '1.5rem',
                overflow: 'hidden',
                minHeight: '380px',
                background: 'var(--sb-ice)'
              }}
            >
              <Image
                src="/brand/stock-2.png"
                alt="Savings and investment"
                fill
                style={{ objectFit: 'cover' }}
                onError={() => {}}
              />
              {/* Floating insight cards */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '1.5rem',
                  left: '1.5rem',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1rem',
                  padding: '0.875rem 1.25rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  minWidth: '180px'
                }}
                className="float-card"
              >
                <span style={{ fontSize: '1.5rem' }}>🐷</span>
                <div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: '#666',
                      fontWeight: 500
                    }}
                  >
                    Monthly savings
                  </div>
                  <div
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: 800,
                      color: '#087f7a'
                    }}
                  >
                    LKR 12,400
                  </div>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '1rem',
                  padding: '0.875rem 1.25rem',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>📈</span>
                <div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: '#666',
                      fontWeight: 500
                    }}
                  >
                    Forecast
                  </div>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#1f1f1f'
                    }}
                  >
                    On track ✓
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Choose plan section ─────────────────────────── */}
      <section
        id="plans"
        style={{ padding: '5rem 0', background: 'var(--sb-white)' }}
      >
        <div className="marketing-container">
          <div
            style={{
              background: 'var(--sb-navy)',
              borderRadius: '2.5rem',
              padding: 'clamp(3rem,6vw,5rem) clamp(2rem,5vw,4rem)',
              display: 'flex',
              flexDirection: 'column',
              gap: '3.5rem',
              backgroundImage:
                'radial-gradient(ellipse at 80% 20%, rgba(8,127,122,0.25) 0%, transparent 60%)'
            }}
          >
            {/* Heading */}
            <div
              style={{
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(2rem,5vw,3.5rem)',
                  fontWeight: 900,
                  color: '#fff',
                  letterSpacing: '-0.03em'
                }}
              >
                Choose your plan
              </h2>
              <p
                style={{
                  fontSize: '1.125rem',
                  color: 'rgba(255,255,255,0.65)',
                  maxWidth: '480px',
                  margin: '0 auto',
                  lineHeight: 1.6
                }}
              >
                Find the Serandib plan that fits your money goals. Upgrade or
                downgrade any time.
              </p>
              <Link
                href="#plans"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 600,
                  fontSize: '0.9375rem',
                  textDecoration: 'none',
                  justifyContent: 'center'
                }}
              >
                Compare plans &rarr;
              </Link>
            </div>

            {/* Plan cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px,1fr))',
                gap: '1.25rem'
              }}
            >
              {PLANS.map((p) => (
                <PlanCard key={p.name} {...p} ctaHref="/sign-up" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Feature grid ────────────────────────────────── */}
      <section style={{ padding: '5rem 0', background: 'var(--sb-white)' }}>
        <div className="marketing-container">
          <div
            style={{
              textAlign: 'center',
              marginBottom: '3.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <h2
              style={{
                fontSize: 'clamp(1.875rem,4vw,3rem)',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: 'var(--sb-text)'
              }}
            >
              Everything you need to bank smarter
            </h2>
            <p
              style={{
                fontSize: '1.0625rem',
                color: 'var(--sb-muted)',
                maxWidth: '480px',
                margin: '0 auto',
                lineHeight: 1.6
              }}
            >
              Serandib Bank is built around the features that matter most to
              modern Sri Lankan banking.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))',
              gap: '1.25rem'
            }}
          >
            {FEATURES.map((f, i) => (
              <FeatureCard
                key={f.title}
                icon={f.icon}
                title={f.title}
                description={f.description}
                delay={i * 80}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Stock photo editorial ──────────────────────────── */}
      <section style={{ padding: '4rem 0', background: 'var(--sb-bg)' }}>
        <div className="marketing-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.25rem',
              borderRadius: '2rem',
              overflow: 'hidden'
            }}
            className="responsive-split"
          >
            <div
              style={{
                position: 'relative',
                minHeight: '360px',
                background: 'var(--sb-navy)'
              }}
            >
              <Image
                src="/brand/stock-4.png"
                alt="Digital banking"
                fill
                style={{ objectFit: 'cover', opacity: 0.75 }}
                onError={() => {}}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(7,31,42,0.8) 0%, transparent 60%)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '2rem',
                  left: '2rem',
                  color: '#fff'
                }}
              >
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    marginBottom: '0.5rem'
                  }}
                >
                  Secure by design
                </div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
                  Every transaction signed and audited
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'relative',
                minHeight: '360px',
                background: '#f0efec'
              }}
            >
              <Image
                src="/brand/stock-5.png"
                alt="Mobile banking"
                fill
                style={{ objectFit: 'cover' }}
                onError={() => {}}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 50%)'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '2rem',
                  left: '2rem',
                  color: '#fff'
                }}
              >
                <div
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    marginBottom: '0.5rem'
                  }}
                >
                  Bank anywhere
                </div>
                <div style={{ fontSize: '0.9375rem', opacity: 0.8 }}>
                  24/7 access from any device
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ───────────────────────────────────── */}
      <section
        style={{
          padding: '7rem 0',
          background: 'var(--sb-bg)',
          textAlign: 'center'
        }}
      >
        <div
          className="marketing-container"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2rem'
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(2rem,5vw,3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              color: 'var(--sb-text)',
              lineHeight: 1.15,
              maxWidth: '640px'
            }}
          >
            Ready for banking that finally feels modern?
          </h2>
          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--sb-muted)',
              maxWidth: '440px',
              lineHeight: 1.65
            }}
          >
            Join thousands of Sri Lankans who manage their money with confidence
            using Serandib Bank.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <Link
              href="/sign-up"
              className="serandib-cta"
              style={{ fontSize: '1rem', padding: '0.875rem 2.25rem' }}
            >
              Open bank account
            </Link>
            <Link
              href="/login"
              className="serandib-cta-outline"
              style={{ fontSize: '1rem', padding: '0.875rem 2.25rem' }}
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        style={{
          borderTop: '1px solid var(--sb-line)',
          padding: '3rem 0',
          background: 'var(--sb-white)'
        }}
      >
        <div
          className="marketing-container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.5rem'
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: 'var(--sb-text)',
                marginBottom: '0.375rem'
              }}
            >
              Serandib Bank
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--sb-muted)' }}>
              Built for modern Sri Lankan banking. Demo environment.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {['Security', 'Privacy', 'Terms', 'Support'].map((item) => (
              <a
                key={item}
                href="#"
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--sb-muted)',
                  textDecoration: 'none'
                }}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
