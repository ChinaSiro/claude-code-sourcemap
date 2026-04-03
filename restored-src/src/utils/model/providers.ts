import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider =
  | 'firstParty'
  | 'custom'
  | 'bedrock'
  | 'vertex'
  | 'foundry'

export function getAPIProvider(): APIProvider {
  return isEnvTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)
    ? 'bedrock'
    : isEnvTruthy(process.env.CLAUDE_CODE_USE_VERTEX)
      ? 'vertex'
      : isEnvTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)
        ? 'foundry'
        : hasCustomAnthropicBaseUrl()
          ? 'custom'
          : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

export function isAnthropicCompatibleProvider(
  provider: APIProvider = getAPIProvider(),
): boolean {
  return provider === 'firstParty' || provider === 'custom'
}

export function getModelConfigProvider(
  provider: APIProvider = getAPIProvider(),
): Exclude<APIProvider, 'custom'> {
  return provider === 'custom' ? 'firstParty' : provider
}

export function getAPIProviderDisplayName(
  provider: APIProvider = getAPIProvider(),
): string {
  return {
    firstParty: 'Anthropic',
    custom: 'Custom API',
    bedrock: 'AWS Bedrock',
    vertex: 'Google Vertex AI',
    foundry: 'Microsoft Foundry',
  }[provider]
}

export function hasCustomAnthropicBaseUrl(): boolean {
  return !!process.env.ANTHROPIC_BASE_URL && !isFirstPartyAnthropicBaseUrl()
}

export function isDeepSeekAnthropicBaseUrl(
  baseUrl: string | undefined = process.env.ANTHROPIC_BASE_URL,
): boolean {
  if (!baseUrl) {
    return false
  }
  try {
    const url = new URL(baseUrl)
    return (
      url.host === 'api.deepseek.com' &&
      (url.pathname === '/anthropic' || url.pathname.startsWith('/anthropic/'))
    )
  } catch {
    return false
  }
}

export function hasConfiguredCustomApi(): boolean {
  return (
    hasCustomAnthropicBaseUrl() &&
    !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) &&
    !!process.env.ANTHROPIC_MODEL
  )
}

export function needsCustomApiSetup(): boolean {
  return !hasConfiguredCustomApi()
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
