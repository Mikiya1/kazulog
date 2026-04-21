import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://video.dmm.co.jp/av/ranking/?term=monthly&type=actress', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ja,en;q=0.9',
    },
  })

  const html = await res.text()
  // 最初の3000文字だけ返す
  return NextResponse.json({ 
    status: res.status,
    preview: html.slice(0, 3000),
  })
}
