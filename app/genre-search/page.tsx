'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Header from '../components/Header'
import { supabase } from '../lib/supabase'
import { getWorksByGenreId, getWorksByActressIdsAndGenreIds } from '../lib/db'

type Favorite = {
  actress_id: string
  actress_name: string
  actress_image: string
}

type Work = {
  content_id: string
  title: string
  affiliateURL: string
  imageURL: { large: string; small: string }
  prices?: { price: string }
  date?: string
  iteminfo?: {
    genre?: { id: number; name: string }[]
    actress?: { id: number; name: string }[]
  }
  volume?: string
}

const POPULAR_GENRES: { category: string; genres: { id: string; name: string }[] }[] = [
  {
    category: '体型・外見',
    genres: [
      { id: '2001', name: '巨乳' },
      { id: '6149', name: '超乳' },
      { id: '102', name: '美乳' },
      { id: '2005', name: '貧乳・微乳' },
      { id: '2006', name: 'スレンダー' },
      { id: '2007', name: 'ぽっちゃり' },
      { id: '2008', name: 'ミニ系' },
      { id: '2024', name: '巨尻' },
      { id: '4008', name: '脚フェチ' },
      { id: '1027', name: '美少女' },
      { id: '2003', name: '小柄' },
      { id: '2002', name: '長身' },
      { id: '2004', name: 'めがね' },
      { id: '4019', name: 'パイパン' },
    ],
  },
  {
    category: 'キャラクター',
    genres: [
      { id: '4024', name: '素人' },
      { id: '1039', name: '人妻・主婦' },
      { id: '1014', name: '熟女' },
      { id: '1031', name: '痴女' },
      { id: '1034', name: 'ギャル' },
      { id: '4118', name: 'アイドル・芸能人' },
      { id: '1001', name: 'OL' },
      { id: '1013', name: '看護婦・ナース' },
      { id: '1016', name: '女教師' },
      { id: '1022', name: '家庭教師' },
      { id: '1033', name: 'お姉さん' },
      { id: '4057', name: '姉・妹' },
      { id: '1032', name: 'お母さん' },
      { id: '524', name: '義母' },
      { id: '4056', name: '人妻' },
      { id: '1019', name: '女子大生' },
      { id: '1025', name: '未亡人' },
      { id: '1008', name: 'メイド' },
      { id: '6967', name: 'M女' },
    ],
  },
  {
    category: 'プレイ',
    genres: [
      { id: '5001', name: '中出し' },
      { id: '5016', name: '潮吹き' },
      { id: '5023', name: '顔射' },
      { id: '5002', name: 'フェラ' },
      { id: '5068', name: 'イラマチオ' },
      { id: '5019', name: 'パイズリ' },
      { id: '38', name: 'クンニ' },
      { id: '6002', name: 'ハメ撮り' },
      { id: '5008', name: 'オナニー' },
      { id: '5017', name: 'おもちゃ' },
      { id: '4001', name: 'SM' },
      { id: '25', name: '拘束' },
      { id: '567', name: '鬼畜' },
      { id: '4030', name: '淫乱・ハード系' },
      { id: '5025', name: '淫語' },
      { id: '4059', name: 'キス・接吻' },
      { id: '5063', name: '主観' },
      { id: '5005', name: 'アナル' },
    ],
  },
  {
    category: '体位・行為',
    genres: [
      { id: '4106', name: '騎乗位' },
      { id: '6958', name: 'バック' },
      { id: '5067', name: '顔面騎乗' },
      { id: '5020', name: 'シックスナイン' },
      { id: '5022', name: '3P・4P' },
      { id: '4005', name: '乱交' },
      { id: '5071', name: 'ハーレム' },
      { id: '4111', name: '寝取り・NTR' },
      { id: '6970', name: 'スワッピング' },
    ],
  },
  {
    category: 'シチュエーション',
    genres: [
      { id: '4007', name: '企画' },
      { id: '4025', name: '単体作品' },
      { id: '4021', name: '盗撮・のぞき' },
      { id: '1069', name: '不倫' },
      { id: '4031', name: 'コスプレ' },
      { id: '553', name: '学園もの' },
      { id: '4002', name: '近親相姦' },
      { id: '55', name: '処女' },
      { id: '28', name: '羞恥' },
      { id: '4119', name: 'エステ' },
      { id: '6937', name: 'ヘルス・ソープ' },
      { id: '4124', name: 'マッサージ・リフレ' },
      { id: '4140', name: '温泉' },
      { id: '4026', name: 'カーセックス' },
      { id: '5010', name: '監禁' },
    ],
  },
  {
    category: 'コスチューム',
    genres: [
      { id: '3008', name: '水着' },
      { id: '3001', name: '体操着・ブルマ' },
      { id: '48', name: '制服' },
      { id: '3011', name: '学生服' },
      { id: '3009', name: '競泳・スクール水着' },
      { id: '1008', name: 'メイド' },
      { id: '3007', name: 'ミニスカ' },
      { id: '3006', name: 'パンスト・タイツ' },
      { id: '3033', name: 'バニーガール' },
      { id: '3015', name: 'ボンテージ' },
      { id: '3014', name: 'ランジェリー' },
      { id: '3021', name: '和服・浴衣' },
    ],
  },
]


