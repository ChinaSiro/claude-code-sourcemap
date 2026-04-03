import { z } from 'zod/v4'

const UNAVAILABLE_MESSAGE =
  'TungstenTool is unavailable in this restored source build.'

const inputSchema = z.object({}).passthrough()

export const TungstenTool = {
  name: 'TungstenTool',
  inputSchema,
  maxResultSizeChars: 0,
  async call() {
    throw new Error(UNAVAILABLE_MESSAGE)
  },
  async checkPermissions() {
    throw new Error(UNAVAILABLE_MESSAGE)
  },
  async description() {
    return UNAVAILABLE_MESSAGE
  },
  async prompt() {
    return UNAVAILABLE_MESSAGE
  },
  isConcurrencySafe() {
    return true
  },
  isEnabled() {
    return false
  },
  isReadOnly() {
    return false
  },
  userFacingName() {
    return 'TungstenTool'
  },
}

export function clearSessionsWithTungstenUsage(): void {}

export function resetInitializationState(): void {}
