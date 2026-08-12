import assert from 'node:assert/strict'
import test from 'node:test'
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { normalizeMiniMaxVideoContent } from './minimaxVideoInput.ts'

function asContent(blocks: unknown[]): BetaContentBlockParam[] {
  return blocks as BetaContentBlockParam[]
}

test('translates a video URL for the global Anthropic-compatible route', () => {
  const content = asContent([
    { type: 'text', text: 'Describe this video.' },
    {
      type: 'video_url',
      video_url: { url: 'https://example.com/demo.mp4' },
    },
  ])

  assert.deepEqual(
    normalizeMiniMaxVideoContent(
      content,
      'https://api.minimax.io/anthropic/',
    ),
    [
      { type: 'text', text: 'Describe this video.' },
      {
        type: 'video',
        source: { type: 'url', url: 'https://example.com/demo.mp4' },
      },
    ],
  )
})

test('preserves video sampling options for the China route', () => {
  const content = asContent([
    {
      type: 'video_url',
      video_url: {
        url: 'mm_file://video-file',
        detail: 'high',
        fps: 2,
        max_long_side_pixel: 1080,
      },
    },
  ])

  assert.deepEqual(
    normalizeMiniMaxVideoContent(
      content,
      'https://api.minimaxi.com/anthropic',
    ),
    [
      {
        type: 'video',
        source: {
          type: 'url',
          url: 'mm_file://video-file',
          detail: 'high',
          fps: 2,
          max_long_side_pixel: 1080,
        },
      },
    ],
  )
})

test('leaves content unchanged for other routes', () => {
  const content = asContent([
    {
      type: 'video_url',
      video_url: { url: 'https://example.com/demo.mp4' },
    },
  ])

  assert.strictEqual(
    normalizeMiniMaxVideoContent(content, 'https://example.com/anthropic'),
    content,
  )
})
