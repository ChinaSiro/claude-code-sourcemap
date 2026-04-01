const fs = require('fs');
const path = require('path');

async function extractSources() {
  const mapFile = path.join(__dirname, 'package/cli.js.map');
  console.log('Reading source map...');
  const rawMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));

  console.log(`Sources count: ${rawMap.sources.length}`);
  console.log('Sample sources:', rawMap.sources.slice(0, 10));

  const outDir = path.join(__dirname, 'restored-src');

  let written = 0, skipped = 0;

  for (let i = 0; i < rawMap.sources.length; i++) {
    const sourcePath = rawMap.sources[i];
    const content = rawMap.sourcesContent && rawMap.sourcesContent[i];

    if (!content) { skipped++; continue; }

    // Sanitize path
    let relPath = sourcePath
      .replace(/^.*node_modules\//, 'node_modules/')
      .replace(/^webpack:\/\/\//, '')
      .replace(/^webpack:\/\//, '')
      .replace(/^\/?\.\.\//, '')
      .replace(/\?.*$/, '');

    if (!relPath || relPath === 'webpack/bootstrap') {
      relPath = `__webpack__/source_${i}.js`;
    }

    // Remove leading slashes and dangerous path components
    relPath = relPath.replace(/^\/+/, '').replace(/\.\.\//g, '_dotdot_/');

    const fullPath = path.join(outDir, relPath);
    const dir = path.dirname(fullPath);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
    written++;

    if (written % 500 === 0) console.log(`Written ${written} files...`);
  }

  console.log(`Done. Written: ${written}, Skipped (no content): ${skipped}`);
}

extractSources().catch(console.error);
