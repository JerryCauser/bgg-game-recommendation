
export function createError <T> (msg: string, ctx?: T): Error & T {
  return Object.assign(new Error(msg), ctx)
}

export function makeDict (arr: Array<Record<string, any>>, idField: string): Record<string, any> {
  const dict: Record<string, any> = {}

  for (const el of arr) {
    dict[el[idField]] = el
  }

  return dict
}

export function groupByField (arr: any[], field: string): Record<string, any[]> {
  const res: any = {}

  for (const el of arr) {
    const val = el[field]
    if (res[val] === undefined) res[val] = []

    res[val].push(el)
  }

  return res
}

export function project (arr: any[], fields: Record<string, string | any>): any[] {
  fields ??= {}

  return arr.map(n => {
    const r: any = {}

    for (const [field, as] of Object.entries(fields)) {
      if (typeof as === 'string') {
        r[as] = n[field]
      } else {
        r[field] = n[field]
      }
    }

    return r
  })
}

export function squash (arr: any[], fields: Record<string, string>): Record<string, any> {
  const res: Record<string, any> = {}

  for (const el of arr) {
    for (const [keyField, valueField] of Object.entries(fields)) {
      if (el[keyField] === undefined || el[valueField] === undefined) continue

      const key = el[keyField]
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')

      res[key] = el[valueField]
    }
  }

  return res
}

export function makeArray (dict: Record<string, any>, idFieldName?: string): any[] {
  const res: any[] = []

  for (let [id, list] of Object.entries(dict)) {
    const isArr = Array.isArray(list)

    if (!isArr) list = [list]

    if (typeof idFieldName === 'string') {
      for (const el of list) {
        el[idFieldName] = id
      }
    }

    res.push(isArr ? list : list[0])
  }

  return res
}

export function calcRate (arr: any[], fields: Record<string, number>): Array<{ rate: number } & any> {
  for (const el of arr) {
    let resultRate = 0

    for (const [field, rate] of Object.entries(fields)) {
      resultRate += el[field] * rate
    }

    el.rate = resultRate
  }

  return arr
}

export function omitUnviable (arr: any[], targetField: string, threshold: number = 0): any[] {
  return arr.filter(el => el[targetField] >= threshold)
}

export function squeezePercents (arr: any[], targetField: string, minimalMaximum = Number.MIN_SAFE_INTEGER, maximalMinimum = Number.MAX_SAFE_INTEGER): any[] {
  let max = minimalMaximum
  let min = maximalMinimum

  const result = []

  for (const el of arr) {
    if (el[targetField] > max) max = el[targetField]
    else if (el[targetField] < min) min = el[targetField]
  }

  max -= min

  for (const el of arr) {
    result.push({ ...el, [targetField]: 100 * ((el[targetField] - min) / max) })
  }

  return result
}
