'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

const STORY_DURATION = 5000 // 5秒

type Work = {
  id: string
  title: string
  affiliate_url: string
  image_large: string
  image_small: string
  volume: number | null
  date: string | null
}

export default function StoryPage() {
  const router = useRouter()
  const [params, setParams] = useState<{ ids: string[]; names: string[]; images: string[]; startIndex: number } | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [works, setWorks] = useState<Work[]>([])
  const [workLoading, setWorkLoading] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const ids = p.get('ids')?.split(',') ?? []
    const names = p.get('names')?.split(',').map(n => decodeURIComponent(n)) ?? []
    const images = p.get('images')?.split(',').map(i => decodeURIComponent(i)) ?? []
    const startIndex = parseInt(p.get('index') ?? '0')
    setParams({ ids, names, images, startIndex })
    setCurrentIdx(startIndex)
  }, [])

  useEffect(() => {
    if (!params) return
    loadWorks(params.ids[currentIdx])
  }, [currentIdx, params])

  const loadWorks = async (actressId: string) => {
    setWorkLoading(true)
    setWorks([])
    const { data } = await supabase.rpc('get_works_by_actress_for_story', {
      p_actress_id: actressId,
      p_limit: 5,
    })
    setWorks(data ?? [])
    setWorkLoading(false)
  }

  const goNext = useCallback(() => {
    if (!params) return
    if (currentIdx < params.ids.length - 1) {
      setCurrentIdx(prev => prev + 1)
      setProgress(0)
    } else {
      router.back()
    }
  }, [currentIdx, params, router])

  const goPrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(prev => prev - 1)
      setProgress(0)
    }
  }

  // プログレスバー
  useEffect(() => {
    if (paused || workLoading) return
    setProgress(0)
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          goNext()
          return 0
        }
        return prev + (100 / (STORY_DURATION / 50))
      })
    }, 50)
    return () => clearInterval(interval)
  }, [currentIdx, paused, workLoading, goNext])

  if (!params) return null

  const actress = {
    id: params.ids[currentIdx],
    name: params.names[currentIdx],
    image: params.images[currentIdx],
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000',
      maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column',
      zIndex: 1000,
    }}>
      {/* タイムバー */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 12px 8px', zIndex: 10 }}>
        {params.ids.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '2px', background: '#fff',
              width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%',
              transition: i === currentIdx ? 'none' : undefined,
            }} />
          </div>
        ))}
      </div>

      {/* 女優情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 12px', zIndex: 10 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0 }}>
          {actress.image ? (
            <Image src={actress.image} alt={actress.name} width={36} height={36} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
          ) : (
            <div style={{ width: '36px', height: '36px', background: '#333' }} />
          )}
        </div>
        <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{actress.name}</div>
        <button onClick={() => router.back()} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {/* 作品リスト */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
      >
        {workLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            読み込み中...
          </div>
        ) : works.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>
            作品が見つかりませんでした
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {works.map(w => (
              <div
                key={w.id}
                onClick={() => window.open(w.affiliate_url, '_blank')}
                style={{ display: 'flex', gap: '10px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', cursor: 'pointer' }}
              >
                <div style={{ width: '80px', height: '100px', position: 'relative', flexShrink: 0 }}>
                  <Image src={w.image_small || w.image_large} alt={w.title} fill style={{ objectFit: 'cover' }} unoptimized />
                </div>
                <div style={{ flex: 1, padding: '10px 10px 10px 0', minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#fff', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                    {w.title}
                  </div>
                  {w.volume && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>🕐 {w.volume}分</div>}
                  <div style={{ marginTop: '8px', display: 'inline-block', background: '#FD297B', color: '#fff', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', fontWeight: '700' }}>
                    作品を見る →
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => router.push(`/recommend?ids=${actress.id}&names=${actress.name}&images=${encodeURIComponent(actress.image)}`)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: '12px', padding: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', marginTop: '4px' }}
            >
              {actress.name}の作品をもっと見る →
            </button>
          </div>
        )}
      </div>

      {/* 左右タップエリア */}
      <div style={{ position: 'absolute', left: 0, top: '60px', bottom: 0, width: '30%' }} onClick={goPrev} />
      <div style={{ position: 'absolute', right: 0, top: '60px', bottom: 0, width: '30%' }} onClick={goNext} />
    </div>
  )
}
