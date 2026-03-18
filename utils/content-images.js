const path = require("path");
const fs = require("fs");

const fsp = fs.promises;

function normalizePublicImagePath(value) {
  let input = String(value || "")
    .trim()
    .replace(/\\/g, "/");
  if (!input) return "";

  if (/^https?:\/\//i.test(input)) {
    try {
      input = new URL(input).pathname || "";
    } catch {
      input = "";
    }
  }

  input = input.split("?")[0].split("#")[0];
  if (!input) return "";
  if (!input.startsWith("/")) input = `/${input}`;
  return input;
}

function extractContentUploadPaths(html) {
  const source = String(html || "");
  if (!source) return new Set();

  const result = new Set();
  const attrRegex = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = attrRegex.exec(source)) !== null) {
    const normalized = normalizePublicImagePath(match[1]);
    if (normalized.startsWith("/uploads/content/")) {
      result.add(normalized);
    }
  }

  return result;
}

function resolvePublicFilePath(publicRelativePath) {
  const publicRoot = path.resolve(__dirname, "../public");
  const relative = String(publicRelativePath || "").replace(/^\/+/, "");
  const absolute = path.resolve(publicRoot, relative);

  if (absolute !== publicRoot && !absolute.startsWith(publicRoot + path.sep)) {
    return null;
  }

  return absolute;
}

async function removeUnusedContentImages(previousHtml, nextHtml) {
  const prev = extractContentUploadPaths(previousHtml);
  const next = extractContentUploadPaths(nextHtml);

  const removed = [...prev].filter((item) => !next.has(item));
  if (!removed.length) return;

  await Promise.all(
    removed.map(async (publicPath) => {
      const filePath = resolvePublicFilePath(publicPath);
      if (!filePath) return;
      try {
        await fsp.unlink(filePath);
      } catch {
        // Best effort cleanup only.
      }
    })
  );
}

function extractImageSources(html) {
  const source = String(html || "");
  if (!source) return [];

  const result = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(source)) !== null) {
    const src = String(match[1] || "").trim();
    if (!src) continue;
    if (!result.includes(src)) result.push(src);
  }
  return result;
}

function isServerContentImageSource(src, allowedHosts) {
  const value = String(src || "").trim();
  if (!value) return false;

  if (/^data:/i.test(value)) return false;
  if (/^(\.\.\/|\.\/)/.test(value)) return false;

  if (/^\//.test(value)) {
    return /^\/(uploads|assets)\//i.test(value);
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const host = (u.host || "").toLowerCase();
      const okHost = allowedHosts.includes(host);
      const okPath = /^\/(uploads|assets)\//i.test(u.pathname || "");
      return okHost && okPath;
    } catch {
      return false;
    }
  }

  return false;
}

function validateContentImageSources(html, options = {}) {
  const allowedHosts = (options.allowedHosts || [])
    .map((h) =>
      String(h || "")
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);

  const sources = extractImageSources(html);
  const invalidSources = sources.filter(
    (src) => !isServerContentImageSource(src, allowedHosts)
  );

  return {
    isValid: invalidSources.length === 0,
    invalidSources,
    allSources: sources,
  };
}

module.exports = {
  removeUnusedContentImages,
  validateContentImageSources,
};
