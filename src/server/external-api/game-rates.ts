import {
  createError,
  project,
  groupByField,
  squash,
  makeArray,
  calcRate,
  omitUnviable as omitUnviableFunction
} from 'src/libs/helpers'
import { getJSON } from './fetch'
import { BEST_RATIO, NOT_RECOMMEND_RATIO, RECOMMEND_RATIO } from 'src/server/constants'

interface Options {
  votersThreshold?: number
  omitUnviable?: boolean
}

export interface GameRates {
  bggId: number
  number?: number // quantity of players
  best: number
  recommended: number
  not_recommended: number
  rate: number
  votersNumber: number
}

export async function getOneGameRates (bggId: number | unknown, options?: Options): Promise<GameRates[]> {
  if (typeof bggId !== 'number') throw createError('no_bggId_provided')

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

  if (omitUnviable) {
    poll = omitUnviableFunction(poll, 'rate', 50)
  }

  for (const el of poll) {
    el.number = parseInt(el.number, 10)
    el.bggId = bggId
    el.votersNumber = isNaN(votersNumber) ? 0 : votersNumber
  }

  return poll
}
