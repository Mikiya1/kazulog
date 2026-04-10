'use client'

import { useRouter } from 'next/navigation'
import Header from './components/Header'

const popularActresses = [
  { name: '桃乃木かな', emoji: '👩', cup: 'Eカップ' },
  { name: '三上悠亜',   emoji: '👱', cup: 'Cカップ' },
  { name: '明日花キラ', emoji: '🙍', cup: 'Iカップ' },
  { name: '天使もえ',   emoji: '👧', cup: 'Dカップ' },
  { name: '深田えいみ', emoji: '💁', cup: 'Gカップ' },
  { name: '本庄鈴',     emoji: '🧖', cup: 'Fカップ' },
]

export default function Home() {
  const router = useRouter()

  return (
    <>
      <Header />
      <main style={{ background: '#0F0F0F', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', maxWidth: '480px', margin: '0 auto', padding: '0 0 40px' }}>

        {/* ヒーロー */}
        <div style={{ padding: '24px 24px 24px' }}>
          <div style={{ background: '#1C1C1E', borderRadius: '20px', padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.15 }}>🔥</div>
            <div style={{ fontSize: '22px', fontWeight: '600', lineHeight: 1.4, marginBottom: '8px' }}>
              スワイプして<br />好みを教えて
            </div>
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
              3タップで見つかる、あなただけの一本
            </div>
            <button
              onClick={() => router.push('/swipe')}
              style={{ background: '#FF2D55', color: '#fff', border: 'none', borderRadius: '14px', padding: '14px 32px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              診断スタート <span style={{ fontSize: '18px' }}>→</span>
            </button>
          </div>
        </div>

        {/* 人気女優 */}
        <div>
          <div style={{ fontSize: '13px', color: '#666', padding: '0 24px 12px', fontWeight: '500', letterSpacing: '0.5px' }}>人気女優</div>
          <div style={{ display: 'flex', gap: '16px', padding: '0 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {popularActresses.map(a => (
              <div key={a.name} style={{ flexShrink: 0, width: '72px', textAlign: 'center' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#1C1C1E', border: '2px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', margin: '0 auto 6px' }}>
                  {a.emoji}
                </div>
                <div style={{ fontSize: '11px', color: '#ccc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <div style={{ fontSize: '10px', color: '#FF2D55', marginTop: '2px' }}>{a.cup}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使い方 */}
        <div style={{ padding: '32px 24px 0' }}>
          <div style={{ fontSize: '13px', color: '#666', marginBottom: '12px', fontWeight: '500' }}>使い方</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { step: '01', text: '女優をスワイプして好みを選ぶ' },
              { step: '02', text: 'AIがあなたの性癖を分析' },
              { step: '03', text: 'ぴったりの作品が見つかる' },
            ].map(item => (
              <div key={item.step} style={{ background: '#1C1C1E', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ color: '#FF2D55', fontSize: '13px', fontWeight: '700', minWidth: '24px' }}>{item.step}</div>
                <div style={{ fontSize: '14px', color: '#ccc' }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}