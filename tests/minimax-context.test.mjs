// Node >=22.15; dependency-free coverage of the recovered context module.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
const url = new URL('../restored-src/src/utils/context.ts', import.meta.url).href
const stubs = `
export const CONTEXT_1M_BETA_HEADER = 'context-1m';
export const getGlobalConfig = () => ({});
export const isEnvTruthy = value => value === '1';
export const getCanonicalName = value => value.toLowerCase();
export const getModelCapability = () => undefined;
`
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL === url) return { url: 'context-test:dependencies', shortCircuit: true }
    return next(specifier, context)
  },
  load(path, context, next) {
    if (path === url) return { format: 'module', source: stripTypeScriptTypes(readFileSync(new URL(url), 'utf8')), shortCircuit: true }
    if (path === 'context-test:dependencies') return { format: 'module', source: stubs, shortCircuit: true }
    return next(path, context)
  },
})
const context = await import(url)
test('direct Flash and M3 context, Flash output cap, legacy and custom limits', () => {
  delete process.env.USER_TYPE
  delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
  for (const model of ['MiniMax-M3.1-Flash', 'MiniMax-M3', 'minimax-m3.1-flash']) {
    assert.equal(context.getContextWindowForModel(model), 1_000_000)
    assert.equal(context.modelSupports1M(model), true)
  }
  assert.deepEqual(context.getModelMaxOutputTokens('MiniMax-M3.1-Flash'), { default: 32_000, upperLimit: 524_288 })
  assert.equal(context.getContextWindowForModel('MiniMax-M2.7'), 204_800)
  for (const model of ['custom-MiniMax-M3', 'MiniMax-M3-preview', 'unrelated']) {
    assert.equal(context.getContextWindowForModel(model), 200_000)
    assert.equal(context.modelSupports1M(model), false)
  }
  process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT = '1'
  assert.equal(context.getContextWindowForModel('MiniMax-M3.1-Flash'), 200_000)
  assert.equal(context.modelSupports1M('MiniMax-M3.1-Flash'), false)
  delete process.env.CLAUDE_CODE_DISABLE_1M_CONTEXT
  process.env.USER_TYPE = 'ant'
  process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS = '120000'
  assert.equal(context.getContextWindowForModel('MiniMax-M3.1-Flash'), 120_000)
  delete process.env.USER_TYPE
  delete process.env.CLAUDE_CODE_MAX_CONTEXT_TOKENS
})
