'use client'

import { useRouter, usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: 'ホーム', icon: '🏠', path: '/' },
  { label: '女優一覧', icon: '👩', path: '/actresses' },
  { label: '診断', icon: '🔥', path: '/swipe' },
  { label: 'ジャンル', icon: '🔍', path: '/genre-search' },
  { label: 'お気に入り', icon: '💖', path: '/favorites' },
]

export default function BottomNav() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <>
      {/* ボトムナビの高さ分のスペーサー */}
      <div style={{ height: '72px' }} />

      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '480px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(235,235,240,0.8)',
        display: 'flex',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {NAV_ITEMS.map(item => {
          const isActive = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px 0 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <div style={{ fontSize: '22px', lineHeight: 1 }}>{item.icon}</div>
              <div style={{
                fontSize: '10px',
                fontWeight: '700',
                color: isActive ? '#FD297B' : 'var(--subtext)',
                letterSpacing: '0.3px',
              }}>
                {item.label}
              </div>
              {isActive && (
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  width: '24px',
                  height: '3px',
                  background: 'var(--gradient)',
                  borderRadius: '3px 3px 0 0',
                }} />
              )}
            </button>
          )
        })}
      </nav>
    </>
  )
}
