import { NextApiRequest, NextApiResponse } from 'next'
import type { GameItem } from 'src/server/external-api/games'
import { auth } from 'src/server/auth'
import db from 'src/server/db'
import { GameRates } from 'src/server/external-api/game-rates'
import { FilledGame, getFilledGames } from 'src/server/api-methods/games/everything'

export type GetterFunction = () => Promise<any>

class Cache <T = any> {
  data: T | null = null

  #retrieving: Promise<T> | null = null

  getter?: GetterFunction
  constructor (getter?: GetterFunction) {
    if (getter !== undefined) {
      this.getter = getter

      this.get().catch(console.error)
    }
  }

  async get (): Promise<T | null> {
    if (this.data !== null) return this.data

    if (this.getter !== undefined) {
      if (this.#retrieving !== null) {
        return await this.#retrieving
      }

      this.#retrieving = this.getter()
      const result = await this.#retrieving
      this.#retrieving = null
      this.set(result)

      return result
    }

    return null
  }

  async update (): Promise<T | null> {
    this.clear()

    return await this.get()
  }

  set (data: any): void {
    this.data = data
  }

  clear (): void {
    this.data = null
  }
}

export const ALL_GAMES_CACHE = new Cache<GameItem[]>()
export const RATING_CACHE = new Cache<GameRates[]>()

export const EVERYTHING_CACHE = new Cache<FilledGame[]>(getFilledGames)

export async function clearCacheMethod (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  auth(req, res).throw()

  ALL_GAMES_CACHE.clear()
  RATING_CACHE.clear()
  EVERYTHING_CACHE.clear()
}
