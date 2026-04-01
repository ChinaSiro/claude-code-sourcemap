const fs = require("fs");
const path = require("path");

function readPackagedVersion() {
  try {
    const pkgPath = path.join(__dirname, "..", "package", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return {
      version: pkg.version || "0.0.0",
      packageName: pkg.name || "@anthropic-ai/claude-code",
    };
  } catch {
    return {
      version: "0.0.0",
      packageName: "@anthropic-ai/claude-code",
    };
  }
}

const packaged = readPackagedVersion();

globalThis.MACRO = new Proxy(
  {
    VERSION: packaged.version,
    PACKAGE_URL: packaged.packageName,
    NATIVE_PACKAGE_URL: packaged.packageName,
    FEEDBACK_CHANNEL: "the Claude Code issue tracker",
    ISSUES_EXPLAINER: "file an issue in the Claude Code issue tracker",
    BUILD_TIME: "",
  },
  {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      return "";
    },
  },
);