const OTHER_GENRES = [
  { id: '6179', name: '4時間以上作品' },
  { id: '558', name: 'BL（ボーイズラブ）' },
  { id: '5074', name: 'M男' },
  { id: '6934', name: 'おじいちゃん' },
  { id: '6947', name: 'おばあちゃん' },
  { id: '528', name: 'お姫様' },
  { id: '527', name: 'お嬢様・令嬢' },
  { id: '6969', name: 'お風呂' },
  { id: '5069', name: 'くすぐり' },
  { id: '5009', name: 'ごっくん' },
  { id: '59', name: 'ふたなり' },
  { id: '5003', name: 'ぶっかけ' },
  { id: '4076', name: 'アクション' },
  { id: '514', name: 'アクション・格闘' },
  { id: '6968', name: 'アクメ・オーガズム' },
  { id: '2011', name: 'アジア女優' },
  { id: '6965', name: 'アスリート' },
  { id: '5076', name: 'アナルセックス' },
  { id: '4073', name: 'アニメ' },
  { id: '4122', name: 'イタズラ' },
  { id: '1004', name: 'インストラクター' },
  { id: '1040', name: 'ウェイトレス' },
  { id: '6954', name: 'オタク' },
  { id: '6938', name: 'オナサポ' },
  { id: '4123', name: 'カップル' },
  { id: '1036', name: 'キャバ嬢・風俗嬢' },
  { id: '1005', name: 'キャンギャル' },
  { id: '5007', name: 'クスコ' },
  { id: '1041', name: 'コンパニオン' },
  { id: '4058', name: 'ショタ' },
  { id: '4018', name: 'スカトロ' },
  { id: '1007', name: 'スチュワーデス' },
  { id: '6940', name: 'スパンキング' },
  { id: '4096', name: 'スポーツ' },
  { id: '568', name: 'ダーク系' },
  { id: '6959', name: 'チアガール' },
  { id: '3005', name: 'チャイナドレス' },
  { id: '2019', name: 'ツンデレ' },
  { id: '6941', name: 'ディルド' },
  { id: '5073', name: 'デカチン・巨根' },
  { id: '6956', name: 'デート' },
  { id: '4006', name: 'ナンパ' },
  { id: '4015', name: 'ニューハーフ' },
  { id: '94', name: 'ニーソックス' },
  { id: '64', name: 'ネコミミ・獣系' },
  { id: '6964', name: 'ノーパン' },
  { id: '6972', name: 'ノーブラ' },
  { id: '5006', name: 'バイブ' },
  { id: '1012', name: 'バスガイド' },
  { id: '4016', name: 'パンチラ' },
  { id: '6939', name: 'ビジネススーツ' },
  { id: '6164', name: 'ビッチ' },
  { id: '17', name: 'ファンタジー' },
  { id: '4139', name: 'ファン感謝・訪問' },
  { id: '88', name: 'フィスト' },
  { id: '18', name: 'ホラー' },
  { id: '3013', name: 'ボディコン' },
  { id: '6108', name: 'ポルチオ' },
  { id: '6960', name: 'ママ友' },
  { id: '1009', name: 'モデル' },
  { id: '6933', name: 'ヨガ' },
  { id: '569', name: 'ラブコメ' },
  { id: '4040', name: 'レズ' },
  { id: '5062', name: 'レズキス' },
  { id: '4013', name: 'レズビアン' },
  { id: '1011', name: 'レースクイーン' },
  { id: '5057', name: 'ローション・オイル' },
  { id: '5018', name: 'ローター' },
  { id: '6943', name: '叔母さん' },
  { id: '6942', name: '受付嬢' },
  { id: '6945', name: '女上司' },
  { id: '1015', name: '女医' },
  { id: '1017', name: '女子アナ' },
  { id: '1018', name: '女子校生' },
  { id: '35', name: '女性向け' },
  { id: '1082', name: '女戦士' },
  { id: '2022', name: '女捜査官' },
  { id: '6944', name: '女王様' },
  { id: '3036', name: '女装・男の娘' },
  { id: '4028', name: '妄想' },
  { id: '1029', name: '妊婦' },
  { id: '96', name: '孕ませ' },
  { id: '4011', name: '尻フェチ' },
  { id: '4017', name: '局部アップ' },
  { id: '4009', name: '巨乳フェチ' },
  { id: '63', name: '巫女' },
  { id: '1083', name: '幼なじみ' },
  { id: '95', name: '性転換・女体化' },
  { id: '555', name: '恋愛' },
  { id: '5004', name: '手コキ' },
  { id: '5059', name: '拷問' },
  { id: '5053', name: '指マン' },
  { id: '5011', name: '放尿・お漏らし' },
  { id: '2023', name: '日焼け' },
  { id: '5070', name: '時間停止' },
  { id: '1021', name: '格闘家' },
  { id: '5060', name: '母乳' },
  { id: '5075', name: '汗だく' },
  { id: '5014', name: '浣腸' },
  { id: '6948', name: '男の潮吹き' },
  { id: '72', name: '異物挿入' },
  { id: '2012', name: '白人女優' },
  { id: '4116', name: '着エロ' },
  { id: '1023', name: '秘書' },
  { id: '97', name: '筋肉' },
  { id: '5021', name: '縛り・緊縛' },
  { id: '1026', name: '職業色々' },
  { id: '6974', name: '花嫁' },
  { id: '1020', name: '若妻・幼妻' },
  { id: '6953', name: '蝋燭' },
  { id: '93', name: '裸エプロン' },
  { id: '62', name: '触手' },
  { id: '5048', name: '足コキ' },
  { id: '6935', name: '軟体' },
  { id: '27', name: '辱め' },
  { id: '4120', name: '逆ナン' },
  { id: '4020', name: '野外・露出' },
  { id: '5066', name: '電マ' },
  { id: '6936', name: '面接' },
  { id: '5012', name: '飲尿' },
  { id: '1086', name: '魔法少女' },
  { id: '1028', name: '黒人男優' },
]
const GENRE_NAME_MAP: Record<string, string> = Object.fromEntries(
  [...POPULAR_GENRES.flatMap(cat => cat.genres), ...OTHER_GENRES].map(g => [g.id, g.name])
)

