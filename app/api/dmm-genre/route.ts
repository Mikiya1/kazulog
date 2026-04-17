import { NextResponse } from 'next/server'

const API_ID = process.env.DMM_API_ID
const AFFILIATE_ID = process.env.DMM_AFFILIATE_ID

export async function GET() {
  const params = new URLSearchParams({
    api_id: API_ID!,
    affiliate_id: AFFILIATE_ID!,
    floor_id: '43',
    output: 'json',
  })

  const url = `https://api.dmm.com/affiliate/v3/GenreSearch?${params.toString()}`

  try {
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'API fetch failed' }, { status: 500 })
  }
}
