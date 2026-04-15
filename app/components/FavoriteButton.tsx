'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Props = {
  actressId: string
  actressName: string
  actressImage: string
}

export default function FavoriteButton({ actressId, actressName, actressImage }: Props) {
  const [isFavorite, setIsFavorite] = useState(false)
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('actress_id', actressId)
      .single()
      .then(({ data }) => {
        setIsFavorite(!!data)
      })
  }, [user, actressId])

  const toggle = async () => {
    if (!user) {
      alert('お気に入りにはGoogleログインが必要です')
      return
    }
    setLoading(true)
    if (isFavorite) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('actress_id', actressId)
      setIsFavorite(false)
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, actress_id: actressId, actress_name: actressName, actress_image: actressImage })
      setIsFavorite(true)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        background: isFavorite ? 'var(--gradient)' : 'var(--card)',
        border: isFavorite ? 'none' : '1.5px solid var(--border)',
        borderRadius: '50px',
        padding: '8px 18px',
        fontSize: '13px',
        fontWeight: '700',
        color: isFavorite ? '#fff' : 'var(--subtext)',
        cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: isFavorite ? 'var(--shadow-btn)' : '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
      }}
    >
      {isFavorite ? '💖 お気に入り済み' : '🤍 お気に入り追加'}
    </button>
  )
}