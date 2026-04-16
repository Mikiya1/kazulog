'use client'

import { useRouter } from 'next/navigation'
import AuthButton from './AuthButton'

export default function Header() {
  const router = useRouter()

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(235,235,240,0.8)',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <button
        onClick={() => router.push('/')}
        style={{
          background: 'linear-gradient(135deg, #FD297B 0%, #FF655B 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          border: 'none',
          fontSize: '24px',
          fontWeight: '800',
          cursor: 'pointer',
          padding: 0,
          letterSpacing: '-0.5px',
        } as React.CSSProperties}
      >
        かずログ 🔥
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      
        <AuthButton />
      </div>
    </header>
  )
}