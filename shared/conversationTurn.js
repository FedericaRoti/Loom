import { validateBoardActions } from './boardActions.js'

export function createTurnHistory({ session, stepIndex, times }) {
  if (!session || stepIndex < 0) return []

  return session.steps.slice(0, stepIndex + 1).map((step, index) => {
    const turn = {
      boardActions: step.boardActions ?? [],
      checks: step.checks ?? [],
      id: step.id,
      resolvedCheckIds: step.resolvedCheckIds ?? [],
      transcript: step.transcript,
    }
    const validationError = validateConversationTurn(turn)
    if (validationError) throw new Error(validationError)

    return { ...turn, time: times[index] ?? '' }
  })
}

export function validateConversationTurn(turn) {
  if (!isRecord(turn) || !isText(turn.id) || !isRecord(turn.transcript) || !isText(turn.transcript.speaker) || !isText(turn.transcript.text)) {
    return 'Invalid conversation turn.'
  }
  const boardError = validateBoardActions(turn.boardActions)
  if (boardError) return boardError
  if (!Array.isArray(turn.checks) || turn.checks.length > 3 || turn.checks.some((check) => !isRecord(check) || !isText(check.id) || !isText(check.question))) {
    return 'Invalid comprehension checks.'
  }
  if (!Array.isArray(turn.resolvedCheckIds) || turn.resolvedCheckIds.some((id) => !isText(id))) return 'Invalid resolved check IDs.'

  return null
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}
