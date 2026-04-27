'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '../lib/supabase'

const STORY_DURATION = 6000

type Work = {
  id: string
  title: string
  affiliate_url: string
  image_large: string
  image_small: string
  volume: number | null
  date: string | null
}

const SEEN_KEY = 'kazulog_story_seen'

const getSeenActresses = (): string[] => {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    const now = Date.now()
    // 1日経過したものは削除
    const filtered = data.filter((d: { id: string; ts: number }) => now - d.ts < 86400000)
    localStorage.setItem(SEEN_KEY, JSON.stringify(filtered))
    return filtered.map((d: { id: string }) => d.id)
  } catch { return [] }
}

const markAsSeen = (actressId: string) => {
  try {
    const seen = getSeenActresses()
    if (seen.includes(actressId)) return
    const raw = localStorage.getItem(SEEN_KEY)
    const data = raw ? JSON.parse(raw) : []
    data.push({ id: actressId, ts: Date.now() })
    localStorage.setItem(SEEN_KEY, JSON.stringify(data))
  } catch {}
}

export default function StoryPage() {
  const router = useRouter()
  const [params, setParams] = useState<{ ids: string[]; names: string[]; images: string[] } | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [work, setWork] = useState<Work | null>(null)
  const [workLoading, setWorkLoading] = useState(false)
  const [paused, setPaused] = useState(false)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const allIds = p.get('ids')?.split(',') ?? []
    const allNames = p.get('names')?.split(',').map(n => decodeURIComponent(n)) ?? []
    const allImages = p.get('images')?.split(',').map(i => decodeURIComponent(i)) ?? []
    const startIndex = parseInt(p.get('index') ?? '0')

    // 未表示の女優だけに絞る（開始位置の女優は必ず含める）
    const seen = getSeenActresses()
    const filteredIds: string[] = []
    const filteredNames: string[] = []
    const filteredImages: string[] = []

    // 開始位置の女優を先頭に
    filteredIds.push(allIds[startIndex])
    filteredNames.push(allNames[startIndex])
    filteredImages.push(allImages[startIndex])

    // 残りを未表示順に追加
    allIds.forEach((id, i) => {
      if (i !== startIndex && !seen.includes(id)) {
        filteredIds.push(id)
        filteredNames.push(allNames[i])
        filteredImages.push(allImages[i])
      }
    })

    setParams({ ids: filteredIds, names: filteredNames, images: filteredImages })
    setCurrentIdx(0)
  }, [])

  useEffect(() => {
    if (!params) return
    loadWork(params.ids[currentIdx])
    markAsSeen(params.ids[currentIdx])
  }, [currentIdx, params])

  const loadWork = async (actressId: string) => {
    setWorkLoading(true)
    setWork(null)
    const { data } = await supabase.rpc('get_works_by_actress_for_story', {
      p_actress_id: actressId,
      p_limit: 1,
    })
    setWork(data?.[0] ?? null)
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

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    setPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false)
    if (touchStartY.current === null) return
    const diff = e.changedTouches[0].clientY - touchStartY.current
    if (diff > 80) router.back()
    touchStartY.current = null
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}月${d.getDate()}日発売`
  }

  if (!params) return null

  const actress = {
    id: params.ids[currentIdx],
    name: params.names[currentIdx],
    image: params.images[currentIdx],
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: '#111', maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', zIndex: 1000 }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* タイムバー */}
      <div style={{ display: 'flex', gap: '4px', padding: '12px 12px 8px' }}>
        {params.ids.map((_, i) => (
          <div key={i} style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '2px', background: '#fff', width: i < currentIdx ? '100%' : i === currentIdx ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      {/* 女優情報 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 12px 12px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #fff', flexShrink: 0 }}>
          {actress.image ? (
            <Image src={actress.image} alt={actress.name} width={36} height={36} style={{ objectFit: 'cover', objectPosition: 'top' }} unoptimized />
          ) : (
            <div style={{ width: '36px', height: '36px', background: '#333' }} />
          )}
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: '700', fontSize: '14px' }}>{actress.name.split('（')[0]}</div>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '11px' }}>最新単体作品</div>
        </div>
        <button onClick={() => router.back()} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
      </div>

      {/* 作品 */}
      <div style={{ flex: 1, padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {workLoading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>読み込み中...</div>
        ) : !work ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>単体作品が見つかりませんでした</div>
        ) : (
          <>
            {/* サムネイル */}
            <div
              onClick={() => window.open(work.affiliate_url, '_blank')}
              style={{ position: 'relative', width: '100%', aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', flexShrink: 0, maxHeight: '340px' }}
            >
              <Image src={work.image_large || work.image_small} alt={work.title} fill style={{ objectFit: 'cover' }} unoptimized />
            </div>

            {/* 作品情報 */}
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '16px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', lineHeight: 1.5, marginBottom: '8px' }}>
                {work.title}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                {work.date && <span>📅 {formatDate(work.date)}</span>}
                {work.volume && <span style={{ marginLeft: '10px' }}>🕐 {work.volume}分</span>}
              </div>
              <button
                onClick={() => window.open(work.affiliate_url, '_blank')}
                style={{ width: '100%', background: '#FD297B', color: '#fff', border: 'none', borderRadius: '50px', padding: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
              >
                作品を見る →
              </button>
            </div>

            <button
              onClick={() => router.push(`/recommend?ids=${actress.id}&names=${actress.name}&images=${encodeURIComponent(actress.image)}`)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '50px', padding: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
            >
              {actress.name.split('（')[0]}の作品を全部見る
            </button>
          </>
        )}
      </div>

      {/* 左右タップ */}
      <div style={{ position: 'absolute', left: 0, top: '60px', bottom: 0, width: '30%' }} onClick={goPrev} />
      <div style={{ position: 'absolute', right: 0, top: '60px', bottom: 0, width: '30%' }} onClick={goNext} />
    </div>
  )
}
