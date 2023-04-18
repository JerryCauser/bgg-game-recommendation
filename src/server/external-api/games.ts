import { getText } from './fetch'

export interface GameBasics {
  name: string
  url: string
  bggId: number
  slug?: string
  year?: number | null
  description?: string | null
}

export interface GameItem extends GameBasics {
  imageSmall: string
  image?: string
  rank: number | null
  score: number | null
  avgScore: number | null
  votersNumber: number | null
}

async function getPage (rank = 100): Promise<string> {
  return await getText(`https://boardgamegeek.com/browse/boardgame?sort=rank&rankobjecttype=subtype&rankobjectid=1&rank=${rank}`)
}

export async function * getItemsByRank (from = 0, to = 5000, as?: AbortSignal): AsyncGenerator<GameItem> {
  for (let i = 0; i < to; i += 100) {
    if (as?.aborted === true) break

    const parsedPage = parsePage(await getPage(i + 100))

    for (const item of parsedPage) {
      yield item
    }
  }
}

function parsePage (html: string): GameItem[] {
  return html
    .split('</tr>')
    .slice(1, -1)
    .map(
      (n: string) => n.trim()
        .split('</td>')
        .slice(0, -2)
    )
    .map((item: string[]) => parseItem(item))
    .filter(Boolean) as GameItem[]
}

function parseItem (item: string[]): GameItem | null {
  if (item.length === 0) return null
  const [trPlace, trImage, trMeta, trScore, trAvgScore, trVotersNumber] = item

  if (trMeta === undefined) return null

  const rank = parsePlace(trPlace)
  const imageSmall = parseImage(trImage)
  const score = parseScore(trScore)
  const avgScore = parseScore(trAvgScore)
  const votersNumber = parseScore(trVotersNumber)
  const meta = parseMeta(trMeta)

  return {
    imageSmall,
    rank,
    score,
    avgScore,
    votersNumber,
    ...meta
  }
}

function parsePlace (trPlace: string): number | null {
  const place = parseFloat(trPlace.match(/name=['"](.+?)['"]/im)?.[1] ?? '')

  return place > 0 ? place : null
}

function parseMeta (trMeta: string): GameBasics {
  const name = trMeta.match(/>(.+?)<\/a>/im)?.[1].trim() ?? ''
  const year = parseInt(trMeta.match(/>\((.+?)\)<\/span>/im)?.[1] ?? '', 10)
  const description = trMeta.match(/<p[\s\S]+?>([\s\S]+)<\/p>/im)?.[1].trim() ?? ''
  const url = trMeta.match(/href=['"](.+?)['"]/im)?.[1] ?? ''
  const bggId = parseInt(url.split('/')[2], 10)
  const slug = url.split('/')[3]

  return {
    name,
    slug,
    url: 'https://boardgamegeek.com' + url,
    bggId,
    year,
    description
  }
}

function parseImage (trImage: string): string {
  const imgUrl = trImage.match(/src=['"](.+?)['"]/im)?.[1] ?? ''

  return imgUrl
}
function parseScore (trScore: string): number | null {
  const score = parseFloat(trScore.match(/>\s*?([.\d]+)/im)?.[1] ?? '')

  return score > 0 ? score : null
}
