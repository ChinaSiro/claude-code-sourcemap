import React, { useCallback, useEffect, useState } from 'react'
import type { ExitState } from '../hooks/useExitOnCtrlCDWithKeybindings.js'
import { useTerminalSize } from '../hooks/useTerminalSize.js'
import { Box, Text } from '../ink.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import { normalizeApiKeyForConfig } from '../utils/authPortable.js'
import { getGlobalConfig, saveGlobalConfig } from '../utils/config.js'
import { logForDebugging } from '../utils/debug.js'
import { isDeepSeekAnthropicBaseUrl } from '../utils/model/providers.js'
import { ConfigurableShortcutHint } from './ConfigurableShortcutHint.js'
import { Byline } from './design-system/Byline.js'
import { Dialog } from './design-system/Dialog.js'
import { KeyboardShortcutHint } from './design-system/KeyboardShortcutHint.js'
import TextInput from './TextInput.js'

type Props = {
  onDone(): void
}

type Step = 'base-url' | 'api-key' | 'model'
const DEEPSEEK_ANTHROPIC_BASE_URL = 'https://api.deepseek.com/anthropic'
const DEEPSEEK_DEFAULT_MODEL = 'deepseek-chat'

function getPreviousStep(step: Step): Step {
  return step === 'model' ? 'api-key' : 'base-url'
}

function getNextStep(step: Step): Step {
  return step === 'base-url' ? 'api-key' : 'model'
}

function getInitialBaseUrl(): string {
  return (
    process.env.ANTHROPIC_BASE_URL ||
    getGlobalConfig().env.ANTHROPIC_BASE_URL ||
    DEEPSEEK_ANTHROPIC_BASE_URL
  )
}

function getInitialApiKey(): string {
  return (
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.ANTHROPIC_API_KEY ||
    getGlobalConfig().env.ANTHROPIC_AUTH_TOKEN ||
    getGlobalConfig().env.ANTHROPIC_API_KEY ||
    ''
  )
}

function getInitialModel(): string {
  return (
    process.env.ANTHROPIC_MODEL ||
    getGlobalConfig().env.ANTHROPIC_MODEL ||
    DEEPSEEK_DEFAULT_MODEL
  )
}

function validateBaseUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return 'API base URL is required.'
  }
  try {
    const url = new URL(trimmed)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return 'API base URL must start with http:// or https://'
    }
  } catch {
    return 'Enter a valid API base URL.'
  }
  return null
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    return trimmed
  }
  try {
    const url = new URL(trimmed)
    if (url.host === 'api.deepseek.com' && (url.pathname === '/' || url.pathname === '')) {
      url.pathname = '/anthropic'
      return url.toString().replace(/\/$/, '')
    }
  } catch {}
  return trimmed
}

function validateApiKey(value: string): string | null {
  if (!value.trim()) {
    return 'API key is required.'
  }
  return null
}

function dedupeRepeatedSecret(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2 || trimmed.length % 2 !== 0) {
    return trimmed
  }
  const midpoint = trimmed.length / 2
  const firstHalf = trimmed.slice(0, midpoint)
  const secondHalf = trimmed.slice(midpoint)
  return firstHalf === secondHalf ? firstHalf : trimmed
}

function validateModel(value: string): string | null {
  if (!value.trim()) {
    return 'Model name is required.'
  }
  return null
}

