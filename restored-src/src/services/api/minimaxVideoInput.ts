import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'

type MiniMaxVideoURLBlock = {
  type: 'video_url'
  video_url: {
    url: string
    detail?: 'low' | 'default' | 'high'
    fps?: number
    max_long_side_pixel?: number
  }
}

const MINIMAX_ANTHROPIC_BASE_URLS = new Set([
  'https://api.minimax.io/anthropic',
  'https://api.minimaxi.com/anthropic',
])

function isMiniMaxAnthropicBaseUrl(baseUrl: string | undefined): boolean {
  if (!baseUrl) return false

  try {
    const url = new URL(baseUrl)
    const normalizedPath = url.pathname.replace(/\/+$/, '')
    return MINIMAX_ANTHROPIC_BASE_URLS.has(`${url.origin}${normalizedPath}`)
  } catch {
    return false
  }
}

export function normalizeMiniMaxVideoContent(
  content: string | BetaContentBlockParam[],
  baseUrl = process.env.ANTHROPIC_BASE_URL,
): string | BetaContentBlockParam[] {
  if (typeof content === 'string' || !isMiniMaxAnthropicBaseUrl(baseUrl)) {
    return content
  }

  let changed = false
  const normalized = content.map(block => {
    const candidate = block as unknown as MiniMaxVideoURLBlock
    if (
      candidate.type !== 'video_url' ||
      typeof candidate.video_url?.url !== 'string' ||
      candidate.video_url.url.length === 0
    ) {
      return block
    }

    changed = true
    const { url, detail, fps, max_long_side_pixel } = candidate.video_url
    return {
      type: 'video',
      source: {
        type: 'url',
        url,
        ...(detail !== undefined && { detail }),
        ...(fps !== undefined && { fps }),
        ...(max_long_side_pixel !== undefined && { max_long_side_pixel }),
      },
    } as unknown as BetaContentBlockParam
  })

  return changed ? normalized : content
}
