import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameMeta } from 'src/libs/game'
import { getGameMetaInfo } from 'src/libs/game'

interface ResponseData {
  statusCode: number
  payload?: GameMeta
  error?: any
}

export default async function handler (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  try {
    const bggId = typeof req.query.bggId === 'string'
      ? parseInt(req.query.bggId, 10)
      : undefined
    const meta = await getGameMetaInfo(bggId)

    res.status(200).json({
      statusCode: 200,
      payload: meta
    })
  } catch (error) {
    console.error(error)
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