export function CustomApiSetup({ onDone }: Props): React.ReactNode {
  const [step, setStep] = useState<Step>('base-url')
  const [baseUrl, setBaseUrl] = useState(getInitialBaseUrl)
  const [apiKey, setApiKey] = useState(getInitialApiKey)
  const [model, setModel] = useState(getInitialModel)
  const [baseUrlCursorOffset, setBaseUrlCursorOffset] = useState(baseUrl.length)
  const [apiKeyCursorOffset, setApiKeyCursorOffset] = useState(apiKey.length)
  const [modelCursorOffset, setModelCursorOffset] = useState(model.length)
  const [error, setError] = useState<string | null>(null)
  const { columns } = useTerminalSize()
  useEffect(() => {
    logForDebugging(
      `[custom-api-setup] step=${step} hasBase=${Boolean(baseUrl.trim())} hasKey=${Boolean(
        apiKey.trim(),
      )} hasModel=${Boolean(model.trim())} error=${error ?? 'none'}`,
    )
  }, [apiKey, baseUrl, error, model, step])

  const handleCancel = useCallback(() => {
    setError(null)
    setStep(currentStep => getPreviousStep(currentStep))
  }, [])

  const moveUp = useCallback(() => {
    setError(null)
    setStep(currentStep => getPreviousStep(currentStep))
  }, [])

  const moveDown = useCallback(() => {
    setError(null)
    setStep(currentStep => getNextStep(currentStep))
  }, [])

  function saveCustomApiConfig(
    nextBaseUrl: string,
    nextApiKey: string,
    nextModel: string,
  ): void {
    logForDebugging(
      `[custom-api-setup] saving config base=${nextBaseUrl} model=${nextModel}`,
    )
    const normalizedKey = normalizeApiKeyForConfig(nextApiKey)
    const useDeepSeekPreset = isDeepSeekAnthropicBaseUrl(nextBaseUrl)

    saveGlobalConfig(current => {
      const env = { ...current.env }
      env.ANTHROPIC_BASE_URL = nextBaseUrl
      env.ANTHROPIC_MODEL = nextModel
      if (useDeepSeekPreset) {
        env.ANTHROPIC_AUTH_TOKEN = nextApiKey
        env.ANTHROPIC_DEFAULT_HAIKU_MODEL = nextModel
        env.API_TIMEOUT_MS = '600000'
        env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
        delete env.ANTHROPIC_API_KEY
      } else {
        env.ANTHROPIC_API_KEY = nextApiKey
        delete env.ANTHROPIC_AUTH_TOKEN
        delete env.ANTHROPIC_DEFAULT_HAIKU_MODEL
        delete env.API_TIMEOUT_MS
        delete env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
      }
      delete env.CLAUDE_CODE_USE_BEDROCK
      delete env.CLAUDE_CODE_USE_VERTEX
      delete env.CLAUDE_CODE_USE_FOUNDRY

      return {
        ...current,
        env,
        customApiKeyResponses: {
          ...current.customApiKeyResponses,
          approved: [
            ...(current.customApiKeyResponses?.approved ?? []).filter(
              key => key !== normalizedKey,
            ),
            normalizedKey,
          ],
          rejected: (current.customApiKeyResponses?.rejected ?? []).filter(
            key => key !== normalizedKey,
          ),
        },
      }
    })

    process.env.ANTHROPIC_BASE_URL = nextBaseUrl
    process.env.ANTHROPIC_MODEL = nextModel
    if (useDeepSeekPreset) {
      process.env.ANTHROPIC_AUTH_TOKEN = nextApiKey
      process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = nextModel
      process.env.API_TIMEOUT_MS = '600000'
      process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1'
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = nextApiKey
      delete process.env.ANTHROPIC_AUTH_TOKEN
      delete process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      delete process.env.API_TIMEOUT_MS
      delete process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC
    }
    delete process.env.CLAUDE_CODE_USE_BEDROCK
    delete process.env.CLAUDE_CODE_USE_VERTEX
    delete process.env.CLAUDE_CODE_USE_FOUNDRY
  }

  const handleBaseUrlSubmit = useCallback(
    (value: string) => {
      const trimmed = normalizeBaseUrl(value)
      const validationError = validateBaseUrl(trimmed)
      if (validationError) {
        setError(validationError)
        return
      }
      setBaseUrl(trimmed)
      setBaseUrlCursorOffset(trimmed.length)
      setError(null)
      setStep(currentStep => (currentStep === 'base-url' ? 'api-key' : currentStep))
    },
    [setStep],
  )

  const handleApiKeySubmit = useCallback(
    (value: string) => {
      const trimmed = dedupeRepeatedSecret(value)
      const validationError = validateApiKey(trimmed)
      if (validationError) {
        setError(validationError)
        return
      }
      if (trimmed !== value.trim()) {
        logForDebugging('[custom-api-setup] deduped repeated API key input', {
          level: 'warn',
        })
      }
      setApiKey(trimmed)
      setApiKeyCursorOffset(trimmed.length)
      setError(null)
      setStep('model')
    },
    [setStep],
  )

  const handleModelSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      const validationError = validateModel(trimmed)
      if (validationError) {
        setError(validationError)
        return
      }
      setModel(trimmed)
      setModelCursorOffset(trimmed.length)
      setError(null)
      saveCustomApiConfig(baseUrl.trim(), apiKey.trim(), trimmed)
      onDone()
    },
    [apiKey, baseUrl, onDone],
  )

  function renderInputGuide(exitState: ExitState): React.ReactNode {
    if (exitState.pending) {
      return <Text>Press {exitState.keyName} again to exit</Text>
    }
    return (
      <Byline>
        <KeyboardShortcutHint shortcut="Enter" action="continue" />
        <Text>Up/Down: switch fields</Text>
        {step !== 'base-url' && (
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Settings"
            fallback="Esc"
            description="back"
          />
        )}
      </Byline>
    )
  }

  useKeybinding('confirm:no', handleCancel, {
    context: 'Settings',
    isActive: step !== 'base-url',
  })

  return (
    <Dialog
      title="Set up your custom API"
      subtitle="Claude Code will default to an Anthropic-compatible third-party API."
      color="permission"
      onCancel={handleCancel}
      inputGuide={renderInputGuide}
      isCancelActive={false}
    >
      <Box flexDirection="column" gap={1}>
        <Text>1. Enter your API base URL</Text>
        <Text color="secondary">
          DeepSeek Anthropic preset: {DEEPSEEK_ANTHROPIC_BASE_URL}
        </Text>
        <Box flexDirection="row" gap={1}>
          <Text>{step === 'base-url' ? '>' : ' '}</Text>
          <TextInput
            value={baseUrl}
            onChange={value => {
              setBaseUrl(value)
              if (error) setError(null)
            }}
            onSubmit={handleBaseUrlSubmit}
            focus={step === 'base-url'}
            showCursor={step === 'base-url'}
            placeholder="https://api.example.com/anthropic"
            columns={Math.max(40, columns - 4)}
            onHistoryUp={moveUp}
            onHistoryDown={moveDown}
            disableCursorMovementForUpDownKeys
            cursorOffset={baseUrlCursorOffset}
            onChangeCursorOffset={setBaseUrlCursorOffset}
          />
        </Box>
        <Text>2. Enter your API key or auth token</Text>
        <Box flexDirection="row" gap={1}>
          <Text>{step === 'api-key' ? '>' : ' '}</Text>
          <TextInput
            value={apiKey}
            onChange={value => {
              setApiKey(value)
              if (error) setError(null)
            }}
            onSubmit={handleApiKeySubmit}
            focus={step === 'api-key'}
            showCursor={step === 'api-key'}
            placeholder="sk-..."
            mask="*"
            columns={Math.max(40, columns - 4)}
            onHistoryUp={moveUp}
            onHistoryDown={moveDown}
            disableCursorMovementForUpDownKeys
            cursorOffset={apiKeyCursorOffset}
            onChangeCursorOffset={setApiKeyCursorOffset}
          />
        </Box>
        <Text>3. Enter your default model name</Text>
        <Box flexDirection="row" gap={1}>
          <Text>{step === 'model' ? '>' : ' '}</Text>
          <TextInput
            value={model}
            onChange={value => {
              setModel(value)
              if (error) setError(null)
            }}
            onSubmit={handleModelSubmit}
            focus={step === 'model'}
            showCursor={step === 'model'}
            placeholder={DEEPSEEK_DEFAULT_MODEL}
            columns={Math.max(40, columns - 4)}
            onHistoryUp={moveUp}
            onHistoryDown={moveDown}
            disableCursorMovementForUpDownKeys
            cursorOffset={modelCursorOffset}
            onChangeCursorOffset={setModelCursorOffset}
          />
        </Box>
        {error && <Text color="error">{error}</Text>}
      </Box>
    </Dialog>
  )
}
