'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'

const works = [
  {
    id: 1, title: '清楚系美少女との蜜月', actress: '桃乃木かな', cup: 'Eカップ', tags: ['清楚系', 'スレンダー'],
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&h=300&fit=crop',
  },
  {
    id: 2, title: 'ギャルの誘惑〜夏の記憶〜', actress: '明日花キラ', cup: 'Iカップ', tags: ['ギャル', '巨乳'],
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&h=300&fit=crop',
  },
  {
    id: 3, title: 'アイドル卒業後の秘密', actress: '三上悠亜', cup: 'Cカップ', tags: ['アイドル', '美脚'],
    image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=300&h=300&fit=crop',
  },
  {
    id: 4, title: '憧れのお姉さんと過ごした夜', actress: '深田えいみ', cup: 'Gカップ', tags: ['巨乳', 'グラマー'],
    image: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=300&h=300&fit=crop',
  },
  {
    id: 5, title: '天然少女の初体験', actress: '天使もえ', cup: 'Dカップ', tags: ['ロリ', 'かわいい'],
    image: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=300&h=300&fit=crop',
  },
]

function RecommendContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tagsParam = searchParams.get('tags') ?? ''
  const likedTags = tagsParam ? tagsParam.split(',') : []

  const scored = works.map(work => ({
    ...work,
    score: work.tags.filter(t => likedTags.includes(t)).length,
  })).sort((a, b) => b.score - a.score)

  const reason = likedTags.length > 0
    ? `${[...new Set(likedTags)].slice(0, 3).join('・')}を多く選択したため`
    : 'あなたへのおすすめ作品です'

  return (
    <>
      <Header />
      <main style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', padding: '24px 20px', maxWidth: '480px', margin: '0 auto' }}>

        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>あなたへのおすすめ</h2>

        <div style={{ background: '#1C1C1E', borderRadius: '12px', padding: '10px 14px', fontSize: '13px', color: '#aaa', borderLeft: '3px solid #FF2D55', marginBottom: '24px' }}>
          💡 {reason}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
          {scored.map((work, i) => (
            <div key={work.id} style={{ background: '#1C1C1E', borderRadius: '16px', overflow: 'hidden', border: i === 0 ? '1px solid #FF2D55' : '1px solid transparent', position: 'relative' }}>
              {i === 0 && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 2, background: '#FF2D55', color: '#fff', fontSize: '10px', padding: '3px 10px', borderRadius: '6px', fontWeight: '600' }}>
                  BEST MATCH
                </div>
              )}
              <div style={{ display: 'flex', gap: '0', alignItems: 'stretch' }}>
                <div style={{ width: '100px', minHeight: '100px', position: 'relative', flexShrink: 0 }}>
                  <Image
                    src={work.image}
                    alt={work.title}
                    fill
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div style={{ flex: 1, padding: '14px', minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', lineHeight: 1.4 }}>{work.title}</div>
                  <div style={{ fontSize: '13px', color: '#FF2D55', marginTop: '4px' }}>{work.actress} / {work.cup}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {work.tags.map(tag => (
                      <span key={tag} style={{ fontSize: '11px', color: '#888', background: '#2a2a2a', padding: '3px 10px', borderRadius: '20px' }}>{tag}</span>
                    ))}
                  </div>
                  <button style={{ marginTop: '10px', background: '#FF2D55', color: '#fff', border: 'none', borderRadius: '8px', padding: '7px 16px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>
                    作品を見る →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/swipe')}
          style={{ width: '100%', background: 'transparent', color: '#888', border: '1px solid #333', borderRadius: '16px', padding: '14px', fontSize: '15px', cursor: 'pointer' }}
        >
          もう一度診断する
        </button>

      </main>
    </>
  )
}

export default function RecommendPage() {
  return (
    <Suspense>
      <RecommendContent />
    </Suspense>
  )
}