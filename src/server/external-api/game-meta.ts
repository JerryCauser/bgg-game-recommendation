import type { GameItem } from 'src/server/external-api/games'
import { getText } from './fetch'
import { createError } from 'src/libs/helpers'

export type GameMeta = GameItem & {
  maxPlayTime: number
  minPlayTime: number
  avgPlayTime: number
  weight: number
}

export async function getGameMetaInfo (bggId: number | unknown): Promise<GameMeta> {
  if (typeof bggId !== 'number') throw createError('no_bggId_provided')

  const html = await getText(`https://boardgamegeek.com/boardgame/${bggId}`)

  const beginWith = '.geekitemPreload ='
  const rawJson = html.slice(
    html.indexOf(beginWith) + beginWith.length,
    html.indexOf('GEEK.geekitemSettings')
  ).trim().slice(0, -1)

  const json: Record<any, any> = JSON.parse(rawJson)

  let rank: number | null = parseInt(json.item.rankinfo[0]?.rank ?? '0', 10)
  if (rank === 0) rank = null

  const meta: GameMeta = {
    maxPlayTime: parseInt(json.item.maxplaytime, 10),
    minPlayTime: parseInt(json.item.minplaytime, 10),
    avgPlayTime: Math.round((parseInt(json.item.maxplaytime, 10) + parseInt(json.item.minplaytime, 10)) / 2),
    weight: parseFloat(json.item.polls.boardgameweight.averageweight),
    image: json.item.imageurl,
    bggId: parseInt(json.item.objectid, 10),
    score: parseFloat(json.item.stats.average),
    avgScore: parseFloat(json.item.stats.baverage),
    votersNumber: parseInt(json.item.stats.usersrated, 10),
    year: parseInt(json.item.yearpublished, 10),
    description: json.item.short_description,
    name: json.item.name,
    imageSmall: json.item.images.micro,
    rank,
    url: `https://boardgamegeek.com${json.item.href as string}`,
    slug: json.item.href.split('/').pop()
  }

  return meta
}
