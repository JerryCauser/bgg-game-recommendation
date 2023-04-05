import { getJSON, getText } from './fetch'
import { BEST_RATIO, NOT_RECOMMEND_RATIO, RECOMMEND_RATIO } from './constants'
import {
  createError,
  project,
  groupByField,
  squash,
  makeArray,
  calcRate,
  omitUnviable as omitUnviableFunction
} from './helpers'

interface Options {
  votersThreshold?: number
  omitUnviable?: boolean
}

export interface GameRates {
  number: string
  best: number
  recommended: number
  not_recommended: number
  rate: number
  bggId: number
}

export interface GameMeta {
  bggId: number
  rating: number
  voteCount: number
  image: string
  url: string | null
  slug: string | null
  name: string
  description: string
}

export async function getOneGameRates (bggId: number | unknown, options?: Options): Promise<GameRates> {
  if (typeof bggId !== 'number') throw createError('no_bggId_provided')

  const votersThreshold = options?.votersThreshold ?? 20
  const omitUnviable = options?.omitUnviable ?? false

  const pollInfo = await getJSON(`https://boardgamegeek.com/geekitempoll.php?action=view&itempolltype=numplayers&objectid=${bggId}&objecttype=thing`, {
    method: 'GET',
    headers: {
      accept: 'application/json'
    }
  })

  const pollId: string | null = pollInfo.poll?.pollid ?? pollInfo.pollquestions?.[0]?.pollid ?? null

  if (pollId === null) throw createError('no_poll', bggId)

  const pollData = await getJSON(`https://boardgamegeek.com/geekpoll.php?action=results&pollid=${pollId}`, {
    method: 'GET',
    headers: { accept: 'application/json' }
  })

  const { question, results, voters } = pollData.pollquestions[0].results
  const { choicesc: choicesColumns, choicesr: choicesRows } = question

  const votersNumber = parseInt(voters, 10)

  if (isNaN(votersNumber) || votersNumber < votersThreshold) {
    throw createError('voters_number_too_low_for_adequate_calculations', bggId)
  }

  const cCSet: Map<string, any> = choicesColumns
    .reduce((acc: Map<string, any>, n: any) => acc.set(n.choiceid, n), new Map())
  const cRSet: Map<string, any> = choicesRows
    .reduce((acc: Map<string, any>, n: any) => acc.set(n.choiceid, n), new Map())

  let poll = results.filter((r: any) => cCSet.has(r.choiceidcolumn) && cRSet.has(r.choiceidrow))

  poll = project(poll, { percent: 1, columnbody: 'name', rowbody: 'number' })
  poll = groupByField(poll, 'number')

  for (const [number, data] of Object.entries(poll)) {
    poll[number] = squash(data as any[], { name: 'percent' })
  }

  poll = makeArray(poll, 'number')
  poll = calcRate(poll, { best: BEST_RATIO, recommended: RECOMMEND_RATIO, not_recommended: NOT_RECOMMEND_RATIO })
  // poll = squeezePercents(poll, 'rate')
  if (omitUnviable) {
    poll = omitUnviableFunction(poll, 'rate', 50)
  }

  for (const el of poll) {
    el.bggId = bggId
  }

  return poll as GameRates
}

export async function getGameMetaInfo (bggId: number | unknown): Promise<GameMeta> {
  if (typeof bggId !== 'number') throw createError('no_bggId_provided')

  const html = await getText(`https://boardgamegeek.com/boardgame/${bggId}`)

  const schemaParsed = html.match(/<script type="application\/ld\+json">([\s\S]+)<\/script>/im)

  if (typeof schemaParsed?.[1] !== 'string') throw createError('unexpected_parsing_result')

  const schema = JSON.parse(schemaParsed[1].trim())

  const rating = parseFloat(schema.aggregateRating.ratingValue)
  const voteCount = parseFloat(schema.aggregateRating.reviewCount)
  const image = schema.image
  const name = schema.name
  const description = schema.description

  const urlMatch = html.match(/<meta\s+property="og:url"\s+content="(.+?)"\s+\/>/im)

  const url = urlMatch === null ? null : urlMatch[1]
  const slug = typeof url === 'string'
    ? url.split(',').at(-1) ?? null
    : null

  return {
    bggId,
    name,
    description,
    url,
    slug,
    image,
    rating,
    voteCount
  }
}
