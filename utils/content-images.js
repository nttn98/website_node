const path = require("path");
const fs = require("fs");

const fsp = fs.promises;

function pushUnique(list, value) {
  const item = String(value || "").trim();
  if (!item || list.includes(item)) return;
  list.push(item);
}

function extractCssUrlSources(html) {
  const source = String(html || "");
  if (!source) return [];

  const result = [];
  const declarationRegex =
    /(?:^|[;{])\s*background(?:-image)?\s*:\s*([^;}{]+(?:\([^)]*\)[^;}{]*)*)/gi;
  const pushFromCssText = (cssText) => {
    const value = String(cssText || "");
    if (!value) return;

    let declarationMatch;
    while ((declarationMatch = declarationRegex.exec(value)) !== null) {
      const declarationValue = declarationMatch[1] || "";
      const urlRegex = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi;
      let match;

      while ((match = urlRegex.exec(declarationValue)) !== null) {
        pushUnique(result, match[1] || match[2] || match[3] || "");
      }
    }
  };

  const styleBlockRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = styleBlockRegex.exec(source)) !== null) {
    pushFromCssText(match[1]);
  }

  const styleAttrRegex = /style\s*=\s*(["'])([\s\S]*?)\1/gi;
  while ((match = styleAttrRegex.exec(source)) !== null) {
    pushFromCssText(match[2]);
  }

  return result;
}

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
    if (
      normalized.startsWith("/uploads/content/") ||
      normalized.startsWith("/uploads/pdf/")
    ) {
      result.add(normalized);
    }
  }

  extractCssUrlSources(source).forEach((value) => {
    const normalized = normalizePublicImagePath(value);
    if (normalized.startsWith("/uploads/content/")) {
      result.add(normalized);
    }
  });

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
    pushUnique(result, src);
  }

  extractCssUrlSources(source).forEach((src) => {
    pushUnique(result, src);
  });

  return result;
}

function extractPdfSources(html) {
  const source = String(html || "");
  if (!source) return [];

  const result = [];
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = re.exec(source)) !== null) {
    const href = String(match[1] || "").trim();
    if (!href) continue;

    let pathname = href;
    if (/^https?:\/\//i.test(href)) {
      try {
        pathname = new URL(href).pathname || "";
      } catch {
        pathname = href;
      }
    }
    pathname = pathname.split("?")[0].split("#")[0].toLowerCase();
    if (!pathname.endsWith(".pdf")) continue;

    if (!result.includes(href)) result.push(href);
  }
  return result;
}

function isServerContentImageSource(src, allowedHosts) {
  const value = String(src || "").trim();
  if (!value) return false;

  if (/^data:/i.test(value)) return false;
  if (/^(\.\.\/|\.\/)/.test(value)) return false;

  // YouTube/TikTok CDN thumbnails are valid external sources – do not block save
  if (
    /^https?:\/\/(img\.youtube\.com|i\.ytimg\.com)\/vi\/[A-Za-z0-9_-]+\//i.test(
      value
    ) ||
    /^https?:\/\/(?:[^/]+\.)?(tiktokcdn\.com|muscdn\.com)\//i.test(value)
  )
    return true;

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

  const imageSources = extractImageSources(html);
  const pdfSources = extractPdfSources(html);
  const allSources = [...imageSources, ...pdfSources];
  const invalidSources = allSources.filter(
    (src) => !isServerContentImageSource(src, allowedHosts)
  );

  return {
    isValid: invalidSources.length === 0,
    invalidSources,
    allSources,
    imageSources,
    pdfSources,
  };
}

module.exports = {
  removeUnusedContentImages,
  validateContentImageSources,
};
