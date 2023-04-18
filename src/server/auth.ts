import { NextApiRequest, NextApiResponse } from 'next'

export class LazyError extends Error {
  throw (): void {
    // eslint-disable-next-line no-throw-literal
    throw this
  }
}

export const SUCCESS_PLACEHOLDER = {
  throw () {}
}

export const auth = (req: NextApiRequest, res: NextApiResponse): typeof SUCCESS_PLACEHOLDER => {
  if (req.headers.authorization !== (`Token ${process.env.ADMIN_SECRET as string}`)) {
    res.status(403).json({ statusCode: 403 })

    return new LazyError('Access Denied 403')
  }

  return SUCCESS_PLACEHOLDER
}
