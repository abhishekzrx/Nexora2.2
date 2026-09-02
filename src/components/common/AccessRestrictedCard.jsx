/**
 * AccessRestrictedCard.jsx
 * Layer 2 Security Shield for unauthorized route / course / admin access attempts.
 */

import AppIcon from '../ui/AppIcon'

export default function AccessRestrictedCard({
  title = 'Access Restricted',
  message = 'You do not have permission to view this content or administration panel.',
  onReturnDashboard = () => window.location.hash = '#/',
  showContactAdmin = true,
}) {
  return (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '70vh',
        padding: '24px',
        color: '#F8FAFC',
      }}
    >
      <div
        style={{
          width: 'min(100%, 460px)',
          background: 'linear-gradient(180deg, rgba(30, 27, 26, 0.95), rgba(15, 14, 13, 0.95))',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '24px',
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 30px rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 20px',
            color: '#EF4444',
          }}
        >
          <AppIcon name="lock" size={32} />
        </div>

        <h2 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
          {title}
        </h2>

        <p style={{ margin: '0 0 24px', fontSize: '0.94rem', color: '#94A3B8', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={onReturnDashboard}
            style={{
              height: '48px',
              border: 'none',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #F1621B 0%, #EA580C 100%)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(241, 98, 27, 0.3)',
              transition: 'transform 0.18s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            ← Return to Allowed Dashboard
          </button>

          {showContactAdmin && (
            <span style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '4px' }}>
              Contact Super Admin (adminalpha) to request course access.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
