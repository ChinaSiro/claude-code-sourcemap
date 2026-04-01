// Restored source builds do not include the bundled markdown assets that the
// official build inlines here. Keep the module surface intact with placeholders.

export const SKILL_MD = `---
description: Verify a code change does what it should by running the app.
---

# Verify

Bundled verify skill content is unavailable in this restored source build.
`

export const SKILL_FILES: Record<string, string> = {
  'examples/cli.md':
    'CLI verification example is unavailable in this restored source build.\n',
  'examples/server.md':
    'Server verification example is unavailable in this restored source build.\n',
}
