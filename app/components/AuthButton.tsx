'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type User = {
  id: string
  email?: string
  user_metadata?: { full_name?: string; avatar_url?: string }
}

export default function AuthButton() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setMenuOpen(false)
  }

  const getInitial = (user: User) => {
    const name = user.user_metadata?.full_name
    if (name) return name.charAt(0).toUpperCase()
    if (user.email) return user.email.charAt(0).toUpperCase()
    return '?'
  }

  if (loading) return null

  if (user) {
    return (
      <div ref={menuRef} style={{ position: 'relative' }}>
        {/* イニシャルアイコン */}
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            background: 'var(--gradient)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '14px', fontWeight: '700',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-btn)',
          }}
        >
          {getInitial(user)}
        </button>

        {/* ドロップダウンメニュー */}
        {menuOpen && (
          <div style={{
            position: 'absolute', top: '42px', right: 0,
            background: 'var(--card)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            border: '1px solid var(--border)',
            minWidth: '180px',
            zIndex: 200,
            overflow: 'hidden',
          }}>
            {/* ユーザー名 */}
            <div style={{
              padding: '12px 16px',
              fontSize: '13px', fontWeight: '600', color: 'var(--text)',
              borderBottom: '1px solid var(--border)',
            }}>
              {user.user_metadata?.full_name ?? user.email}
            </div>

            {/* お気に入り女優 */}
            <button
              onClick={() => { router.push('/favorites'); setMenuOpen(false) }}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'none', border: 'none',
                textAlign: 'left', fontSize: '14px', fontWeight: '500',
                color: 'var(--text)', cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
              }}
            >
              💖 お気に入り女優
            </button>

            {/* お気に入り作品（今後実装） */}
            <button
              disabled
              style={{
                width: '100%', padding: '12px 16px',
                background: 'none', border: 'none',
                textAlign: 'left', fontSize: '14px', fontWeight: '500',
                color: 'var(--subtext)', cursor: 'not-allowed',
                borderBottom: '1px solid var(--border)',
              }}
            >
              🎬 お気に入り作品
            </button>

            {/* お気に入りタグ（今後実装） */}
            <button
              disabled
              style={{
                width: '100%', padding: '12px 16px',
                background: 'none', border: 'none',
                textAlign: 'left', fontSize: '14px', fontWeight: '500',
                color: 'var(--subtext)', cursor: 'not-allowed',
                borderBottom: '1px solid var(--border)',
              }}
            >
              🏷️ お気に入りタグ
            </button>

            {/* ログアウト */}
            <button
              onClick={signOut}
              style={{
                width: '100%', padding: '12px 16px',
                background: 'none', border: 'none',
                textAlign: 'left', fontSize: '14px', fontWeight: '500',
                color: '#FF3B30', cursor: 'pointer',
              }}
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      style={{
        background: '#fff',
        border: '1.5px solid #ddd',
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#444',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <span style={{ fontSize: '14px' }}>
        <span style={{ color: '#4285F4' }}>G</span>
        <span style={{ color: '#EA4335' }}>o</span>
        <span style={{ color: '#FBBC05' }}>o</span>
        <span style={{ color: '#4285F4' }}>g</span>
        <span style={{ color: '#34A853' }}>l</span>
        <span style={{ color: '#EA4335' }}>e</span>
      </span>
      でログイン
    </button>
  )
}