'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'

type Actress = {
  id: string
  name: string
  imageUrl: string
  tags: string[]
}

const FEATURED_ACTRESSES: Actress[] = [
  { id: '1044864', name: '河北彩伽', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kawakita_saika.jpg', tags: ['Eカップ', '169cm'] },
  { id: '1088602', name: '逢沢みゆ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/aizawa_miyu.jpg', tags: [] },
  { id: '1092427', name: '北岡果林', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kitaoka_karin.jpg', tags: [] },
  { id: '1099472', name: '瀬戸環奈', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/seto_kanna.jpg', tags: [] },
  { id: '1065724', name: '乙アリス', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/otu_arisu.jpg', tags: [] },
  { id: '1044099', name: '美園和花', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/misono_waka.jpg', tags: ['Gカップ'] },
  { id: '1054998', name: '松本いちか', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/matumoto_itika.jpg', tags: ['Cカップ', '153cm'] },
  { id: '1076785', name: '神木麗', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kamiki_rei.jpg', tags: ['Gカップ', '169cm'] },
  { id: '1099813', name: '花守夏歩', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/hanamori_kaho.jpg', tags: [] },
  { id: '1068671', name: '北野未奈', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kitano_mina.jpg', tags: ['Hカップ'] },
  { id: '1042129', name: '七沢みあ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/nanasawa_mia.jpg', tags: ['Cカップ', '145cm'] },
  { id: '1069697', name: 'MINAMO', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/minamo.jpg', tags: [] },
  { id: '26225',   name: '波多野結衣', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/hatano_yui.jpg', tags: ['Eカップ', '163cm'] },
  { id: '1085754', name: '九井スナオ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kokonoi_sunao.jpg', tags: [] },
  { id: '1055590', name: '青空ひかり', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/aozora_hikari.jpg', tags: ['Dカップ', '153cm'] },
  { id: '1084337', name: '羽月乃蒼', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/haruna_noa.jpg', tags: [] },
  { id: '1075302', name: '柏木こなつ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kasiwagi_konatu.jpg', tags: ['Fカップ', '155cm'] },
  { id: '1069702', name: '天馬ゆい', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/tenma_yui.jpg', tags: ['Cカップ', '162cm'] },
  { id: '1046723', name: '皆月ひかる', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/minazuki_hikaru.jpg', tags: ['Bカップ', '148cm'] },
  { id: '1064154', name: '月野かすみ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/tukino_kasumi.jpg', tags: ['Hカップ', '151cm'] },
  { id: '1062074', name: '宮島めい', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/miyazima_mei.jpg', tags: [] },
  { id: '1041897', name: '神宮寺ナオ', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/zinguuzi_nao.jpg', tags: ['Dカップ', '160cm'] },
  { id: '1027558', name: '美咲かんな', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/misaki_kanna.jpg', tags: ['Eカップ', '158cm'] },
  { id: '1092800', name: '松井日奈子', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/matui_hinako.jpg', tags: [] },
  { id: '1067267', name: '楪カレン', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/yuzuriha_karen.jpg', tags: ['Hカップ', '148cm'] },
  { id: '1078618', name: '尾崎えりか', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/ozaki_erika.jpg', tags: [] },
  { id: '1043753', name: '倉木しおり', imageUrl: 'https://pics.dmm.co.jp/mono/actjpgs/kuraki_siori.jpg', tags: [] },
]

export default function SwipePage() {
  const router = useRouter()
  const [cards, setCards] = useState<Actress[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [likedItems, setLikedItems] = useState<Actress[]>([])
  const [animating, setAnimating] = useState<'left' | 'right' | 'up' | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const isDragging = useRef(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    setCards(FEATURED_ACTRESSES)
    setLoading(false)
  }, [])

  const current = cards[index]
  const next = cards[index + 1]
  const nextNext = cards[index + 2]

  const handleSwipe = (dir: 'left' | 'right' | 'up') => {
    if (animating) return
    setDragOffset({ x: 0, y: 0 })
    setAnimating(dir)
    const liked = dir === 'right' || dir === 'up'
    if (liked && current) setLikedItems(prev => [...prev, current])

    setTimeout(() => {
      setAnimating(null)
      if (index + 1 >= cards.length) setDone(true)
      else setIndex(prev => prev + 1)
    }, 320)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (animating) return
    const t = e.touches[0]
    dragStart.current = { x: t.clientX, y: t.clientY }
    isDragging.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || !dragStart.current || animating) return
    const t = e.touches[0]
    setDragOffset({
      x: t.clientX - dragStart.current.x,
      y: t.clientY - dragStart.current.y,
    })
  }

  const onTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const { x, y } = dragOffset
    if (x > 80) handleSwipe('right')
    else if (x < -80) handleSwipe('left')
    else if (y < -80) handleSwipe('up')
    else setDragOffset({ x: 0, y: 0 })
    dragStart.current = null
  }

  const onMouseDown = (e: React.MouseEvent) => {
    if (animating) return
    dragStart.current = { x: e.clientX, y: e.clientY }
    isDragging.current = true
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !dragStart.current || animating) return
    setDragOffset({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    })
  }

  const onMouseUp = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const { x, y } = dragOffset
    if (x > 80) handleSwipe('right')
    else if (x < -80) handleSwipe('left')
    else if (y < -80) handleSwipe('up')
    else setDragOffset({ x: 0, y: 0 })
    dragStart.current = null
  }

  const getCardTransform = () => {
    if (animating === 'right') return 'translateX(130%) rotate(20deg)'
    if (animating === 'left') return 'translateX(-130%) rotate(-20deg)'
    if (animating === 'up') return 'translateY(-130%) rotate(5deg)'
    if (isDragging.current || dragOffset.x !== 0 || dragOffset.y !== 0) {
      return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.08}deg)`
    }
    return 'none'
  }

  const showLike = animating === 'right' || dragOffset.x > 40
  const showNope = animating === 'left' || dragOffset.x < -40
  const showSuper = animating === 'up' || dragOffset.y < -40

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '40px' }}>🔥</div>
          <div style={{ fontSize: '16px', color: 'var(--subtext)', fontWeight: '600' }}>読み込み中...</div>
        </main>
      </>
    )
  }

  if (done) {
    return (
      <>
        <Header />
        <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '24px', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px' }}>🎉</div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text)', textAlign: 'center' }}>診断完了！</h2>
          <p style={{ fontSize: '14px', color: 'var(--subtext)', textAlign: 'center' }}>あなたの好みが分かりました</p>
          <div style={{ background: 'var(--card)', borderRadius: '20px', padding: '20px', width: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>気になった女優</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {likedItems.map(item => (
                <span key={item.id} style={{
                  background: 'linear-gradient(135deg, #FD297B15, #FF655B10)',
                  color: '#FD297B', fontSize: '13px', padding: '6px 14px',
                  borderRadius: '20px', fontWeight: '600', border: '1px solid #FD297B33',
                }}>{item.name}</span>
              ))}
            </div>
          </div>
          <button
            onClick={() => {
              const ids = likedItems.map(i => i.id)
              const names = likedItems.map(i => i.name)
              router.push(`/recommend?ids=${ids.join(',')}&names=${names.join(',')}`)
            }}
            style={{ background: 'var(--gradient)', color: '#fff', border: 'none', borderRadius: '50px', padding: '18px', fontSize: '17px', fontWeight: '700', width: '100%', boxShadow: 'var(--shadow-btn)' }}
          >
            おすすめを見る 💖
          </button>
          <button
            onClick={() => { setIndex(0); setLikedItems([]); setDone(false) }}
            style={{ background: 'var(--card)', color: 'var(--subtext)', border: '1.5px solid var(--border)', borderRadius: '50px', padding: '16px', fontSize: '15px', fontWeight: '600', width: '100%' }}
          >
            もう一度やり直す
          </button>
        </main>
      </>
    )
  }

  if (!current) return null

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 20px 32px', maxWidth: '480px', margin: '0 auto' }}>

        <div style={{ width: '100%', display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {cards.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              backgroundImage: i <= index ? 'linear-gradient(135deg, #FD297B, #FF655B)' : 'none',
              backgroundColor: i <= index ? undefined : 'var(--border)',
            }} />
          ))}
        </div>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>残り {cards.length - index} 人</span>
          <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>{index + 1} / {cards.length}</span>
        </div>

        <div style={{ width: '100%', position: 'relative', height: '460px', marginBottom: '28px' }}>
          {nextNext && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: '24px', transform: 'scale(0.90) translateY(16px)', zIndex: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }} />
          )}
          {next && (
            <div style={{ position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: '24px', transform: 'scale(0.95) translateY(8px)', zIndex: 1, boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }} />
          )}

          <div
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
              position: 'absolute', inset: 0, background: 'var(--card)', borderRadius: '24px',
              overflow: 'hidden', zIndex: 2,
              transform: getCardTransform(),
              transition: animating ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
              boxShadow: 'var(--shadow-card)', cursor: 'grab', userSelect: 'none',
            }}
          >
            <div style={{ height: '320px', position: 'relative', overflow: 'hidden', pointerEvents: 'none' }}>
              {current.imageUrl ? (
                <Image
                  src={current.imageUrl}
                  alt={current.name}
                  fill
                  style={{ objectFit: 'contain', objectPosition: 'center', background: '#f8f0f4' }}
                  unoptimized
                />
              ) : (
                <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FD297B22, #FF655B33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px' }}>👩</div>
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

              {showLike && (
                <div style={{ position: 'absolute', top: '32px', left: '24px', border: '3px solid #4CD964', borderRadius: '8px', padding: '6px 16px', transform: 'rotate(-15deg)', color: '#4CD964', fontSize: '28px', fontWeight: '800', letterSpacing: '2px', opacity: Math.min(1, Math.abs(dragOffset.x) / 80) }}>LIKE</div>
              )}
              {showNope && (
                <div style={{ position: 'absolute', top: '32px', right: '24px', border: '3px solid #FF3B30', borderRadius: '8px', padding: '6px 16px', transform: 'rotate(15deg)', color: '#FF3B30', fontSize: '28px', fontWeight: '800', letterSpacing: '2px', opacity: Math.min(1, Math.abs(dragOffset.x) / 80) }}>NOPE</div>
              )}
              {showSuper && (
                <div style={{ position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', border: '3px solid #34E0FE', borderRadius: '8px', padding: '6px 20px', color: '#34E0FE', fontSize: '26px', fontWeight: '800', letterSpacing: '2px', whiteSpace: 'nowrap', opacity: Math.min(1, Math.abs(dragOffset.y) / 80) }}>SUPER LIKE</div>
              )}
            </div>

            <div style={{ padding: '18px 20px 20px', pointerEvents: 'none' }}>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginBottom: '8px' }}>
                {current.name}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {current.tags.map(tag => (
                  <span key={tag} style={{ background: '#F5F6FA', color: '#666', fontSize: '12px', padding: '5px 12px', borderRadius: '20px', fontWeight: '500', border: '1px solid var(--border)' }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => handleSwipe('left')} style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'var(--card)', border: '1.5px solid var(--border)', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>✕</button>
          <button onClick={() => handleSwipe('up')} style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--card)', border: '1.5px solid #34E0FE44', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(52,224,254,0.2)', color: '#34E0FE' }}>⭐</button>
          <button onClick={() => handleSwipe('right')} style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--gradient)', border: 'none', fontSize: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-btn)' }}>💖</button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--subtext)', fontWeight: '500' }}>
          ✕ NOPE　　⭐ SUPER LIKE　　💖 LIKE
        </div>

      </main>
    </>
  )
}