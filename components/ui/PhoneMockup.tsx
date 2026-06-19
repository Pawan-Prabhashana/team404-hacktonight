'use client'

interface Transaction {
  icon: string
  label: string
  amount: string
  color?: string
}

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { icon: '🛒', label: 'Supermarket', amount: '-LKR 850', color: '#ef4444' },
  { icon: '🚕', label: 'Taxi', amount: '-LKR 350', color: '#ef4444' },
  {
    icon: '✈️',
    label: 'Airport transfer',
    amount: '-LKR 1,200',
    color: '#ef4444'
  },
  { icon: '💰', label: 'Salary', amount: '+LKR 85,000', color: '#10b981' }
]

interface PhoneMockupProps {
  balance?: string
  accountName?: string
  transactions?: Transaction[]
}

export default function PhoneMockup({
  balance = 'LKR 87,325.00',
  accountName = 'Main Account',
  transactions = DEFAULT_TRANSACTIONS
}: PhoneMockupProps) {
  return (
    <div className="serandib-phone float-slow" style={{ margin: '0 auto' }}>
      {/* Status bar */}
      <div
        style={{
          paddingTop: '52px',
          paddingLeft: '1.25rem',
          paddingRight: '1.25rem',
          background: '#fff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* App header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem'
          }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#111' }}>
            Home
          </span>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #087f7a, #0a63ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            S
          </div>
        </div>

        {/* Account card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #087f7a, #065e5a)',
            borderRadius: '1rem',
            padding: '1rem',
            color: '#fff',
            marginBottom: '1rem'
          }}
        >
          <div
            style={{
              fontSize: '0.625rem',
              opacity: 0.8,
              marginBottom: '0.25rem'
            }}
          >
            {accountName} &rsaquo;
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{balance}</div>
          <div
            style={{
              fontSize: '0.5625rem',
              opacity: 0.7,
              marginTop: '0.25rem'
            }}
          >
            Current balance
          </div>
        </div>

        {/* Transactions */}
        <div
          style={{
            fontSize: '0.625rem',
            fontWeight: 600,
            color: '#888',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          Recent
        </div>
        {transactions.slice(0, 3).map((tx, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0',
              borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none'
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                flexShrink: 0
              }}
            >
              {tx.icon}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: '0.6875rem',
                color: '#374151',
                fontWeight: 500
              }}
            >
              {tx.label}
            </span>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: tx.color ?? '#374151'
              }}
            >
              {tx.amount}
            </span>
          </div>
        ))}

        {/* Mini budget bar */}
        <div
          style={{
            marginTop: 'auto',
            paddingBottom: '1rem',
            paddingTop: '0.75rem'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.375rem'
            }}
          >
            <div
              style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#087f7a',
                  display: 'block'
                }}
              />
              <span style={{ fontSize: '0.5rem', color: '#666' }}>Income</span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#ef4444',
                  display: 'block'
                }}
              />
              <span style={{ fontSize: '0.5rem', color: '#666' }}>
                Expenses
              </span>
            </div>
          </div>
          <div
            style={{
              height: 32,
              background: '#f3f4f6',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              display: 'flex'
            }}
          >
            <div
              style={{
                width: '65%',
                background: 'linear-gradient(90deg, #087f7a, #0a9e98)',
                height: '100%'
              }}
            />
            <div
              style={{
                width: '35%',
                background: 'linear-gradient(90deg, #ef4444, #f87171)',
                height: '100%'
              }}
            />
          </div>
          <div
            style={{
              fontSize: '0.5625rem',
              color: '#666',
              marginTop: '0.375rem',
              textAlign: 'center'
            }}
          >
            LKR 5,531 left of budget
          </div>
        </div>
      </div>
    </div>
  )
}
