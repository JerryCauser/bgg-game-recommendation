
interface FulfilledType {
  status: 'fulfilled'
  value: any
}

interface RejectedType {
  status: 'rejected'
  reason: any
}

declare type FixedPromiseSettledResult = FulfilledType | RejectedType
