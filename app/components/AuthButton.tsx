'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type User = {
  id: string
  email?: string
  user_metadata?: { full_name?: string; avatar_url?: string }
}

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (loading) return null

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {user.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url}
            alt="avatar"
            style={{ width: '28px', height: '28px', borderRadius: '50%' }}
          />
        )}
        <button
          onClick={signOut}
          style={{
            background: 'none',
            border: '1.5px solid var(--border)',
            borderRadius: '20px',
            padding: '4px 12px',
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--subtext)',
            cursor: 'pointer',
          }}
        >
          ログアウト
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={signInWithGoogle}
      style={{
        background: 'var(--gradient)',
        border: 'none',
        borderRadius: '20px',
        padding: '6px 14px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#fff',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-btn)',
      }}
    >
      Googleでログイン
    </button>
  )
}