const PER_PAGE = 20

export default function GenreSearchPage() {
  const router = useRouter()
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [selectedActresses, setSelectedActresses] = useState<string[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [works, setWorks] = useState<Work[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [partialResults, setPartialResults] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'date' | 'rank'>('date')
  const [genreOffset, setGenreOffset] = useState(1)
  const [genreTotal, setGenreTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [primaryGenreId, setPrimaryGenreId] = useState('')
  const [isGenreOnlySearch, setIsGenreOnlySearch] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [showOtherGenres, setShowOtherGenres] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  // ソート変更時に再検索
  useEffect(() => {
    if (searched && !loading) {
      search()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOrder])

  const fetchGenrePage = async (page: number) => {
    if (!isGenreOnlySearch) return
    setLoading(true)
    setWorks([])
    const offset = (page - 1) * PER_PAGE
    const { works: items } = await getWorksByGenreId(primaryGenreId, sortOrder, PER_PAGE, offset)
    const filtered = selectedGenres.length > 1
      ? items.filter(w => {
          const workGenreIds = w.genres.map(g => g.id)
          return selectedGenres.every(gId => workGenreIds.includes(gId))
        })
      : items
    const convertedWorks = filtered.map(w => ({
      content_id: w.id,
      title: w.title,
      affiliateURL: w.affiliate_url,
      imageURL: { large: w.image_large, small: w.image_small },
      date: w.date ?? '',
      volume: w.volume ? String(w.volume) : undefined,
      iteminfo: {
        actress: w.actresses.map(a => ({ id: Number(a.id), name: a.name })),
        genre: w.genres.map(g => ({ id: Number(g.id), name: g.name })),
      },
    })) as Work[]
    setWorks(convertedWorks)
    setLoading(false)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const loadMoreGenreWorks = async () => {
    if (loadingMore || genreOffset > genreTotal) return
    setLoadingMore(true)
    const res = await fetch(`/api/dmm?hits=20&sort=${sortOrder}&offset=${genreOffset}&genre=${primaryGenreId}`)
    const data = await res.json()
    const items: Work[] = data.result?.items ?? []
    const filtered = selectedGenres.length > 1
      ? items.filter((w: Work) => {
          const workGenreIds = (w.iteminfo?.genre ?? []).map((g: { id: number }) => String(g.id))
          return selectedGenres.every(gId => workGenreIds.includes(gId))
        })
      : items
    setWorks(prev => [...prev, ...filtered])
    setGenreOffset(prev => prev + 20)
    setLoadingMore(false)
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (!u) return
      supabase
        .from('favorites')
        .select('actress_id, actress_name, actress_image')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setFavorites(data ?? [])
        })
    })
  }, [])

  const toggleActress = (id: string) => {
    setSelectedActresses(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const search = async () => {
    if (selectedGenres.length === 0) {
      alert('ジャンルを1つ以上選んでください')
      return
    }
    setLoading(true)
    setSearched(true)
    setWorks([])
    setCurrentPage(1)
    setIsGenreOnlySearch(false)
    setGenreTotal(0)
    setGenreOffset(1)

    const selectedFavorites = favorites.filter(f => selectedActresses.includes(f.actress_id))
    const genreIds = selectedGenres.join(',')

    if (selectedFavorites.length === 0) {
      // Supabaseからジャンル検索
      const primaryGenre = selectedGenres[0]
      const { works: items, total } = await getWorksByGenreId(primaryGenre, sortOrder, PER_PAGE, 0)

      // 複数ジャンル選択時はフロントでANDフィルタ
      const filtered = selectedGenres.length > 1
        ? items.filter(w => {
            const workGenreIds = w.genres.map(g => g.id)
            return selectedGenres.every(gId => workGenreIds.includes(gId))
          })
        : items

      const convertedWorks = filtered.map(w => ({
        content_id: w.id,
        title: w.title,
        affiliateURL: w.affiliate_url,
        imageURL: { large: w.image_large, small: w.image_small },
        date: w.date ?? '',
        volume: w.volume ? String(w.volume) : undefined,
        iteminfo: {
          actress: w.actresses.map(a => ({ id: Number(a.id), name: a.name })),
          genre: w.genres.map(g => ({ id: Number(g.id), name: g.name })),
        },
      })) as Work[]

      setWorks(convertedWorks)
      setGenreOffset(PER_PAGE)
      setGenreTotal(total)
      setPrimaryGenreId(primaryGenre)
      setIsGenreOnlySearch(true)
      setLoading(false)
      return
    }

    // 女優×ジャンルをSupabaseでAND検索
    const actressIds = selectedFavorites.map(f => f.actress_id)
    const { works: filtered, total } = await getWorksByActressIdsAndGenreIds(
      actressIds,
      selectedGenres,
      sortOrder,
      PER_PAGE,
      (currentPage - 1) * PER_PAGE
    )

    const convertedWorks = filtered.map(w => ({
      content_id: w.id,
      title: w.title,
      affiliateURL: w.affiliate_url,
      imageURL: { large: w.image_large, small: w.image_small },
      date: w.date ?? '',
      volume: w.volume ? String(w.volume) : undefined,
      iteminfo: {
        actress: w.actresses.map(a => ({ id: Number(a.id), name: a.name })),
        genre: w.genres.map(g => ({ id: Number(g.id), name: g.name })),
      },
    })) as Work[]

    setPartialResults([])
    setWorks(convertedWorks)
    setGenreTotal(total)
    setLoading(false)
  }

  const sortedWorks = isGenreOnlySearch
    ? works // ジャンルのみ検索時はAPIソート済みなのでそのまま
    : [...works].sort((a, b) => {
        if (sortOrder === 'date') {
          return new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
        }
        return 0
      })
  const isActressGenreSearch = selectedActresses.length > 0 && selectedGenres.length > 0
  const totalPages = (isGenreOnlySearch || isActressGenreSearch)
    ? Math.ceil(genreTotal / PER_PAGE)
    : Math.ceil(sortedWorks.length / PER_PAGE)
  const pagedWorks = (isGenreOnlySearch || isActressGenreSearch)
    ? sortedWorks // 既に今のページ分だけ取得済み
    : sortedWorks.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE)

  return (
    <>
      <Header />
      <main style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--text)', maxWidth: '480px', margin: '0 auto', padding: '24px 20px 48px' }}>

        <h2 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '6px' }}>ジャンル検索 🔍</h2>
        <p style={{ fontSize: '13px', color: 'var(--subtext)', marginBottom: '24px' }}>ジャンルを選んで好みの作品を探そう</p>

        {user && favorites.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
              💖 お気に入り女優で絞り込む（任意）
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {favorites.map(fav => (
                <button
                  key={fav.actress_id}
                  onClick={() => toggleActress(fav.actress_id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 12px', borderRadius: '50px',
                    border: selectedActresses.includes(fav.actress_id) ? 'none' : '1.5px solid var(--border)',
                    background: selectedActresses.includes(fav.actress_id) ? 'var(--gradient)' : 'var(--card)',
                    color: selectedActresses.includes(fav.actress_id) ? '#fff' : 'var(--text)',
                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    boxShadow: selectedActresses.includes(fav.actress_id) ? 'var(--shadow-btn)' : '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  {fav.actress_image && (
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={fav.actress_image} alt={fav.actress_name} width={20} height={20} style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                  )}
                  {fav.actress_name}
                </button>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <div style={{
            background: 'linear-gradient(135deg, #FD297B10, #FF655B08)',
            border: '1px solid #FD297B22', borderRadius: '12px',
            padding: '12px 16px', fontSize: '13px', color: '#FD297B',
            fontWeight: '500', marginBottom: '24px',
          }}>
            💖 ログインするとお気に入り女優で絞り込めます
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)', marginBottom: '12px' }}>
            🏷️ ジャンルを選ぶ
          </div>
          {POPULAR_GENRES.map(cat => {
            const ROWS = 2
            const PER_ROW = 4
            const PREVIEW = ROWS * PER_ROW
            const isExpanded = expandedCategories.has(cat.category)
            const visibleGenres = isExpanded ? cat.genres : cat.genres.slice(0, PREVIEW)
            const hasMore = cat.genres.length > PREVIEW
            return (
              <div key={cat.category} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: 'var(--subtext)', fontWeight: '600', letterSpacing: '0.5px', marginBottom: '8px', textTransform: 'uppercase' }}>
                  {cat.category}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {visibleGenres.map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => toggleGenre(genre.id)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        background: selectedGenres.includes(genre.id) ? '#FD297B' : 'var(--card)',
                        color: selectedGenres.includes(genre.id) ? '#fff' : 'var(--text)',
                        border: selectedGenres.includes(genre.id) ? 'none' : '1.5px solid var(--border)',
                        boxShadow: selectedGenres.includes(genre.id) ? '0 4px 12px rgba(253,41,123,0.3)' : '0 2px 6px rgba(0,0,0,0.06)',
                      }}
                    >
                      {genre.name}
                    </button>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => toggleCategory(cat.category)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        background: 'transparent',
                        color: '#FD297B',
                        border: '1.5px dashed #FD297B88',
                        boxShadow: 'none',
                      }}
                    >
                      {isExpanded ? '閉じる ▲' : `もっと見る +${cat.genres.length - PREVIEW}`}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* その他（五十音順・折り畳み） */}
          <div style={{ marginBottom: '16px' }}>
            <button
              onClick={() => setShowOtherGenres(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                marginBottom: showOtherGenres ? '8px' : '0',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--subtext)', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                その他（五十音順）
              </div>
              <div style={{ fontSize: '11px', color: '#FD297B', fontWeight: '700' }}>
                {showOtherGenres ? '▲ 閉じる' : `▼ 全${OTHER_GENRES.length}件`}
              </div>
            </button>
            {showOtherGenres && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {OTHER_GENRES.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                      background: selectedGenres.includes(genre.id) ? '#FD297B' : 'var(--card)',
                      color: selectedGenres.includes(genre.id) ? '#fff' : 'var(--text)',
                      border: selectedGenres.includes(genre.id) ? 'none' : '1.5px solid var(--border)',
                      boxShadow: selectedGenres.includes(genre.id) ? '0 4px 12px rgba(253,41,123,0.3)' : '0 2px 6px rgba(0,0,0,0.06)',
                    }}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 選択中ジャンル表示 */}
        {selectedGenres.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--subtext)', fontWeight: '600', marginBottom: '8px' }}>
              選択中のジャンル
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedGenres.map(gId => (
                <div
                  key={gId}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 10px 5px 14px', borderRadius: '20px',
                    background: '#FD297B', color: '#fff',
                    fontSize: '13px', fontWeight: '600',
                  }}
                >
                  {GENRE_NAME_MAP[gId] ?? gId}
                  <button
                    onClick={() => toggleGenre(gId)}
                    style={{
                      background: 'rgba(255,255,255,0.3)', border: 'none',
                      borderRadius: '50%', width: '18px', height: '18px',
                      cursor: 'pointer', color: '#fff', fontSize: '11px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {selectedGenres.length > 1 && (
                <button
                  onClick={() => setSelectedGenres([])}
                  style={{
                    padding: '5px 14px', borderRadius: '20px',
                    background: 'transparent', color: 'var(--subtext)',
                    border: '1.5px solid var(--border)', fontSize: '12px',
                    fontWeight: '600', cursor: 'pointer',
                  }}
                >
                  全て解除
                </button>
              )}
            </div>
          </div>
        )}

        <button
          onClick={search}
          disabled={loading || selectedGenres.length === 0}
          style={{
            width: '100%', background: selectedGenres.length > 0 ? 'var(--gradient)' : 'var(--border)',
            color: '#fff', border: 'none', borderRadius: '50px',
            padding: '18px', fontSize: '17px', fontWeight: '700',
            cursor: selectedGenres.length > 0 ? 'pointer' : 'not-allowed',
            boxShadow: selectedGenres.length > 0 ? 'var(--shadow-btn)' : 'none',
            marginBottom: '32px',
          }}
        >
          {loading ? '検索中...' : 'この条件で検索 🔍'}
        </button>

        {searched && !loading && (
          <>
            <div ref={resultsRef} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text)' }}>
                検索結果 {works.length}件　{works.length > 0 && <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--subtext)' }}>（{currentPage}/{totalPages}ページ）</span>}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => { if (sortOrder !== 'date') { setSortOrder('date'); setCurrentPage(1) } }}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: sortOrder === 'date' ? '#FD297B' : 'var(--card)',
                    color: sortOrder === 'date' ? '#fff' : 'var(--subtext)',
                    border: sortOrder === 'date' ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  発売日順
                </button>
                <button
                  onClick={() => { if (sortOrder !== 'rank') { setSortOrder('rank'); setCurrentPage(1) } }}
                  style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                    background: sortOrder === 'rank' ? '#FD297B' : 'var(--card)',
                    color: sortOrder === 'rank' ? '#fff' : 'var(--subtext)',
                    border: sortOrder === 'rank' ? 'none' : '1.5px solid var(--border)',
                  }}
                >
                  売り上げ順
                </button>
              </div>
            </div>

            {partialResults.length > 0 && (
              <div style={{
                background: '#FFF3CD', border: '1px solid #FFEAA7',
                borderRadius: '12px', padding: '10px 14px',
                fontSize: '12px', color: '#856404', marginBottom: '16px',
              }}>
                ⚠️ {partialResults.join('・')} は作品数が多いため一部のみ表示しています
              </div>
            )}

            {works.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--subtext)' }}>
                条件に合う作品が見つかりませんでした
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                  {pagedWorks.map((work, i) => (
                    <div
                      key={work.content_id}
                      style={{
                        background: 'var(--card)', borderRadius: '20px', overflow: 'hidden',
                        boxShadow: i === 0 && currentPage === 1 ? '0 8px 32px rgba(253,41,123,0.15)' : '0 2px 12px rgba(0,0,0,0.06)',
                        border: i === 0 && currentPage === 1 ? '1.5px solid #FD297B44' : '1.5px solid transparent',
                        position: 'relative',
                      }}
                    >
                      {i === 0 && currentPage === 1 && (
                        <div style={{
                          position: 'absolute', top: '12px', left: '12px', zIndex: 2,
                          background: 'var(--gradient)', color: '#fff',
                          fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                          fontWeight: '700', boxShadow: 'var(--shadow-btn)',
                        }}>
                          {sortOrder === 'date' ? '🆕 LATEST' : '🏆 BEST SELLER'}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'stretch' }}>
                        <div style={{ width: '100px', minHeight: '130px', position: 'relative', flexShrink: 0 }}>
                          <Image
                            src={work.imageURL?.small ?? ''}
                            alt={work.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                        </div>
                        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: '700', lineHeight: 1.4, color: 'var(--text)', marginTop: i === 0 && currentPage === 1 ? '18px' : 0 }}>
                            {work.title.length > 40 ? work.title.slice(0, 40) + '...' : work.title}
                          </div>
                      {(work.iteminfo?.actress?.length ?? 0) > 0 && (
                        <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          👩 {work.iteminfo!.actress!.map(a => a.name).join(' / ')}
                        </div>
                      )}
                      {work.volume && (
                        <div style={{ fontSize: '11px', color: 'var(--subtext)', marginTop: '2px' }}>
                          🕐 {work.volume}分
                        </div>
                      )}
                          <button
                            onClick={() => window.open(work.affiliateURL, '_blank')}
                            style={{
                              marginTop: '10px', background: 'var(--gradient)',
                              color: '#fff', border: 'none', borderRadius: '20px',
                              padding: '7px 16px', fontSize: '12px', fontWeight: '700',
                              cursor: 'pointer', boxShadow: '0 4px 12px rgba(253,41,123,0.3)',
                            }}
                          >
                            作品を見る →
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <button
                      onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); isGenreOnlySearch ? fetchGenrePage(p) : search() }}
                      disabled={currentPage === 1}
                      style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', background: 'var(--card)', color: currentPage === 1 ? 'var(--border)' : 'var(--text)', border: '1.5px solid var(--border)' }}
                    >←</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc: (number | string)[], p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, i) => (
                        <button
                          key={i}
                          onClick={() => { if (typeof p === 'number') { setCurrentPage(p); isGenreOnlySearch ? fetchGenrePage(p) : search() } }}
                          style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: p === '...' ? 'default' : 'pointer', background: p === currentPage ? '#FD297B' : 'var(--card)', color: p === currentPage ? '#fff' : 'var(--text)', border: p === currentPage ? 'none' : '1.5px solid var(--border)' }}
                        >{p}</button>
                      ))
                    }
                    <button
                      onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); isGenreOnlySearch ? fetchGenrePage(p) : search() }}
                      disabled={currentPage === totalPages}
                      style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', background: 'var(--card)', color: currentPage === totalPages ? 'var(--border)' : 'var(--text)', border: '1.5px solid var(--border)' }}
                    >→</button>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '20px', padding: '0 12px', height: '34px', gap: '4px' }}>
                      <input
                        type='number'
                        min={1}
                        max={totalPages}
                        defaultValue={currentPage}
                        key={currentPage}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const v = parseInt((e.target as HTMLInputElement).value)
                            if (v >= 1 && v <= totalPages) { setCurrentPage(v); isGenreOnlySearch ? fetchGenrePage(v) : search() }
                          }
                        }}
                        style={{ width: '32px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: '700', color: 'var(--text)', textAlign: 'center', outline: 'none', padding: 0 }}
                      />
                      <span style={{ fontSize: '13px', color: 'var(--subtext)', fontWeight: '500' }}>/ {totalPages}</span>
                    </div>
                  </div>
                )}


              </>
            )}
          </>
        )}

      </main>
    </>
  )
}












