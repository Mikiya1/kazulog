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
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '0 0 48px' }}>

        {/* ヒーローカード */}
        <div style={{ padding: '24px 20px 16px' }}>
          <div style={{
            background: 'var(--card)',
            borderRadius: '24px',
            padding: '32px 24px',
            boxShadow: 'var(--shadow-card)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '180px', height: '180px',
              background: 'linear-gradient(135deg, #FD297B22, #FF655B11)',
              borderRadius: '50%',
            }} />
            <div style={{
              position: 'absolute', bottom: '-20px', left: '-20px',
              width: '100px', height: '100px',
              background: 'linear-gradient(135deg, #FF655B11, #FD297B22)',
              borderRadius: '50%',
            }} />

            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'linear-gradient(135deg, #FD297B15, #FF655B10)',
                border: '1px solid #FD297B33',
                borderRadius: '20px', padding: '4px 12px', marginBottom: '16px',
              }}>
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#FD297B', letterSpacing: '0.5px' }}>✨ AI診断</span>
              </div>

              <div style={{ fontSize: '26px', fontWeight: '800', lineHeight: 1.3, marginBottom: '8px', color: 'var(--text)' }}>
                スワイプして<br />好みを見つけよう
              </div>
              <div style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px', lineHeight: 1.6 }}>
                3タップで見つかる、あなただけの一本
              </div>
              <button
                onClick={() => router.push('/swipe')}
                style={{
                  background: 'var(--gradient)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50px',
                  padding: '16px 36px',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: 'var(--shadow-btn)',
                }}
              >
                診断スタート <span style={{ fontSize: '18px' }}>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* 人気女優 */}
        <div style={{ padding: '8px 0 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--subtext)', padding: '0 20px 12px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
            人気女優
          </div>
          <div style={{ display: 'flex', gap: '14px', padding: '0 20px', overflowX: 'auto' }}>
            {popularActresses.map(a => (
              <div key={a.name} style={{ flexShrink: 0, width: '72px', textAlign: 'center' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FD297B22, #FF655B33)',
                  boxShadow: '0 0 0 2px #FD297B44',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '26px', margin: '0 auto 8px',
                }}>
                  {a.emoji}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text)', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                <div style={{
                  fontSize: '10px', marginTop: '2px', fontWeight: '600',
                  background: 'var(--gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                } as React.CSSProperties}>{a.cup}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 使い方 */}
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--subtext)', marginBottom: '14px', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>使い方</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { step: '01', text: '女優をスワイプして好みを選ぶ', icon: '💖' },
              { step: '02', text: 'AIがあなたの好みを分析', icon: '🤖' },
              { step: '03', text: 'ぴったりの作品が見つかる', icon: '🎬' },
            ].map(item => (
              <div key={item.step} style={{
                background: 'var(--card)',
                borderRadius: '16px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}>
                <div style={{ fontSize: '24px', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontWeight: '700', color: '#FD297B', marginBottom: '2px', letterSpacing: '0.5px' }}>STEP {item.step}</div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)' }}>{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </>
  )
}