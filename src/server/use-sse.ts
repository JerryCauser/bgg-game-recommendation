import type { NextApiResponse } from 'next'

type SendChunkFunction = (data: any, eventName?: string) => void
type EndFunction = () => void

function useSSE (res: NextApiResponse, onClose = () => {}, { pingInterval = 30 * 1000 } = {}): [SendChunkFunction, EndFunction] {
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Content-Encoding', 'none')
  res.flushHeaders() // flush the headers to establish SSE with client

  const sendChunk: SendChunkFunction = (data, eventName) => {
    let chunk = `data: ${JSON.stringify(data)}\n\n`

    if (typeof eventName === 'string') {
      chunk = `event: ${eventName}\n${chunk}`
    }

    res.write(chunk)
  }

  const end: EndFunction = () => res.end()

  let intervalId: NodeJS.Timer

  if (pingInterval > 0) {
    intervalId = setInterval(() => sendChunk('1', 'ping'), pingInterval)

    sendChunk('1', 'ping')
  }

  res.on('close', () => {
    if (pingInterval > 0) clearInterval(intervalId)
    onClose()
    res.end()
  })

  return [sendChunk, end]
}

export default useSSE
