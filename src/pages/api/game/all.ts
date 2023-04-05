import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameMeta } from 'src/libs/game'
import { getGameMetaInfo } from 'src/libs/game'
import { makeDict } from 'src/libs/helpers'

interface ResponseData {
  statusCode: number
  payload?: GameMeta[] | Record<string, GameMeta>
  error?: any
}

export default async function handler (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  try {
    const ids = typeof req.query.bggIds === 'string'
      ? req.query.bggIds.split(',').map(s => parseInt(s, 10))
      : []

    const isDict = typeof req.query.dict === 'string'

    const promises = []

    for (const id of ids) {
      promises.push(getGameMetaInfo(id))
    }

    const games = (await Promise.allSettled(promises))
      .map(n => n.status === 'fulfilled' ? n.value : null)
      .filter(Boolean) as GameMeta[]

    res.status(200).json({
      statusCode: 200,
      payload: isDict ? makeDict(games, 'bggId') : games
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
