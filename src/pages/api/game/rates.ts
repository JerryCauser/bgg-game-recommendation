import type { NextApiRequest, NextApiResponse } from 'next'
import type { GameRates } from 'src/libs/game'
import { getOneGameRates } from 'src/libs/game'

interface ResponseData {
  statusCode: number
  payload?: GameRates
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
    const rates = await getOneGameRates(bggId)

    res.status(200).json({
      statusCode: 200,
      payload: rates
    })
  } catch (error) {
    console.error(error)
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
