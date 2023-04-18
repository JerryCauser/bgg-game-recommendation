
const _cache = new Map()
setInterval(() => _cache.clear(), 24 * 60 * 60 * 1000)

export async function getJSON (url: string, options?: Record<string, any>): Promise<any> {
  const cachedRes = _cache.get(url)

  if (cachedRes !== undefined) return cachedRes

  options ??= {}
  options.method = 'GET'

  const res = await fetch(url, options).then(async res => await res.json())

  _cache.set(url, res)

  return res
}

export async function getText (url: string, options?: Record<string, any>): Promise<string> {
  const cachedRes = _cache.get(url)

  if (cachedRes !== undefined) return cachedRes

  options ??= {}
  options.method = 'GET'

  const res = await fetch(url, options).then(async res => await res.text())

  _cache.set(url, res)

  return res
}
