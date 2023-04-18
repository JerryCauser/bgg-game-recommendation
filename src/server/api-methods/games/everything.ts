import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameItem } from 'src/server/external-api/games'
import db from 'src/server/db'
import { EVERYTHING_CACHE } from 'src/server/api-methods/games/_cache'
import { GameRates } from 'src/server/external-api/game-rates'

interface ResponseData {
  statusCode: number
  payload?: FilledGame[]
  error?: any
}

export async function handler (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  try {
    const ids = typeof req.query.bggIds === 'string'
      ? req.query.bggIds.split(',').map(s => parseInt(s, 10)).filter(Boolean)
      : []

    const query: any = {}

    const retrieveAll = ids.length === 0

    if (!retrieveAll) query.bggId = { $in: ids }

    console.time('everything')

    let gameList: FilledGame[]

    if (retrieveAll) {
      gameList = await EVERYTHING_CACHE.get() ?? []
    } else {
      gameList = await getFilledGames(query)
    }
    console.timeEnd('everything')

    res.status(200).json({
      statusCode: 200,
      payload: gameList
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}

export type FilledGame = Pick<GameItem, 'bggId' | 'name' | 'image' | 'imageSmall' | 'url' | 'avgScore' | 'score'>
& { polls: Pick<GameRates, 'bggId' | 'number' | 'rate'> }

export async function getFilledGames (query?: any): Promise<FilledGame[]> {
  const { collections } = await db

  query ??= {}

  const gameList = (
    await collections.games.aggregate([
      { $match: query },
      { $sort: { bggId: 1 } },
      {
        $lookup: {
          from: 'polls',
          localField: 'bggId',
          foreignField: 'bggId',
          as: 'polls',
          pipeline: [{ $project: { bggId: 1, number: 1, rate: 1, type: 1 } }]
        }
      },
      { $project: { _id: 0, bggId: 1, polls: 1, name: 1, image: 1, imageSmall: 1, url: 1, avgScore: 1, score: 1 } }
    ]).toArray() ?? []
  ) as FilledGame[]

  return gameList
}
