// Run with Node >=22.15 and MINIMAX_TEST_SDK pointing to @anthropic-ai/sdk 0.74.0/index.mjs.
// The recovered app lacks its build graph. Only unrelated app services are stubbed;
// model resolution, picker, capabilities, client, and SDK serialization run unchanged.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const root = new URL('../restored-src/src/', import.meta.url)
const realPaths = [
  'utils/model/configs.ts', 'utils/model/providers.ts', 'utils/model/model.ts',
  'utils/model/modelStrings.ts', 'utils/model/modelOptions.ts', 'utils/context.ts',
  'utils/thinking.ts', 'utils/effort.ts', 'services/api/client.ts', 'services/api/minimax.ts',
]
const real = new Map(realPaths.map(path => {
  const url = new URL(path, root).href
  return [url, stripTypeScriptTypes(readFileSync(new URL(url), 'utf8'))]
}))
const sdk = process.env.MINIMAX_TEST_SDK
assert.ok(sdk, 'Set MINIMAX_TEST_SDK to an installed SDK 0.74.0/index.mjs')
const sdkURL = pathToFileURL(resolve(sdk)).href
const { VERSION } = await import(new URL('./version.mjs', sdkURL))
assert.equal(VERSION, process.env.MINIMAX_TEST_SDK_VERSION ?? '0.74.0', 'Use the pinned SDK version (or explicitly select a supplemental compatibility run)')

let settings = {}, globalConfig = {}, modelStrings = null, modelOverride, initialModel = null
const fixtures = {
  getInitialSettings: () => settings, getSettings_DEPRECATED: () => settings,
  getSettingsWithErrors: () => ({ settings }), getGlobalConfig: () => globalConfig,
  getModelStrings: () => modelStrings, setModelStrings: value => { modelStrings = value },
  getMainLoopModelOverride: () => modelOverride, getInitialMainLoopModel: () => initialModel,
  isEnvTruthy: value => ['1', 'true', 'yes'].includes(value?.toLowerCase()),
  isModelAllowed: model => !settings.availableModels || settings.availableModels.includes(model),
  isModelAlias: model => ['sonnet', 'haiku', 'opus', 'opusplan'].includes(model),
  sequential: fn => fn, feature: () => false,
  isClaudeAISubscriber: () => false, isMaxSubscriber: () => false,
  isProSubscriber: () => false, isTeamPremiumSubscriber: () => false, isTeamSubscriber: () => false,
  getSubscriptionType: () => null, getModelCapability: () => undefined,
  get3PModelCapabilityOverride: () => undefined,
  getFeatureValue_CACHED_MAY_BE_STALE: (_key, fallback) => fallback,
  getAnthropicApiKey: () => 'offline-test-key', getApiKeyFromApiKeyHelper: () => undefined,
  checkAndRefreshOAuthTokenIfNeeded: async () => {},
  getUserAgent: () => 'offline-test', getSessionId: () => 'test-session',
  getIsNonInteractiveSession: () => true, getProxyFetchOptions: () => ({}),
  isDebugToStdErr: () => false, logForDebugging: () => {},
  COST_TIER_3_15: {}, COST_HAIKU_35: {}, COST_HAIKU_45: {},
}
globalThis.__minimaxFixtures = fixtures
const importedNames = new Set()
for (const source of real.values()) {
  for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from/g)) {
    for (const name of match[1].split(',')) {
      const original = name.trim().split(/\s+as\s+/)[0]
      if (original) importedNames.add(original)
    }
  }
}
const stub = [...importedNames].map(name =>
  `export const ${name} = globalThis.__minimaxFixtures[${JSON.stringify(name)}] ?? (() => { throw new Error('Unexpected app dependency: ${name}') });`
).join('\n')
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@anthropic-ai/sdk') return { url: sdkURL, shortCircuit: true }
    if (!real.has(context.parentURL)) return nextResolve(specifier, context)
    if (specifier === 'crypto') return nextResolve(specifier, context)
    const url = specifier.startsWith('src/')
      ? new URL(specifier.slice(4), root)
      : new URL(specifier, context.parentURL)
    url.pathname = url.pathname.replace(/\.js$/, '.ts')
    if (real.has(url.href)) return { url: url.href, shortCircuit: true }
    return { url: 'minimax-test:app-services', shortCircuit: true }
  },
  load(url, context, nextLoad) {
    if (real.has(url)) return { format: 'module', source: real.get(url), shortCircuit: true }
    if (url === 'minimax-test:app-services') return { format: 'module', source: stub, shortCircuit: true }
    return nextLoad(url, context)
  },
})
const model = await import(new URL('utils/model/model.ts', root))
const picker = await import(new URL('utils/model/modelOptions.ts', root))
const context = await import(new URL('utils/context.ts', root))
const thinking = await import(new URL('utils/thinking.ts', root))
const effort = await import(new URL('utils/effort.ts', root))
const { getAnthropicClient } = await import(new URL('services/api/client.ts', root))
const { withMiniMaxRequestDefaults } = await import(new URL('services/api/minimax.ts', root))
const { getAPIProvider } = await import(new URL('utils/model/providers.ts', root))
const FLASH = 'MiniMax-M3.1-Flash'
function reset(region = 'api.minimax.io') {
  for (const key of Object.keys(process.env)) {
    if (/^(ANTHROPIC_|CLAUDE_CODE_|USER_TYPE|MAX_THINKING)/.test(key)) delete process.env[key]
  }
  process.env.ANTHROPIC_BASE_URL = `https://${region}/anthropic`
  settings = {}; globalConfig = {}; modelStrings = null; modelOverride = undefined; initialModel = null
}
async function send(params = {}, stream = false) {
  let captured
  const client = await getAnthropicClient({ maxRetries: 0, fetchOverride: async (input, init) => {
    captured = { url: String(input), body: JSON.parse(init.body), headers: new Headers(init.headers) }
    return new Response(stream ? 'event: message_stop\ndata: {"type":"message_stop"}\n\n' : JSON.stringify({
      id: 'test', type: 'message', role: 'assistant', model: params.model ?? FLASH,
      content: [], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 },
    }), { headers: { 'content-type': stream ? 'text/event-stream' : 'application/json' } })
  } })
  const result = await client.beta.messages.create({
    model: model.getMainLoopModel(), max_tokens: 100,
    messages: [{ role: 'user', content: 'offline test' }], ...params, stream,
  })
  if (stream) for await (const _event of result) { /* consume mocked SSE */ }
  return captured
}

