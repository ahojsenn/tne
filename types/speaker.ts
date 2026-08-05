export type SpeakerStatus = 'pending' | 'active'

export type Speaker = {
  email: string
  displayName: string
  passwordHash: string
  status: SpeakerStatus
  confirmToken?: string
  confirmTokenExpiry?: string // ISO 8601
  resetToken?: string // SHA-256 digest, not the token itself — see speakerStore.hashResetToken()
  resetTokenExpiry?: string // ISO 8601
  heroName?: string
}
