function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value) {
  const source = String(value || "");
  if (!source) return "";

  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };

  return source.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    const normalized = String(entity || "").toLowerCase();
    if (normalized[0] === "#") {
      const isHex = normalized[1] === "x";
      const rawNumber = isHex ? normalized.slice(2) : normalized.slice(1);
      const parsed = parseInt(rawNumber, isHex ? 16 : 10);
      return Number.isNaN(parsed) ? match : String.fromCodePoint(parsed);
    }
    return Object.prototype.hasOwnProperty.call(named, normalized)
      ? named[normalized]
      : match;
  });
}

function stripHtml(value) {
  return decodeHtmlEntities(
    String(value || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function parseAttributes(openTag) {
  const attrs = {};
  const source = String(openTag || "");
  const attrRe =
    /([:@a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = attrRe.exec(source)) !== null) {
    const name = String(match[1] || "").toLowerCase();
    if (
      !name ||
      name === "div" ||
      name === "button" ||
      name === "a" ||
      name === "img"
    ) {
      continue;
    }
    attrs[name] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attrs;
}

function hasClass(attrValue, className) {
  const classes = String(attrValue || "")
    .split(/\s+/)
    .filter(Boolean);
  return classes.includes(className);
}

function findElementBlock(source, tagName, predicate, startIndex = 0) {
  const input = String(source || "");
  const re = new RegExp(`<${tagName}\\b[^>]*>`, "gi");
  re.lastIndex = startIndex;

  let match;
  while ((match = re.exec(input)) !== null) {
    const openTag = match[0];
    const attrs = parseAttributes(openTag);
    if (typeof predicate === "function" && !predicate(attrs, openTag)) {
      continue;
    }

    const end = findMatchingTagEnd(input, tagName, match.index, openTag);
    if (end === -1) return null;

    const openTagEnd = match.index + openTag.length;
    const outerHtml = input.slice(match.index, end);
    return {
      start: match.index,
      end,
      openTag,
      attrs,
      outerHtml,
      innerHtml: input.slice(openTagEnd, end - `</${tagName}>`.length),
    };
  }

  return null;
}

function findAllElementBlocks(source, tagName, predicate, startIndex = 0) {
  const items = [];
  const input = String(source || "");
  let cursor = startIndex;

  while (cursor < input.length) {
    const block = findElementBlock(input, tagName, predicate, cursor);
    if (!block) break;
    items.push(block);
    cursor = block.end;
  }

  return items;
}

function findMatchingTagEnd(source, tagName, openIndex, openTag) {
  const input = String(source || "");
  const tokenRe = new RegExp(`<(/?)${tagName}\\b[^>]*>`, "gi");
  const selfClosing = /\/\s*>$/.test(String(openTag || ""));
  if (selfClosing) {
    return openIndex + String(openTag).length;
  }

  tokenRe.lastIndex = openIndex;
  let depth = 0;
  let match;

  while ((match = tokenRe.exec(input)) !== null) {
    const token = match[0];
    const isClosing = match[1] === "/";
    const isSelfClosing = /\/\s*>$/.test(token);
    if (!isClosing) {
      depth += 1;
      if (isSelfClosing) depth -= 1;
    } else {
      depth -= 1;
    }

    if (depth === 0) {
      return tokenRe.lastIndex;
    }
  }

  return -1;
}

function extractAttr(source, tagName, attrName) {
  const re = new RegExp(
    "<" +
      tagName +
      "\\b[^>]*\\s" +
      attrName +
      "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))[^>]*>",
    "i"
  );
  const match = String(source || "").match(re);
  return String(match?.[1] || match?.[2] || match?.[3] || "").trim();
}

function extractTextByClass(source, className) {
  const re = new RegExp(
    `<([a-z0-9]+)\\b[^>]*class\\s*=\\s*(?:"([^"]*)"|'([^']*)')[^>]*>([\\s\\S]*?)<\\/\\1>`,
    "gi"
  );
  let match;
  while ((match = re.exec(String(source || ""))) !== null) {
    const classAttr = match[2] || match[3] || "";
    if (!hasClass(classAttr, className)) continue;
    return stripHtml(match[4]);
  }
  return "";
}

function extractSimpleTextByClass(source, className) {
  const safeClass = escapeRegExp(className);
  const re = new RegExp(
    `<[^>]*class\\s*=\\s*(?:"[^"]*\\b${safeClass}\\b[^"]*"|'[^']*\\b${safeClass}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    "i"
  );
  const match = String(source || "").match(re);
  return stripHtml(match?.[1] || "");
}

function extractClassTextOrValue(source, className) {
  const text = extractSimpleTextByClass(source, className);
  if (text) return text;

  const safeClass = escapeRegExp(className);
  const valueAttrRe = new RegExp(
    `<[^>]*class\\s*=\\s*(?:"[^"]*\\b${safeClass}\\b[^"]*"|'[^']*\\b${safeClass}\\b[^']*')[^>]*\\svalue\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))[^>]*>`,
    "i"
  );
  const valueAttrMatch = String(source || "").match(valueAttrRe);
  const directValue =
    valueAttrMatch?.[1] || valueAttrMatch?.[2] || valueAttrMatch?.[3] || "";
  if (directValue) return stripHtml(directValue);

  const containerRe = new RegExp(
    `<[^>]*class\\s*=\\s*(?:"[^"]*\\b${safeClass}\\b[^"]*"|'[^']*\\b${safeClass}\\b[^']*')[^>]*>([\\s\\S]*?)<\\/[^>]+>`,
    "i"
  );
  const containerMatch = String(source || "").match(containerRe);
  const containerHtml = String(containerMatch?.[1] || "");
  if (!containerHtml) return "";

  const inputValueMatch = containerHtml.match(
    /<(?:input|option)\b[^>]*\svalue\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>]+))[^>]*>/i
  );
  const inputValue =
    inputValueMatch?.[1] || inputValueMatch?.[2] || inputValueMatch?.[3] || "";
  if (inputValue) return stripHtml(inputValue);

  const selectedOptionMatch = containerHtml.match(
    /<option\b[^>]*selected[^>]*>([\s\S]*?)<\/option>/i
  );
  if (selectedOptionMatch?.[1]) return stripHtml(selectedOptionMatch[1]);

  const textareaMatch = containerHtml.match(
    /<textarea\b[^>]*>([\s\S]*?)<\/textarea>/i
  );
  if (textareaMatch?.[1]) return stripHtml(textareaMatch[1]);

  return "";
}

function isPdfUrl(url) {
  const value = String(url || "").trim();
  if (!value) return false;
  let pathname = value;
  if (/^https?:\/\//i.test(value)) {
    try {
      pathname = new URL(value).pathname || "";
    } catch {
      pathname = value;
    }
  }
  pathname = pathname.split("?")[0].split("#")[0].toLowerCase();
  return pathname.endsWith(".pdf");
}

function getYearFromDateText(dateValue) {
  const input = String(dateValue || "").trim();
  if (!input) return "";

  const dmyMatch = input.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (dmyMatch?.[3]) return dmyMatch[3];

  const ymdMatch = input.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
  if (ymdMatch?.[1]) return ymdMatch[1];

  const genericYearMatch = input.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
  if (genericYearMatch?.[1]) return genericYearMatch[1];

  const nativeDate = new Date(input);
  if (!Number.isNaN(nativeDate.getTime())) {
    return String(nativeDate.getFullYear());
  }

  return "";
}

function isPdfCard(block) {
  const href = extractAttr(block?.outerHtml, "a", "href");
  return isPdfUrl(href);
}

function extractCardsFromListHtml(listHtml) {
  const source = String(listHtml || "");
  const divCards = findAllElementBlocks(source, "div", (attrs) =>
    hasClass(attrs.class, "whitepaper-card")
  );

  return divCards
    .filter(isPdfCard)
    .map((block) => ({
      tagName: extractSimpleTextByClass(block.outerHtml, "card-tag"),
      title: extractClassTextOrValue(block.outerHtml, "card-title"),
      date: extractClassTextOrValue(block.outerHtml, "card-meta"),
      url: extractAttr(block.outerHtml, "a", "href"),
    }))
    .filter((item) => item.url || item.date || item.title);
}

function extractTabbedPdfData(html) {
  const source = String(html || "");
  if (!source) return [];

  const tabButtons = [];
  const buttonRe = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
  let buttonMatch;
  while ((buttonMatch = buttonRe.exec(source)) !== null) {
    const attrs = parseAttributes(`<button ${buttonMatch[1] || ""}>`);
    if (!hasClass(attrs.class, "ir-tab") || !attrs["data-tab"]) continue;
    tabButtons.push({
      tabId: String(attrs["data-tab"] || "").trim(),
      tagName: stripHtml(buttonMatch[2]),
    });
  }

  if (!tabButtons.length) return [];

  return tabButtons.flatMap((tab) => {
    if (!tab.tabId) return [];

    const wrapperBlock = findElementBlock(
      source,
      "div",
      (attrs) =>
        String(attrs.id || "").trim() === tab.tabId &&
        hasClass(attrs.class, "ir-list-wrapper")
    );
    if (!wrapperBlock) return [];

    const listBlock = findElementBlock(wrapperBlock.innerHtml, "div", (attrs) =>
      hasClass(attrs.class, "ir-list")
    );

    const cards = extractCardsFromListHtml(
      listBlock ? listBlock.innerHtml : wrapperBlock.innerHtml
    );

    return cards.map((card) => ({
      tagName: card.tagName || tab.tagName,
      title: card.title,
      url: card.url,
      date: card.date,
    }));
  });
}

function extractCardListPdfData(html) {
  const source = String(html || "");
  if (!source) return [];

  const cardBlocks = findAllElementBlocks(source, "div", (attrs) =>
    hasClass(attrs.class, "card-list")
  );

  return cardBlocks
    .map((block) => {
      const url = extractAttr(block.outerHtml, "a", "href");
      if (!isPdfUrl(url)) return null;

      return {
        tagName: "",
        title: extractClassTextOrValue(block.outerHtml, "card-title"),
        date: extractClassTextOrValue(block.outerHtml, "card-meta"),
        url,
      };
    })
    .filter(Boolean);
}

function extractDisclosurePdfData(html) {
  const source = String(html || "");
  if (!source) return [];

  const itemBlocks = findAllElementBlocks(source, "div", (attrs) =>
    hasClass(attrs.class, "ir-disclosure-item")
  );

  return itemBlocks
    .map((block) => {
      const url = extractAttr(block.outerHtml, "a", "href");
      if (!isPdfUrl(url)) return null;

      const date = extractClassTextOrValue(block.outerHtml, "card-meta");
      const title =
        extractSimpleTextByClass(block.outerHtml, "disclosure-title") ||
        (() => {
          const spanBlocks = findAllElementBlocks(
            block.outerHtml,
            "span",
            () => true
          );
          const titleSpan = spanBlocks.find(
            (span) => !hasClass(span.attrs.class, "card-meta")
          );
          return stripHtml(titleSpan?.innerHtml || "");
        })();

      return {
        tagName: String(
          block.attrs["data-tag-name"] || block.attrs["data-type"] || ""
        ).trim(),
        title,
        date,
        year: getYearFromDateText(date),
        url,
      };
    })
    .filter(Boolean);
}

function withDerivedGroupData(group) {
  if (!group || typeof group !== "object") return group;

  const pdfList = [
    ...extractTabbedPdfData(group.content),
    ...extractCardListPdfData(group.content),
    ...extractDisclosurePdfData(group.content),
  ];
  return {
    ...group,
    videoShareList: Array.isArray(group.videoShareList)
      ? group.videoShareList
      : [],
    pdfList,
    // Keep legacy field for clients still reading `data`.
  };
}

module.exports = {
  extractTabbedPdfData,
  extractCardListPdfData,
  extractDisclosurePdfData,
  withDerivedGroupData,
};
