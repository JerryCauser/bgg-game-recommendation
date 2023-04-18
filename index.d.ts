
interface FulfilledType {
  status: 'fulfilled'
  value: any
  reason: undefined
}

interface RejectedType {
  status: 'rejected'
  value: undefined
  reason: any
}

declare type FixedPromiseSettledResult = FulfilledType | RejectedType
