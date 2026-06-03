export interface Answer {
  id: string
  text: string
}

export interface Question {
  id: string
  text: string
  answers: Answer[]
  /** Set to the max value when answerType was "0-N" (star rating). */
  starRating?: number
}
