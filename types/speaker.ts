export type SpeakerStatus = 'pending' | 'active' | 'deleted'

export type Speaker = {
  email: string
  displayName: string
  passwordHash: string
  status: SpeakerStatus
  confirmToken?: string
  confirmTokenExpiry?: string // ISO 8601
}
