const fs = require("fs");
const path = require("path");

const NODE_MODULES_DIR = path.resolve(__dirname, "..", "node_modules");

const ENTRY_CANDIDATES = [
  "index.mjs",
  "esm.mjs",
  "index.js",
  "index.cjs",
  "main.js",
  "main.mjs",
  "wrapper.mjs",
  "source/index.mjs",
  "source/index.js",
  "src/index.mjs",
  "src/index.ts",
  "src/index.js",
  "src/main.js",
  "src/main.mjs",
  "dist/index.mjs",
  "dist/index.js",
  "dist/index.cjs",
  "dist/main.mjs",
  "dist/main.js",
  "dist/main.cjs",
  "dist-cjs/index.js",
  "dist-cjs/index.cjs",
  "dist-cjs/main.js",
  "dist-cjs/main.cjs",
  "lib/index.mjs",
  "lib/index.js",
  "lib/index.cjs",
  "lib/main.mjs",
  "lib/main.js",
  "lib/main.cjs",
  "lib/esm/main.js",
  "lib/node/main.js",
  "build/index.mjs",
  "build/index.js",
  "build/index.cjs",
  "build/src/main.js",
  "cjs/index.js",
  "cjs/index.cjs",
];

const ENTRY_EXTENSIONS = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx"]);

function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function listPackages(rootDir) {
  const packages = [];
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("@")) {
      const scopeDir = path.join(rootDir, entry.name);
      for (const scopedEntry of fs.readdirSync(scopeDir, { withFileTypes: true })) {
        if (!scopedEntry.isDirectory()) continue;
        packages.push({
          name: `${entry.name}/${scopedEntry.name}`,
          dir: path.join(scopeDir, scopedEntry.name),
        });
      }
      continue;
    }
    packages.push({
      name: entry.name,
      dir: path.join(rootDir, entry.name),
    });
  }
  return packages;
}

function chooseCandidate(dir, pkgName) {
  for (const relPath of ENTRY_CANDIDATES) {
    const fullPath = path.join(dir, relPath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      return relPath;
    }
  }

  const baseName = pkgName.split("/").pop();
  const matches = [];

  function walk(currentDir, depth) {
    if (depth > 3) return;
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(dir, fullPath).replace(/\\/g, "/");
      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
        continue;
      }
      if (!ENTRY_EXTENSIONS.has(path.extname(entry.name))) continue;
      matches.push(relPath);
    }
  }

  walk(dir, 0);

  if (matches.length === 1) {
    return matches[0];
  }

  const preferred = matches
    .filter((relPath) => {
      const fileName = path.basename(relPath);
      return (
        fileName === `${baseName}.mjs` ||
        fileName === `${baseName}.js` ||
        fileName === `${baseName}.cjs` ||
        fileName === `${baseName}.ts` ||
        fileName === `${baseName}.tsx` ||
        fileName === `${baseName}.production.js`
      );
    })
    .sort((a, b) => a.length - b.length);

  if (preferred.length > 0) {
    return preferred[0];
  }

  const normalizedVariants = new Set([
    normalizeName(baseName),
    normalizeName(baseName.replace(/[-.]?(?:es|module)$/i, "")),
    normalizeName(baseName.replace(/[-.]?js$/i, "")),
  ]);

  const matchingPackageNames = matches
    .filter((relPath) => {
      const fileName = path.basename(relPath, path.extname(relPath));
      return normalizedVariants.has(normalizeName(fileName));
    })
    .sort((a, b) => a.length - b.length);

  if (matchingPackageNames.length > 0) {
    return matchingPackageNames[0];
  }

  const fallbackIndex = matches
    .filter((relPath) => /^(.+\/)?index\.(mjs|js|cjs|ts|tsx)$/.test(relPath))
    .sort((a, b) => a.length - b.length);

  if (fallbackIndex.length > 0) {
    return fallbackIndex[0];
  }

  const rootFileFallback = matches
    .filter((relPath) => !relPath.includes("/") && !path.basename(relPath).startsWith("_"))
    .sort((a, b) => a.length - b.length);

  if (rootFileFallback.length > 0) {
    return rootFileFallback[0];
  }

  return null;
}

function detectModuleType(entryPath) {
  const ext = path.extname(entryPath);
  if (ext === ".mjs") return "module";
  if (ext === ".cjs") return "commonjs";

  const source = fs.readFileSync(entryPath, "utf8");
  const hasEsmSyntax =
    /^\s*import\s/m.test(source) ||
    /^\s*export\s/m.test(source) ||
    source.includes("import.meta");
  const hasCommonJsSyntax =
    source.includes("module.exports") ||
    source.includes("exports.") ||
    source.includes("require(");

  if (hasEsmSyntax && !hasCommonJsSyntax) {
    return "module";
  }

  return "commonjs";
}

function writeManifest(pkg) {
  const manifestPath = path.join(pkg.dir, "package.json");
  if (fs.existsSync(manifestPath)) {
    return { status: "existing" };
  }

  const entry = chooseCandidate(pkg.dir, pkg.name);
  if (!entry) {
    return { status: "missing-entry" };
  }

  const entryPath = path.join(pkg.dir, entry);
  const type = detectModuleType(entryPath);
  const manifest = {
    name: pkg.name,
    private: true,
    main: `./${entry.replace(/\\/g, "/")}`,
    type,
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return { status: "written", entry: manifest.main, type };
}

function main() {
  const packages = listPackages(NODE_MODULES_DIR);
  let written = 0;
  let existing = 0;
  const missing = [];

  for (const pkg of packages) {
    const result = writeManifest(pkg);
    if (result.status === "written") {
      written += 1;
    } else if (result.status === "existing") {
      existing += 1;
    } else {
      missing.push(pkg.name);
    }
  }

  console.log(
    JSON.stringify(
      {
        packages: packages.length,
        written,
        existing,
        missing,
      },
      null,
      2,
    ),
  );
}

main();
