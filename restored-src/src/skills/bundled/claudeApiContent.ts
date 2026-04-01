// Restored source builds do not include the bundled Claude API markdown
// documentation tree. Provide placeholders so skill registration can load.

export const SKILL_MODEL_VARS = {
  OPUS_ID: 'claude-opus-4-6',
  OPUS_NAME: 'Claude Opus 4.6',
  SONNET_ID: 'claude-sonnet-4-6',
  SONNET_NAME: 'Claude Sonnet 4.6',
  HAIKU_ID: 'claude-haiku-4-5',
  HAIKU_NAME: 'Claude Haiku 4.5',
  PREV_SONNET_ID: 'claude-sonnet-4-5',
} satisfies Record<string, string>

export const SKILL_PROMPT = `# Claude API

Bundled Claude API documentation is unavailable in this restored source build.
`

export const SKILL_FILES: Record<string, string> = {
  'shared/live-sources.md':
    'Bundled Claude API reference files are unavailable in this restored source build.\n',
}