test('both regions resolve Flash defaults, fast aliases and current ordinary picker choices', async () => {
  for (const region of ['api.minimax.io', 'api.minimaxi.com']) {
    reset(region)
    assert.equal(getAPIProvider(), 'minimax')
    assert.equal(model.getMainLoopModel(), FLASH)
    assert.equal(model.getSmallFastModel(), FLASH)
    assert.equal(model.getDefaultOpusModel(), FLASH)
    globalConfig.additionalModelOptionsCache = [{ value: 'MiniMax-M2.7' }, { value: 'unrelated-custom-cache' }]
    assert.deepEqual(picker.getModelOptions().map(opt => opt.value), [null, FLASH, 'MiniMax-M3', 'unrelated-custom-cache'])
    for (const stream of [false, true]) {
      const wire = await send({ thinking: { type: 'disabled' }, service_tier: 'auto' }, stream)
      assert.equal(wire.url.split('?')[0], `https://${region}/anthropic/v1/messages`)
      assert.equal(wire.body.model, FLASH)
      assert.deepEqual(wire.body.thinking, { type: 'adaptive' })
      assert.equal(wire.body.output_config.effort, 'max')
      assert.ok(!('service_tier' in wire.body))
      assert.equal(wire.body.stream, stream)
    }
  }
})

test('saved, session, environment, aliases and explicit custom legacy choices survive', async () => {
  reset()
  settings.model = 'MiniMax-M2.7'
  assert.equal(model.getMainLoopModel(), 'MiniMax-M2.7')
  assert.ok(picker.getModelOptions().some(opt => opt.value === 'MiniMax-M2.7'))
  const legacy = await send({ thinking: { type: 'disabled' }, output_config: { effort: 'none' }, service_tier: 'auto' })
  assert.equal(legacy.body.model, 'MiniMax-M2.7')
  assert.equal(legacy.body.thinking.type, 'disabled')
  assert.equal(legacy.body.output_config.effort, 'none')
  process.env.ANTHROPIC_MODEL = 'custom-model'
  assert.equal((await send()).body.model, 'custom-model')
  modelOverride = 'MiniMax-M3'
  assert.equal((await send()).body.model, 'MiniMax-M3')
  modelOverride = undefined
  delete process.env.ANTHROPIC_MODEL
  settings = { modelOverrides: { 'claude-sonnet-4-5-20250929': 'saved-deployment' } }
  assert.equal(model.getDefaultSonnetModel(), 'saved-deployment')
  process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = 'saved-fast'
  assert.equal(model.getSmallFastModel(), 'saved-fast')
  process.env.ANTHROPIC_CUSTOM_MODEL_OPTION = 'MiniMax-M2.5'
  assert.ok(picker.getModelOptions().some(opt => opt.value === 'MiniMax-M2.5'))
})

