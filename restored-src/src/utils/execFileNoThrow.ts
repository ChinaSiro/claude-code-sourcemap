// This file represents useful wrappers over node:child_process.
// It intentionally avoids shell semantics by default: callers pass an
// executable plus argv, so spawning the file directly is both safer and more
// predictable than routing through cross-spawn/cmd.exe.

import { spawn } from 'child_process'
import { getCwd } from '../utils/cwd.js'
import { logError } from './log.js'

export { execSyncWithDefaults_DEPRECATED } from './execFileNoThrowPortable.js'

const MS_IN_SECOND = 1000
const SECONDS_IN_MINUTE = 60

type ExecFileOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  // Setting useCwd=false avoids circular dependencies during initialization
  // getCwd() -> PersistentShell -> logEvent() -> execFileNoThrow
  useCwd?: boolean
  env?: NodeJS.ProcessEnv
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

export function execFileNoThrow(
  file: string,
  args: string[],
  options: ExecFileOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    useCwd: true,
  },
): Promise<{ stdout: string; stderr: string; code: number; error?: string }> {
  return execFileNoThrowWithCwd(file, args, {
    abortSignal: options.abortSignal,
    timeout: options.timeout,
    preserveOutputOnError: options.preserveOutputOnError,
    cwd: options.useCwd ? getCwd() : undefined,
    env: options.env,
    stdin: options.stdin,
    input: options.input,
  })
}

type ExecFileWithCwdOptions = {
  abortSignal?: AbortSignal
  timeout?: number
  preserveOutputOnError?: boolean
  maxBuffer?: number
  cwd?: string
  env?: NodeJS.ProcessEnv
  shell?: boolean | string | undefined
  stdin?: 'ignore' | 'inherit' | 'pipe'
  input?: string
}

type ExecaResultWithError = {
  shortMessage?: string
  signal?: string
}

/**
 * Extracts a human-readable error message from an execa result.
 *
 * Priority order:
 * 1. shortMessage - execa's human-readable error (e.g., "Command failed with exit code 1: ...")
 *    This is preferred because it already includes signal info when a process is killed,
 *    making it more informative than just the signal name.
 * 2. signal - the signal that killed the process (e.g., "SIGTERM")
 * 3. errorCode - fallback to just the numeric exit code
 */
function getErrorMessage(
  result: ExecaResultWithError,
  errorCode: number,
): string {
  if (result.shortMessage) {
    return result.shortMessage
  }
  if (typeof result.signal === 'string') {
    return result.signal
  }
  return String(errorCode)
}

/**
 * execFile, but always resolves (never throws)
 */
export function execFileNoThrowWithCwd(
  file: string,
  args: string[],
  {
    abortSignal,
    timeout: finalTimeout = 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: finalPreserveOutput = true,
    cwd: finalCwd,
    env: finalEnv,
    maxBuffer,
    shell,
    stdin: finalStdin,
    input: finalInput,
  }: ExecFileWithCwdOptions = {
    timeout: 10 * SECONDS_IN_MINUTE * MS_IN_SECOND,
    preserveOutputOnError: true,
    maxBuffer: 1_000_000,
  },
): Promise<{ stdout: string; stderr: string; code: number; error?: string }> {
  return new Promise(resolve => {
    const stdinMode = finalInput !== undefined ? 'pipe' : (finalStdin ?? 'pipe')
    let child
    try {
      child = spawn(file, args, {
        cwd: finalCwd,
        env: finalEnv,
        shell,
        signal: abortSignal,
        stdio: [stdinMode, 'pipe', 'pipe'],
        windowsHide: true,
      })
    } catch (error) {
      logError(error)
      resolve({
        stdout: '',
        stderr: '',
        code: 1,
        error: error instanceof Error ? error.message : String(error),
      })
      return
    }

    let stdout = ''
    let stderr = ''
    let settled = false
    let timedOut = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const finish = (result: {
      stdout: string
      stderr: string
      code: number
      error?: string
    }) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }

    const appendChunk = (
      current: string,
      chunk: Buffer | string,
    ): { next: string; overflowed: boolean } => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8')
      if (maxBuffer === undefined) {
        return { next: current + text, overflowed: false }
      }
      const next = current + text
      if (next.length <= maxBuffer) {
        return { next, overflowed: false }
      }
      return {
        next: next.slice(0, maxBuffer),
        overflowed: true,
      }
    }

    child.stdout?.on('data', chunk => {
      const result = appendChunk(stdout, chunk)
      stdout = result.next
      if (result.overflowed) {
        child.kill()
      }
    })

    child.stderr?.on('data', chunk => {
      const result = appendChunk(stderr, chunk)
      stderr = result.next
      if (result.overflowed) {
        child.kill()
      }
    })

    child.on('error', error => {
      logError(error)
      finish({ stdout: '', stderr: '', code: 1, error: error.message })
    })

    child.on('close', (code, signal) => {
      const exitCode = typeof code === 'number' ? code : 1
      if (exitCode === 0 && !signal && !timedOut) {
        finish({ stdout, stderr, code: 0 })
        return
      }

      const output = finalPreserveOutput ? { stdout, stderr } : { stdout: '', stderr: '' }
      const signalName = typeof signal === 'string' ? signal : undefined
      finish({
        ...output,
        code: exitCode,
        error: timedOut
          ? `timed out after ${finalTimeout}ms`
          : getErrorMessage(
              {
                shortMessage:
                  output.stderr.trim() || output.stdout.trim() || undefined,
                signal: signalName,
              },
              exitCode,
            ),
      })
    })

    if (finalInput !== undefined && child.stdin) {
      child.stdin.end(finalInput)
    }

    if (stdinMode === 'ignore') {
      child.stdin?.end()
    }

    if (finalTimeout !== undefined && finalTimeout > 0) {
      timer = setTimeout(() => {
        timedOut = true
        child.kill()
      }, finalTimeout)
    }
  })
}
