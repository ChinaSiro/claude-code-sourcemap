const FLASH_MODEL = 'minimax-m3.1-flash'
const M3_MODEL = 'minimax-m3'
const FLASH_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])

/** Apply the direct MiniMax contract after SDK serialization, for all callers. */
export function withMiniMaxRequestDefaults(inner: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    if (
      url.protocol !== 'https:' ||
      !['api.minimax.io', 'api.minimaxi.com'].includes(url.host) ||
      url.pathname !== '/anthropic/v1/messages' ||
      (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase() !== 'POST'
    ) {
      return inner(input, init)
    }

    // The SDK serializes messages as JSON. Preserve non-JSON bodies untouched.
    const body = typeof init?.body === 'string'
      ? init.body
      : input instanceof Request && init?.body === undefined
        ? await input.clone().text()
        : undefined
    if (!body) return inner(input, init)
    let params: {
      model?: unknown
      thinking?: { type?: string; budget_tokens?: number }
      output_config?: { effort?: unknown; [key: string]: unknown }
      service_tier?: unknown
    }
    try {
      params = JSON.parse(body)
    } catch {
      return inner(input, init)
    }
    const model = typeof params?.model === 'string' ? params.model.toLowerCase() : ''
    if (model !== FLASH_MODEL && model !== M3_MODEL) {
      // Saved legacy IDs and custom models retain their original wire payload.
      return inner(input, init)
    }

    if (model === FLASH_MODEL) {
      // Flash cannot disable thinking or accept a fixed thinking budget.
      params.thinking = { type: 'adaptive' }
      const effort = params.output_config?.effort
      if (effort !== undefined && (typeof effort !== 'string' || !FLASH_EFFORTS.has(effort))) {
        throw new Error('MiniMax-M3.1-Flash effort must be low, medium, high, xhigh or max')
      }
      params.output_config = { ...params.output_config, effort: effort ?? 'max' }
      delete params.service_tier
    } else {
      if (params.thinking?.type === 'enabled') {
        params.thinking = { type: 'adaptive' }
      }
      // M3 defaults to disabled thinking on this protocol and ignores effort.
      if (params.output_config) {
        delete params.output_config.effort
        if (Object.keys(params.output_config).length === 0) delete params.output_config
      }
    }
    return inner(input, { ...init, body: JSON.stringify(params) })
  }
}
