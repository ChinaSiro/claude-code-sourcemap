import { z } from 'zod/v4'
import { WORKFLOW_TOOL_NAME } from './constants.js'

const UNAVAILABLE_MESSAGE =
  'WorkflowTool is unavailable in this restored source build.'

export const WorkflowTool = {
  name: WORKFLOW_TOOL_NAME,
  inputSchema: z.object({}).passthrough(),
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
    return WORKFLOW_TOOL_NAME
  },
}
