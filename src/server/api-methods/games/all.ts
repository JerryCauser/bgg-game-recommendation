import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameItem } from 'src/server/external-api/games'
import db from 'src/server/db'
import { ALL_GAMES_CACHE } from 'src/server/api-methods/games/_cache'

interface ResponseData {
  statusCode: number
  payload?: GameItem[]
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

    const { collections } = await db

    const query: any = {}

    const retrieveAll = ids.length === 0

    if (!retrieveAll) query.bggId = { $in: ids }

    console.time('all')

    let gameList: GameItem[]

    if (retrieveAll && ALL_GAMES_CACHE.data !== null) {
      gameList = ALL_GAMES_CACHE.data
    } else {
      gameList = (
        await collections.games.aggregate([
          { $match: query },
          { $sort: { bggId: 1 } }
          // { $limit: 1000 }
        ]).toArray() ?? []
      ) as GameItem[]

      if (retrieveAll) {
        ALL_GAMES_CACHE.set(gameList)
      }
    }
    console.timeEnd('all')

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=172800, stale-while-revalidate=1209600, immutable'
    )

    res.status(200).json({
      statusCode: 200,
      payload: gameList
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