test('Flash effort contract and M3 thinking modes preserve tool, image and history payloads', async () => {
  reset()
  const messages = [
    { role: 'assistant', content: [{ type: 'thinking', thinking: 'prior', signature: 'saved' }, { type: 'tool_use', id: 'call', name: 'lookup', input: {} }] },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'call', content: 'ok' }, { type: 'image', source: { type: 'url', url: 'https://example.invalid/image.png' } }, { type: 'video', source: { type: 'url', url: 'https://example.invalid/video.mp4' } }] },
  ]
  const tools = [{ name: 'lookup', input_schema: { type: 'object', properties: {} } }]
  for (const level of ['low', 'medium', 'high', 'xhigh', 'max']) {
    const wire = await send({ messages, tools, thinking: { type: 'enabled', budget_tokens: 50 }, output_config: { effort: level } })
    assert.equal(wire.body.output_config.effort, level)
    assert.deepEqual(wire.body.thinking, { type: 'adaptive' })
    assert.deepEqual(wire.body.messages, messages)
    assert.deepEqual(wire.body.tools, tools)
  }
  await assert.rejects(send({ output_config: { effort: 'none' } }), error => {
    assert.match(error.cause?.message ?? error.message, /effort must be/)
    return true
  })
  for (const mode of [undefined, 'disabled', 'adaptive', 'enabled']) {
    const wire = await send({ model: 'MiniMax-M3', ...(mode ? { thinking: { type: mode } } : {}), output_config: { effort: 'max', format: { type: 'json_schema', schema: {} } } })
    assert.equal(wire.body.thinking?.type, mode === 'enabled' ? 'adaptive' : mode)
    assert.ok(!('effort' in wire.body.output_config))
    assert.deepEqual(wire.body.output_config.format, { type: 'json_schema', schema: {} })
  }
})

test('capabilities expose adaptive thinking and max effort without affecting custom models', () => {
  reset()
  assert.equal(thinking.modelSupportsThinking(FLASH), true)
  assert.equal(thinking.modelSupportsAdaptiveThinking(FLASH), true)
  assert.equal(thinking.modelSupportsAdaptiveThinking('MiniMax-M3'), true)
  assert.equal(effort.resolveAppliedEffort(FLASH, undefined), 'max')
  assert.equal(effort.resolveAppliedEffort(FLASH, 'low'), 'low')
  assert.equal(effort.modelSupportsEffort('MiniMax-M3'), false)
  assert.equal(context.getContextWindowForModel(FLASH), 1_000_000)
  assert.equal(context.getContextWindowForModel('MiniMax-M3'), 1_000_000)
  assert.equal(context.getContextWindowForModel('MiniMax-M2.7'), 204_800)
  process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = '1'
  assert.equal(context.getContextWindowForModel(FLASH), 200_000)
  assert.equal(context.modelSupports1M(FLASH), false)
})

test('non-MiniMax routes and custom model request bodies are not adapted', async () => {
  reset('example.invalid')
  assert.equal(getAPIProvider(), 'firstParty')
  const wire = await send({ model: FLASH, thinking: { type: 'disabled' }, service_tier: 'auto' })
  assert.equal(wire.body.thinking.type, 'disabled')
  assert.equal(wire.body.service_tier, 'auto')
  const body = JSON.stringify({ model: FLASH, thinking: { type: 'disabled' } })
  for (const url of ['https://api.minimax.io/anthropic/v1/messages/count_tokens', 'https://api.minimax.io.evil.invalid/anthropic/v1/messages']) {
    const wrapped = withMiniMaxRequestDefaults(async (_input, init) => {
      assert.equal(init.body, body)
      return new Response('{}')
    })
    await wrapped(url, { method: 'POST', body })
  }
})
