'use client'

import { useRouter } from 'next/navigation'

export default function Header() {
  const router = useRouter()

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(15,15,15,0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #1a1a1a',
      padding: '14px 24px',
      display: 'flex',
      alignItems: 'center',
    }}>
      <button
        onClick={() => router.push('/')}
        style={{ background: 'none', border: 'none', color: '#FF2D55', fontSize: '22px', fontWeight: '700', letterSpacing: '-0.5px', cursor: 'pointer', padding: 0 }}
      >
        かずログ
      </button>
    </header>
  )
}