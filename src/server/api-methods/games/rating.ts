import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameRates } from 'src/server/external-api/game-rates'
import db from 'src/server/db'
import { RATING_CACHE } from 'src/server/api-methods/games/_cache'

interface ResponseData {
  statusCode: number
  payload?: GameRates[]
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

    console.time('rating')

    let rateList: GameRates[]

    if (retrieveAll && RATING_CACHE.data !== null) {
      rateList = RATING_CACHE.data
    } else {
      if (retrieveAll) { // TODO make one endpoint with lookup
        const gameIds = (
          await collections.games.aggregate([
            { $match: query },
            { $sort: { bggId: 1 } },
            { $limit: 1000 },
            { $project: { bggId: 1 } }
          ]).toArray() ?? []
        ).map(r => r.bggId) as number[]

        query.bggId = { $in: gameIds }
      }

      rateList = (
        await collections.polls.aggregate([
          { $match: query },
          { $sort: { rate: -1 } }
        ]).toArray() ?? []
      ) as GameRates[]

      if (retrieveAll) {
        RATING_CACHE.set(rateList)
      }
    }

    console.timeEnd('rating')

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=172800, stale-while-revalidate=1209600, immutable'
    )

    res.status(200).json({
      statusCode: 200,
      payload: rateList
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
