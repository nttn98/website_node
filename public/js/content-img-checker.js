/**
 * ContentImgChecker
 * Detects local image paths pasted into HTML/CKEditor content,
 * warns the user, and lets them upload each image to replace the path.
 */
(function (global) {
  "use strict";

  /** Returns true if the src is a path on the user's local machine */
  function isLocalSrc(src) {
    if (!src) return false;
    // Allowed server origins: http(s)://, protocol-relative //, root-relative /, data:
    if (/^(https?:\/\/|\/\/|\/|data:)/i.test(src)) return false;
    return true;
  }

  /** Returns true if the image src is considered hosted on this server */
  function isServerHostedSrc(src) {
    var value = String(src || "").trim();
    if (!value) return false;

    // Inline data URLs are not stored on server.
    if (/^data:/i.test(value)) return false;

    // Relative non-root paths are not trusted (e.g. ../assets/foo.svg)
    if (/^(\.\.\/|\.\/)/.test(value)) return false;

    // Root-relative paths served by this app are trusted.
    if (/^\//.test(value)) {
      return /^\/(uploads|assets)\//i.test(value);
    }

    // Absolute URLs: only trust same-host images under /uploads or /assets.
    if (/^https?:\/\//i.test(value)) {
      try {
        var u = new URL(value);
        var sameHost =
          u.hostname === window.location.hostname &&
          (u.port || "") === (window.location.port || "");
        return sameHost && /^\/(uploads|assets)\//i.test(u.pathname || "");
      } catch {
        return false;
      }
    }

    // Protocol-relative URLs are treated as external/untrusted.
    if (/^\/\//.test(value)) return false;

    // Any other format is considered non-server.
    return false;
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizePathname(value) {
    var input = String(value || "").trim();
    if (!input) return "";

    if (/^https?:\/\//i.test(input)) {
      try {
        var parsed = new URL(input);
        input = parsed.pathname || "";
      } catch {
        return "";
      }
    }

    input = input.split("?")[0].split("#")[0];
    if (!input) return "";
    if (!/^\//.test(input)) input = "/" + input;
    return input;
  }

  function getSourceVariants(src) {
    var variants = [];
    var raw = String(src || "").trim();
    if (!raw) return variants;

    variants.push(raw);

    var pathname = normalizePathname(raw);
    if (pathname && variants.indexOf(pathname) === -1) {
      variants.push(pathname);
    }

    return variants;
  }

  function replaceAssetSourceInHtml(html, oldSrc, newSrc) {
    var nextHtml = String(html || "");
    var replacement = String(newSrc || "").trim();
    if (!nextHtml || !oldSrc || !replacement) return nextHtml;

    getSourceVariants(oldSrc).forEach(function (candidate) {
      var escaped = escapeRegExp(candidate);

      nextHtml = nextHtml
        .replace(new RegExp('"' + escaped + '"', "g"), '"' + replacement + '"')
        .replace(new RegExp("'" + escaped + "'", "g"), "'" + replacement + "'")
        .replace(
          new RegExp("url\\(\\s*(\"|')?" + escaped + "(\"|')?\\s*\\)", "g"),
          function (_, openQuote) {
            var quote = openQuote || "";
            return "url(" + quote + replacement + quote + ")";
          }
        );
    });

    return nextHtml;
  }

  function pushUniqueAsset(list, asset, options) {
    var item = asset && typeof asset === "object" ? asset : null;
    if (!item || !item.src) return;

    var allowDuplicate = !!(options && options.allowDuplicate);
    if (
      !allowDuplicate &&
      list.some(function (existing) {
        return existing.src === item.src && existing.type === item.type;
      })
    ) {
      return;
    }

    list.push(item);
  }

  function extractCssUrlValues(cssText) {
    var source = String(cssText || "");
    if (!source) return [];

    var found = [];
    var declarationRe =
      /(?:^|[;{])\s*background(?:-image)?\s*:\s*([^;}{]+(?:\([^)]*\)[^;}{]*)*)/gi;
    var declarationMatch;
    while ((declarationMatch = declarationRe.exec(source)) !== null) {
      var declarationValue = declarationMatch[1] || "";
      var re = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi;
      var m;
      while ((m = re.exec(declarationValue)) !== null) {
        var src = String(m[1] || m[2] || m[3] || "").trim();
        if (!src || /^data:/i.test(src)) continue;
        if (found.indexOf(src) !== -1) continue;
        found.push(src);
      }
    }
    return found;
  }

  function extractCssBackgroundAssets(html) {
    var source = String(html || "");
    if (!source) return [];

    var found = [];
    var m;

    function pushAssets(cssText) {
      extractCssUrlValues(cssText).forEach(function (src) {
        pushUniqueAsset(found, {
          src: src,
          isLocal: isLocalSrc(src),
          type: "image",
          assetKind: "background",
        });
      });
    }

    var styleBlockRe = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
    while ((m = styleBlockRe.exec(source)) !== null) {
      pushAssets(m[1]);
    }

    var styleAttrRe = /style\s*=\s*(["'])([\s\S]*?)\1/gi;
    while ((m = styleAttrRe.exec(source)) !== null) {
      pushAssets(m[2]);
    }

    return found;
  }

  function extractImageAssets(html) {
    var assets = [];

    extractImgs(html).forEach(function (item) {
      pushUniqueAsset(
        assets,
        {
          src: item.src,
          isLocal: item.isLocal,
          type: "image",
          assetKind: "image",
        },
        { allowDuplicate: isYoutubeThumbnailSrc(item.src) }
      );
    });

    extractCssBackgroundAssets(html).forEach(function (item) {
      pushUniqueAsset(assets, item);
    });

    return assets;
  }

  /** Extract all unique <img src="..."> values from an HTML string */
  function extractImgs(html) {
    const found = [];
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const src = String(m[1] || "").trim();
      if (!src) continue;
      // Keep duplicate YouTube thumbnails so each repeated video card
      // gets its own editable row in the checker panel.
      if (!isYoutubeThumbnailSrc(src) && found.some((x) => x.src === src)) {
        continue;
      }
      found.push({ src: src, isLocal: isLocalSrc(src) });
    }
    return found;
  }

  function extractPdfLinks(html) {
    const found = [];
    const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const href = String(m[1] || "").trim();
      if (!href) continue;

      var path = href;
      if (/^https?:\/\//i.test(href)) {
        try {
          path = new URL(href).pathname || "";
        } catch {
          path = href;
        }
      }
      path = path.split("?")[0].split("#")[0].toLowerCase();
      if (!path.endsWith(".pdf")) continue;

      if (found.some((x) => x.src === href)) continue;
      found.push({ src: href, isLocal: isLocalSrc(href), type: "pdf" });
    }
    return found;
  }

  // ── YouTube helpers ─────────────────────────────────────────────────────────
  function isYoutubeThumbnailSrc(src) {
    return /^https?:\/\/(img\.youtube\.com|i\.ytimg\.com)\/vi\/[A-Za-z0-9_-]+\//i.test(
      src
    );
  }

  function isTikTokThumbnailSrc(src) {
    return /^https?:\/\/(?:[^/]+\.)?(tiktokcdn\.com|muscdn\.com)\//i.test(
      String(src || "")
    );
  }

  function getYoutubeIdFromSrc(src) {
    var m = String(src || "").match(/\/vi\/([A-Za-z0-9_-]{11})\//);
    return m ? m[1] : null;
  }

  function extractYoutubeIdFromUrl(url) {
    url = String(url || "").trim();
    var m;
    m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    m = url.match(/youtube\.com\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    return null;
  }

  function detectVideoPlatform(url) {
    var value = String(url || "").toLowerCase();
    if (/youtu\.be|youtube\.com/.test(value)) return "youtube";
    if (/tiktok\.com/.test(value)) return "tiktok";
    return "unknown";
  }

  async function resolveVideoMetaFromUrl(url) {
    var inputUrl = String(url || "").trim();
    var platform = detectVideoPlatform(inputUrl);
    if (!inputUrl || platform === "unknown") return null;

    var endpoint = "";
    if (platform === "youtube") {
      endpoint =
        "https://www.youtube.com/oembed?url=" +
        encodeURIComponent(inputUrl) +
        "&format=json";
    } else if (platform === "tiktok") {
      endpoint =
        "https://www.tiktok.com/oembed?url=" + encodeURIComponent(inputUrl);
    }

    var res = await fetch(endpoint);
    if (!res.ok) return null;
    var meta = await res.json();
    var youtubeId =
      platform === "youtube" ? extractYoutubeIdFromUrl(inputUrl) : null;

    return {
      platform: platform,
      provider: String(meta.provider_name || platform).trim(),
      url: inputUrl,
      videoId: youtubeId,
      title: String(meta.title || "").trim(),
      thumbnailUrl: String(meta.thumbnail_url || "").trim(),
      authorName: String(meta.author_name || "").trim(),
    };
  }

  function getCurrentVideoGroup(html, videoId) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    var el = wrapper.querySelector('[data-video-id="' + videoId + '"]');
    return el ? el.getAttribute("data-video-group") || "video" : "video";
  }

  function getCurrentVideoTitle(html, videoId) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    var el = wrapper.querySelector('[data-video-id="' + videoId + '"]');
    if (!el) return "";

    var dataTitle = (el.getAttribute("data-video-title") || "").trim();
    if (dataTitle) return dataTitle;

    var titleEl = el.querySelector(".card-title");
    return titleEl ? (titleEl.textContent || "").trim() : "";
  }

  function replaceYoutubeVideoInHtml(
    html,
    oldId,
    newId,
    newGroup,
    newTitle,
    customThumbnailUrl
  ) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    wrapper
      .querySelectorAll('[data-video-id="' + oldId + '"]')
      .forEach(function (el) {
        el.setAttribute("data-video-id", newId);
        if (newGroup) {
          el.setAttribute("data-video-group", newGroup);
          var tagEl = el.querySelector(".card-tag");
          if (tagEl)
            tagEl.textContent = newGroup === "webinars" ? "Webinar" : "Video";
        }
        if (newTitle) {
          el.setAttribute("data-video-title", newTitle);
          var titleEl = el.querySelector(".card-title");
          if (titleEl) titleEl.textContent = newTitle;
        }
        el.querySelectorAll("img").forEach(function (img) {
          var imgSrc = img.getAttribute("src") || "";
          if (customThumbnailUrl) {
            img.setAttribute("src", customThumbnailUrl);
          } else if (/\/vi\/[A-Za-z0-9_-]+\//.test(imgSrc)) {
            img.setAttribute(
              "src",
              imgSrc.replace(/\/vi\/[A-Za-z0-9_-]+\//, "/vi/" + newId + "/")
            );
          }
        });
      });
    return wrapper.innerHTML;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getTodayDisplayDate() {
    var now = new Date();
    var day = String(now.getDate()).padStart(2, "0");
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var year = String(now.getFullYear());
    return day + "/" + month + "/" + year;
  }

  function getYearFromDateValue(dateValue) {
    var input = String(dateValue || "").trim();
    if (!input) return String(new Date().getFullYear());

    var slashMatch = input.match(/(?:^|\D)(\d{4})$/);
    if (slashMatch && slashMatch[1]) return slashMatch[1];

    var ymdMatch = input.match(/^(\d{4})[-/]/);
    if (ymdMatch && ymdMatch[1]) return ymdMatch[1];

    var nativeDate = new Date(input);
    if (!Number.isNaN(nativeDate.getTime())) {
      return String(nativeDate.getFullYear());
    }

    return String(new Date().getFullYear());
  }

  function toDisclosureTypeValue(tagName) {
    var normalized = String(tagName || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "");
    return normalized || "announcement";
  }

  function buildYoutubeCardHtml(videoId, group, title, thumbnailUrl) {
    var safeTitle = escapeHtml(title || "Video Title Goes Here");
    var safeGroup = group === "webinars" ? "webinars" : "video";
    var tagText = safeGroup === "webinars" ? "Webinar" : "Video";
    var src =
      thumbnailUrl ||
      "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

    return (
      '<article class="card no-shadow-hover video-card my-carousel-card" style="flex: 0 0 317px;">' +
      '<div class="video-trigger" data-video-id="' +
      escapeHtml(videoId) +
      '" data-video-group="' +
      safeGroup +
      '" data-video-title="' +
      safeTitle +
      '">' +
      '<div class="card-media">' +
      '<img src="' +
      escapeHtml(src) +
      '" alt="Video Title">' +
      '<span class="card-tag">' +
      tagText +
      "</span>" +
      '<div class="play-icon"><i class="fas fa-play"></i></div>' +
      "</div>" +
      '<div class="card-body"><h3 class="card-title">' +
      safeTitle +
      "</h3></div>" +
      "</div>" +
      "</article>"
    );
  }

  function buildVideoShareDataItem(meta, thumbnailUrl, title, tag) {
    return {
      linkUrl: String(meta.url || "").trim(),
      image: String(
        thumbnailUrl ||
          meta.thumbnailUrl ||
          (meta.videoId
            ? "https://img.youtube.com/vi/" + meta.videoId + "/hqdefault.jpg"
            : "")
      ).trim(),
      tag: String(tag || meta.provider || "Video").trim(),
      title: String(title || "Video Title Goes Here").trim(),
    };
  }

  function appendCardHtmlToTrack(html, cardHtml) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var track = wrapper.querySelector(".my-carousel-track");

    if (track) {
      // Add newest item on top (start of the track).
      track.insertAdjacentHTML("afterbegin", cardHtml);
      return wrapper.innerHTML;
    }

    // Fallback: put newest card first if no carousel track found.
    return cardHtml + wrapper.innerHTML;
  }

  function appendYoutubeCardToHtml(html, videoId, group, title, thumbnailUrl) {
    var cardHtml = buildYoutubeCardHtml(videoId, group, title, thumbnailUrl);
    return appendCardHtmlToTrack(html, cardHtml);
  }

  function appendVideoShareDataToHtml(html, meta, thumbnailUrl, title, tag) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var script = wrapper.querySelector('script[data-video-share-list="1"]');
    var list = [];

    if (script) {
      try {
        var parsed = JSON.parse(script.textContent || "[]");
        if (Array.isArray(parsed)) list = parsed;
      } catch {
        list = [];
      }
    }

    var item = buildVideoShareDataItem(meta, thumbnailUrl, title, tag);
    list.unshift(item);

    var text = JSON.stringify(list, null, 2);
    if (!script) {
      script = document.createElement("script");
      script.type = "application/json";
      script.setAttribute("data-video-share-list", "1");
      wrapper.appendChild(script);
    }
    script.textContent = text;

    return wrapper.innerHTML;
  }

  function extractVideoShareListFromHtml(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var script = wrapper.querySelector('script[data-video-share-list="1"]');
    if (!script) return [];
    try {
      var parsed = JSON.parse(script.textContent || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setVideoShareListToHtml(html, list) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var script = wrapper.querySelector('script[data-video-share-list="1"]');

    if (!script) {
      script = document.createElement("script");
      script.type = "application/json";
      script.setAttribute("data-video-share-list", "1");
      wrapper.appendChild(script);
    }

    script.textContent = JSON.stringify(
      Array.isArray(list) ? list : [],
      null,
      2
    );
    return wrapper.innerHTML;
  }

  function isPdfHrefValue(href) {
    var value = String(href || "").trim();
    if (!value) return false;
    var path = value;
    if (/^https?:\/\//i.test(value)) {
      try {
        path = new URL(value).pathname || "";
      } catch {
        path = value;
      }
    }
    path = path.split("?")[0].split("#")[0].toLowerCase();
    return path.endsWith(".pdf");
  }

  function getPdfCardSelector() {
    return ".whitepaper-card, article.card.card-horizontal, div.card.card-horizontal";
  }

  function getPdfCardsInContainer(container) {
    return Array.from(container.querySelectorAll(getPdfCardSelector())).filter(
      function (card) {
        var anchor = card.querySelector("a.card-link[href], a[href]");
        var href = anchor ? anchor.getAttribute("href") || "" : "";
        return isPdfHrefValue(href);
      }
    );
  }

  function findElementByExactId(root, id) {
    var targetId = String(id || "").trim();
    if (!root || !targetId) return null;
    return (
      Array.from(root.querySelectorAll("[id]")).find(function (node) {
        return String(node.id || "") === targetId;
      }) || null
    );
  }

  function getIrReportTabsFromWrapper(wrapper) {
    if (!wrapper) return [];

    return Array.from(wrapper.querySelectorAll(".ir-tabs .ir-tab[data-tab]"))
      .map(function (button) {
        var tabId = String(button.getAttribute("data-tab") || "").trim();
        if (!tabId) return null;

        var listWrapper = findElementByExactId(wrapper, tabId);
        if (
          !listWrapper ||
          !listWrapper.classList.contains("ir-list-wrapper")
        ) {
          return null;
        }

        var listEl = listWrapper.querySelector(".ir-list") || listWrapper;
        return {
          tabId: tabId,
          tagName: String(button.textContent || "").trim(),
          listWrapper: listWrapper,
          listEl: listEl,
          cards: getPdfCardsInContainer(listEl),
        };
      })
      .filter(Boolean);
  }

  function extractIrReportTabItems(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    return getIrReportTabsFromWrapper(wrapper).map(function (tab) {
      return {
        tabId: tab.tabId,
        tagName: tab.tagName,
        items: tab.cards.map(function (card) {
          var imgEl = card.querySelector(".card-thumb img, img");
          var titleEl = card.querySelector(".card-title");
          var dateEl = card.querySelector(".card-meta");
          var linkEl = card.querySelector("a.card-link, a[href], a");

          return {
            tagName: String(
              (card.querySelector(".card-tag") &&
                card.querySelector(".card-tag").textContent) ||
                tab.tagName ||
                ""
            ).trim(),
            title: String((titleEl && titleEl.textContent) || "").trim(),
            date: String((dateEl && dateEl.textContent) || "").trim(),
            img: String((imgEl && imgEl.getAttribute("src")) || "").trim(),
            url: String((linkEl && linkEl.getAttribute("href")) || "").trim(),
            linkText: String((linkEl && linkEl.textContent) || "").trim(),
            displayStyle: String(card.getAttribute("style") || "").trim(),
            className: String(card.getAttribute("class") || "").trim(),
            tagNameLower: String(card.tagName || "div").toLowerCase(),
          };
        }),
      };
    });
  }

  // ── Card List PDF Group (no tag) ──────────────────────────────────────────
  function detectCardListGroup(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var items = wrapper.querySelectorAll(".card-list");
    if (!items.length) return null;
    return { count: items.length };
  }

  function extractCardListItems(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var cards = wrapper.querySelectorAll(".card-list");

    return Array.from(cards)
      .map(function (card) {
        var titleEl = card.querySelector(".card-title");
        var dateEl = card.querySelector(".card-meta");
        var linkEl = card.querySelector("a[href], a");

        return {
          title: String((titleEl && titleEl.textContent) || "").trim(),
          date: String((dateEl && dateEl.textContent) || "").trim(),
          url: String((linkEl && linkEl.getAttribute("href")) || "").trim(),
        };
      })
      .filter(function (item) {
        return item.url && item.url.toLowerCase().endsWith(".pdf");
      });
  }

  function buildCardListItemHtml(payload) {
    var title = String(payload.title || "").trim();
    var date = String(payload.date || "").trim();
    var url = String(payload.url || "").trim();

    return (
      '<div class="card-list">' +
      '<h3 class="card-title">' +
      escapeHtml(title) +
      "</h3>" +
      '<p class="card-meta">' +
      escapeHtml(date) +
      "</p>" +
      '<a href="' +
      escapeHtml(url) +
      '" target="_blank" class="card-link">Download</a>' +
      "</div>"
    );
  }

  function appendCardListItemToHtml(html, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = wrapper.querySelectorAll(".card-list");
    if (!cards.length) return wrapper.innerHTML;

    var lastCard = cards[cards.length - 1];
    lastCard.insertAdjacentHTML("afterend", buildCardListItemHtml(payload));

    return wrapper.innerHTML;
  }

  function updateCardListItemInHtml(html, index, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = wrapper.querySelectorAll(".card-list");
    var target = cards[index];
    if (!target) return wrapper.innerHTML;

    target.outerHTML = buildCardListItemHtml(payload);
    return wrapper.innerHTML;
  }

  function deleteCardListItemInHtml(html, index) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = wrapper.querySelectorAll(".card-list");
    var target = cards[index];
    if (!target) return wrapper.innerHTML;

    target.remove();
    return wrapper.innerHTML;
  }

  function detectDisclosureListGroup(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var root = wrapper.querySelector("#disclosureList.disclosure-grid");
    if (!root) return null;
    var items = root.querySelectorAll(".ir-disclosure-item");
    if (!items.length) return null;
    return { count: items.length };
  }

  function extractDisclosureListItems(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var root = wrapper.querySelector("#disclosureList.disclosure-grid");
    if (!root) return [];

    return Array.from(root.querySelectorAll(".ir-disclosure-item"))
      .map(function (item) {
        var dateEl = item.querySelector(".card-meta");
        var titleEl =
          item.querySelector(".disclosure-title") ||
          Array.from(item.querySelectorAll("span")).find(function (span) {
            return !span.classList.contains("card-meta");
          });
        var linkEl = item.querySelector("a[href], a");

        return {
          type: String(item.getAttribute("data-type") || "").trim(),
          tagName: String(
            item.getAttribute("data-tag-name") ||
              item.getAttribute("data-type") ||
              ""
          ).trim(),
          year:
            String(item.getAttribute("data-year") || "").trim() ||
            getYearFromDateValue(
              String((dateEl && dateEl.textContent) || "").trim()
            ),
          date: String((dateEl && dateEl.textContent) || "").trim(),
          title: String((titleEl && titleEl.textContent) || "").trim(),
          url: String((linkEl && linkEl.getAttribute("href")) || "").trim(),
          style: String(item.getAttribute("style") || "").trim(),
          linkClass: String(
            (linkEl && linkEl.getAttribute("class")) || ""
          ).trim(),
        };
      })
      .filter(function (item) {
        return item.url && isPdfHrefValue(item.url);
      });
  }

  function buildDisclosureListItemHtml(payload, template) {
    var meta = template && typeof template === "object" ? template : {};
    var type = String(
      payload.type || toDisclosureTypeValue(payload.tagName || "")
    ).trim();
    var tagName = String(payload.tagName || payload.type || "").trim();
    var date = String(payload.date || "").trim();
    var year = String(payload.year || getYearFromDateValue(date)).trim();
    var title = String(payload.title || "").trim();
    var url = String(payload.url || "").trim();
    var style = String(
      payload.style ||
        meta.style ||
        "transition: opacity 0.25s; display: grid; opacity: 1;"
    ).trim();
    var linkClass = String(
      payload.linkClass || meta.linkClass || "btn-outline"
    ).trim();

    return (
      '<div class="ir-disclosure-item"' +
      ' data-type="' +
      escapeHtml(type) +
      '"' +
      (tagName ? ' data-tag-name="' + escapeHtml(tagName) + '"' : "") +
      (year ? ' data-year="' + escapeHtml(year) + '"' : "") +
      (style ? ' style="' + escapeHtml(style) + '"' : "") +
      ">" +
      '<span class="card-meta">' +
      escapeHtml(date) +
      "</span>" +
      "<span>" +
      escapeHtml(title) +
      "</span>" +
      '<a href="' +
      escapeHtml(url) +
      '" target="_blank" class="' +
      escapeHtml(linkClass || "btn-outline") +
      '">Download</a>' +
      "</div>"
    );
  }

  function appendDisclosureListItemToHtml(html, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var root = wrapper.querySelector("#disclosureList.disclosure-grid");
    if (!root) return wrapper.innerHTML;

    var items = root.querySelectorAll(".ir-disclosure-item");
    var last = items.length ? items[items.length - 1] : null;
    if (last) {
      last.insertAdjacentHTML(
        "afterend",
        buildDisclosureListItemHtml(payload, {
          style: String(last.getAttribute("style") || "").trim(),
          linkClass: String(
            (
              last.querySelector("a[href], a") || {
                getAttribute: function () {
                  return "btn-outline";
                },
              }
            ).getAttribute("class") || ""
          ).trim(),
        })
      );
    } else {
      root.insertAdjacentHTML(
        "beforeend",
        buildDisclosureListItemHtml(payload)
      );
    }

    return wrapper.innerHTML;
  }

  function updateDisclosureListItemInHtml(html, index, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var root = wrapper.querySelector("#disclosureList.disclosure-grid");
    if (!root) return wrapper.innerHTML;

    var items = root.querySelectorAll(".ir-disclosure-item");
    var target = items[index];
    if (!target) return wrapper.innerHTML;

    target.outerHTML = buildDisclosureListItemHtml(payload, {
      style: String(target.getAttribute("style") || "").trim(),
      linkClass: String(
        (
          target.querySelector("a[href], a") || {
            getAttribute: function () {
              return "btn-outline";
            },
          }
        ).getAttribute("class") || ""
      ).trim(),
    });
    return wrapper.innerHTML;
  }

  function deleteDisclosureListItemInHtml(html, index) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var root = wrapper.querySelector("#disclosureList.disclosure-grid");
    if (!root) return wrapper.innerHTML;

    var items = root.querySelectorAll(".ir-disclosure-item");
    var target = items[index];
    if (!target) return wrapper.innerHTML;
    target.remove();
    return wrapper.innerHTML;
  }

  function detectIrReportTabs(html) {
    var tabs = extractIrReportTabItems(html);
    if (!tabs.length) return null;

    return {
      tabCount: tabs.length,
      itemCount: tabs.reduce(function (total, tab) {
        return total + tab.items.length;
      }, 0),
    };
  }

  function getPdfArticleCards(wrapper) {
    return getPdfCardsInContainer(wrapper).filter(function (card) {
      return card.matches(
        "article.whitepaper-card, article.card.card-horizontal"
      );
    });
  }

  function getArticleCardsInParent(parent) {
    if (!parent) return [];
    return Array.from(parent.querySelectorAll(getPdfCardSelector())).filter(
      function (card) {
        return card.matches(
          "article.whitepaper-card, article.card.card-horizontal"
        );
      }
    );
  }

  function getPrimaryPdfArticleGroupCards(wrapper) {
    var pdfCards = getPdfArticleCards(wrapper);
    if (!pdfCards.length) return [];

    var firstCard = pdfCards[0];
    var parent = firstCard.parentElement;
    if (!parent) return [firstCard];

    var siblingCards = getArticleCardsInParent(parent);
    return siblingCards.length ? siblingCards : [firstCard];
  }

  function extractPdfArticleItems(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    return getPrimaryPdfArticleGroupCards(wrapper).map(function (card) {
      var imgEl = card.querySelector(".card-thumb img, img");
      var tagEl = card.querySelector(".card-tag");
      var titleEl = card.querySelector(".card-title");
      var descEl = card.querySelector(".card-desc");
      var linkEl = card.querySelector("a.card-link, a[href], a");

      return {
        imageUrl: String((imgEl && imgEl.getAttribute("src")) || "").trim(),
        tag: String((tagEl && tagEl.textContent) || "").trim(),
        title: String((titleEl && titleEl.textContent) || "").trim(),
        desc: String((descEl && descEl.textContent) || "").trim(),
        pdfUrl: String((linkEl && linkEl.getAttribute("href")) || "").trim(),
        linkText: String((linkEl && linkEl.textContent) || "").trim(),
      };
    });
  }

  function detectPdfArticleGroup(html) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = getPrimaryPdfArticleGroupCards(wrapper);
    if (!cards.length) return null;

    return {
      count: cards.length,
      hasWhitepaperClass: !!cards[0].matches(".whitepaper-card"),
    };
  }

  function buildPdfCardHtml(payload, useWhitepaperClass, cardClassOverride) {
    var cardClass = String(cardClassOverride || "").trim();
    if (!cardClass) {
      cardClass = useWhitepaperClass
        ? "card card-horizontal whitepaper-card"
        : "card card-horizontal";
    }

    return (
      '<article class="' +
      cardClass +
      '">' +
      '<div class="card-body">' +
      '<div class="card-thumb">' +
      '<img src="' +
      escapeHtml(payload.imageUrl) +
      '" alt="Whitepaper Thumbnail">' +
      "</div>" +
      '<div class="card-content">' +
      '<span class="card-tag">' +
      escapeHtml(payload.tag || "Customs") +
      "</span>" +
      '<h3 class="card-title">' +
      escapeHtml(payload.title) +
      "</h3>" +
      '<p class="card-desc">' +
      escapeHtml(payload.desc) +
      "</p>" +
      '<a href="' +
      escapeHtml(payload.pdfUrl) +
      '" class="card-link">' +
      escapeHtml(payload.linkText || "Download PDF") +
      "</a>" +
      "</div>" +
      "</div>" +
      "</article>"
    );
  }

  function appendPdfCardToHtml(html, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = getPrimaryPdfArticleGroupCards(wrapper);
    if (!cards.length) {
      return wrapper.innerHTML;
    }

    var firstCard = cards[0];
    var anchorCard = cards.length ? cards[cards.length - 1] : firstCard;

    anchorCard.insertAdjacentHTML(
      "afterend",
      buildPdfCardHtml(payload, !!firstCard.matches(".whitepaper-card"))
    );

    return wrapper.innerHTML;
  }

  function updatePdfArticleInHtml(html, index, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = getPrimaryPdfArticleGroupCards(wrapper);
    var target = cards[index];
    if (!target) return wrapper.innerHTML;

    var currentClass = String(target.getAttribute("class") || "").trim();
    target.outerHTML = buildPdfCardHtml(
      payload,
      target.matches(".whitepaper-card"),
      currentClass
    );

    return wrapper.innerHTML;
  }

  function deletePdfArticleInHtml(html, index) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var cards = getPrimaryPdfArticleGroupCards(wrapper);
    var target = cards[index];
    if (!target) return wrapper.innerHTML;

    target.remove();
    return wrapper.innerHTML;
  }

  function buildIrReportCardHtml(payload, templateItem) {
    var template = templateItem || {};
    var tagName = String(template.tagNameLower || "div").trim() || "div";
    var className = String(template.className || "whitepaper-card").trim();
    var styleValue = String(
      payload.displayStyle || template.displayStyle || "display: flex;"
    ).trim();
    var linkText = String(
      payload.linkText || template.linkText || "Download"
    ).trim();

    return (
      "<" +
      tagName +
      ' class="' +
      escapeHtml(className) +
      '"' +
      (styleValue ? ' style="' + escapeHtml(styleValue) + '"' : "") +
      ">" +
      '<div class="card-thumb">' +
      '<img src="' +
      escapeHtml(payload.img) +
      '">' +
      "</div>" +
      '<div class="card-content">' +
      "<div>" +
      '<div class="card-tag">' +
      escapeHtml(payload.tagName || "") +
      "</div>" +
      '<div class="card-title">' +
      escapeHtml(payload.title) +
      "</div>" +
      '<div class="card-meta">' +
      escapeHtml(payload.date) +
      "</div>" +
      "</div>" +
      "<div>" +
      '<a href="' +
      escapeHtml(payload.url) +
      '" target="_blank" class="card-link">' +
      escapeHtml(linkText) +
      "</a>" +
      "</div>" +
      "</div>" +
      "</" +
      tagName +
      ">"
    );
  }

  function appendIrReportItemToHtml(html, tabId, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var tabs = getIrReportTabsFromWrapper(wrapper);
    var tab = tabs.find(function (item) {
      return item.tabId === tabId;
    });
    if (!tab || !tab.listEl) return wrapper.innerHTML;

    tab.listEl.insertAdjacentHTML(
      "beforeend",
      buildIrReportCardHtml(payload, tab.cards[tab.cards.length - 1])
    );
    return wrapper.innerHTML;
  }

  function updateIrReportItemInHtml(html, tabId, index, payload) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var tabs = getIrReportTabsFromWrapper(wrapper);
    var tab = tabs.find(function (item) {
      return item.tabId === tabId;
    });
    var target = tab && tab.cards ? tab.cards[index] : null;
    if (!target) return wrapper.innerHTML;

    target.outerHTML = buildIrReportCardHtml(payload, {
      className: String(target.getAttribute("class") || "").trim(),
      displayStyle: String(target.getAttribute("style") || "").trim(),
      tagNameLower: String(target.tagName || "div").toLowerCase(),
      linkText: String(
        (
          target.querySelector("a.card-link, a[href], a") || {
            textContent: "Download",
          }
        ).textContent || "Download"
      ).trim(),
    });

    return wrapper.innerHTML;
  }

  function deleteIrReportItemInHtml(html, tabId, index) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var tabs = getIrReportTabsFromWrapper(wrapper);
    var tab = tabs.find(function (item) {
      return item.tabId === tabId;
    });
    var target = tab && tab.cards ? tab.cards[index] : null;
    if (!target) return wrapper.innerHTML;

    target.remove();
    return wrapper.innerHTML;
  }

  var irTagOptionsPromise = null;
  var irGroupTagOptions = [];

  function getCurrentGroupIdFromLocation() {
    var path = String(window.location.pathname || "");
    var match = path.match(/\/dashboard\/groups\/([a-fA-F0-9]{24})\/edit/i);
    return match ? String(match[1] || "").trim() : "";
  }

  function isObjectId(value) {
    return /^[a-fA-F0-9]{24}$/.test(String(value || "").trim());
  }

  function setIrGroupTagOptions(tabs) {
    var sourceTabs = Array.isArray(tabs) ? tabs : [];
    var seen = {};

    function pushTag(value) {
      var name = String(value || "").trim();
      if (!name) return;
      var key = name.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
    }

    sourceTabs.forEach(function (tab) {
      if (!tab || typeof tab !== "object") return;
      pushTag(tab.tagName);
      (Array.isArray(tab.items) ? tab.items : []).forEach(function (item) {
        pushTag(item && item.tagName);
      });
    });

    irTagOptionsPromise = null;
  }

  function loadIrTagOptions(forceRefresh) {
    if (!forceRefresh && irTagOptionsPromise) {
      return irTagOptionsPromise;
    }

    var groupId = getCurrentGroupIdFromLocation();
    var params = new URLSearchParams({
      targetType: "group",
      limit: "300",
    });
    if (isObjectId(groupId)) {
      params.set("specificId", groupId);
    }

    irTagOptionsPromise = fetch("/api/tags?" + params.toString())
      .then(function (res) {
        return res.json();
      })
      .then(function (payload) {
        var dbItems = Array.isArray(payload && payload.data)
          ? payload.data
          : [];
        var seen = {};
        var merged = [];

        function pushName(name) {
          var normalized = String(name || "").trim();
          if (!normalized) return;
          var key = normalized.toLowerCase();
          if (seen[key]) return;
          seen[key] = true;
          merged.push({ name: normalized });
        }

        dbItems.forEach(function (item) {
          pushName(item && item.name);
        });
        irGroupTagOptions.forEach(pushName);

        return merged;
      })
      .catch(function () {
        return irGroupTagOptions.map(function (name) {
          return { name: name };
        });
      });

    return irTagOptionsPromise;
  }

  function getIrSelectedTagName(selectEl, inputEl, fallback) {
    var manualValue = String((inputEl && inputEl.value) || "").trim();
    if (manualValue) return manualValue;

    var selectedValue = String((selectEl && selectEl.value) || "").trim();
    if (selectedValue) return selectedValue;

    return String(fallback || "").trim();
  }

  function fillIrTagSelect(selectEl, currentTagName) {
    var currentValue = String(currentTagName || "").trim();

    loadIrTagOptions().then(function (tags) {
      if (!selectEl) return;

      selectEl.innerHTML = "";

      var matchedValue = "";
      tags.forEach(function (tag) {
        var name = String((tag && tag.name) || "").trim();
        if (!name) return;
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        if (name.toLowerCase() === currentValue.toLowerCase()) {
          matchedValue = name;
        }
        selectEl.appendChild(option);
      });

      selectEl.value = matchedValue || (tags[0] && tags[0].name) || "";
    });
  }

  async function ensureIrTagExists(tagName) {
    var normalizedName = String(tagName || "").trim();
    if (!normalizedName) {
      throw new Error("tagName is required");
    }

    var existingTags = await loadIrTagOptions();
    var matched = existingTags.find(function (tag) {
      return (
        String((tag && tag.name) || "")
          .trim()
          .toLowerCase() === normalizedName.toLowerCase()
      );
    });
    if (matched) {
      return String(matched.name || normalizedName).trim();
    }

    var createRes = await fetch("/api/tags", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        (function () {
          var groupId = getCurrentGroupIdFromLocation();
          if (isObjectId(groupId)) {
            return {
              name: normalizedName,
              targetType: "group",
              specificId: groupId,
            };
          }

          return {
            name: normalizedName,
            targetType: "group",
          };
        })()
      ),
    });
    var createData = await createRes.json().catch(function () {
      return {};
    });

    // If it already exists in DB, continue with entered tag name.
    if (!createRes.ok && createData.message !== "Tag already exists") {
      throw new Error(createData.message || "Create tag failed");
    }

    if (
      !irGroupTagOptions.some(function (name) {
        return (
          String(name || "")
            .trim()
            .toLowerCase() === normalizedName.toLowerCase()
        );
      })
    ) {
      irGroupTagOptions.push(normalizedName);
    }
    irTagOptionsPromise = null;
    return String(
      (createData && createData.data && createData.data.name) || normalizedName
    ).trim();
  }

  function updateIrReportTabLabelInHtml(html, tabId, nextTagName) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");

    var targetButton = Array.from(
      wrapper.querySelectorAll(".ir-tabs .ir-tab[data-tab]")
    ).find(function (button) {
      return (
        String(button.getAttribute("data-tab") || "").trim() ===
        String(tabId || "").trim()
      );
    });

    if (!targetButton) return wrapper.innerHTML;
    targetButton.textContent = String(nextTagName || "").trim();
    return wrapper.innerHTML;
  }

  function renderIrReportTabsEditor(
    container,
    tabs,
    getHtml,
    setHtml,
    recheck
  ) {
    setIrGroupTagOptions(tabs);

    var panel = document.createElement("div");
    panel.className = "border rounded p-3 bg-white mb-2";

    var heading = document.createElement("div");
    heading.className = "fw-semibold mb-1";
    heading.textContent = "Investor Report Tabs";

    var subHeading = document.createElement("div");
    subHeading.className = "small text-muted mb-3";
    subHeading.textContent =
      "Manage PDF items inside each tab and keep API data synchronized.";

    panel.appendChild(heading);
    panel.appendChild(subHeading);

    tabs.forEach(function (tab) {
      var section = document.createElement("div");
      section.className = "border rounded p-3 mb-3 bg-light";

      var title = document.createElement("div");
      title.className =
        "d-flex align-items-center justify-content-between mb-2";
      title.innerHTML =
        '<span class="fw-semibold">Existing PDFs</span>' +
        '<span class="badge bg-secondary">' +
        tab.items.length +
        " PDF</span>";
      section.appendChild(title);

      var existingList = document.createElement("div");
      existingList.className = "d-flex flex-column gap-2 mb-3";

      if (!tab.items.length) {
        var emptyState = document.createElement("div");
        emptyState.className = "small text-muted";
        emptyState.textContent = "No PDF items in this tab yet.";
        existingList.appendChild(emptyState);
      }

      tab.items.forEach(function (item, idx) {
        var itemRow = document.createElement("div");
        itemRow.className =
          "d-flex align-items-start gap-2 p-2 border rounded bg-white flex-wrap";

        var thumb = document.createElement("img");
        thumb.alt = "Report thumbnail";
        thumb.style.width = "72px";
        thumb.style.height = "48px";
        thumb.style.objectFit = "cover";
        thumb.style.border = "1px solid #dee2e6";
        thumb.style.borderRadius = "4px";
        thumb.style.background = "#f8f9fa";
        thumb.style.flexShrink = "0";
        if (item.img) {
          thumb.src = item.img;
        } else {
          thumb.style.display = "none";
        }

        var editor = document.createElement("div");
        editor.className = "d-flex flex-column gap-2";
        editor.style.flex = "1";
        editor.style.minWidth = "320px";

        var tagRow = document.createElement("div");
        tagRow.className = "d-flex align-items-center gap-2 flex-wrap";

        var itemTagSelect = document.createElement("select");
        itemTagSelect.className = "form-select form-select-sm";
        itemTagSelect.style.maxWidth = "220px";

        var itemTagInput = document.createElement("input");
        itemTagInput.type = "text";
        itemTagInput.className = "form-control form-control-sm";
        itemTagInput.placeholder = "Choose or create new tagName";
        itemTagInput.value = item.tagName || tab.tagName || "";
        itemTagInput.style.maxWidth = "260px";

        fillIrTagSelect(itemTagSelect, item.tagName || tab.tagName);
        itemTagSelect.addEventListener("change", function () {
          if (itemTagSelect.value) {
            itemTagInput.value = itemTagSelect.value;
          }
        });

        tagRow.appendChild(itemTagSelect);
        tagRow.appendChild(itemTagInput);

        var rowA = document.createElement("div");
        rowA.className = "d-flex align-items-center gap-2 flex-wrap";

        var titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "form-control form-control-sm";
        titleInput.placeholder = "Title";
        titleInput.value = item.title || "";
        titleInput.style.flex = "1";
        titleInput.style.minWidth = "220px";

        var dateInput = document.createElement("input");
        dateInput.type = "text";
        dateInput.className = "form-control form-control-sm";
        dateInput.placeholder = "Date";
        dateInput.value = item.date || "";
        dateInput.style.maxWidth = "180px";

        rowA.appendChild(titleInput);
        rowA.appendChild(dateInput);

        var rowB = document.createElement("div");
        rowB.className = "d-flex align-items-center gap-2 flex-wrap";

        var imageUrlInput = document.createElement("input");
        imageUrlInput.type = "text";
        imageUrlInput.className = "form-control form-control-sm";
        imageUrlInput.placeholder = "Image URL";
        imageUrlInput.value = item.img || "";
        imageUrlInput.style.flex = "1";
        imageUrlInput.style.minWidth = "220px";

        var imageFileInput = document.createElement("input");
        imageFileInput.type = "file";
        imageFileInput.accept = "image/*";
        imageFileInput.className = "form-control form-control-sm";
        imageFileInput.style.maxWidth = "220px";

        rowB.appendChild(imageUrlInput);
        rowB.appendChild(imageFileInput);

        var rowC = document.createElement("div");
        rowC.className = "d-flex align-items-center gap-2 flex-wrap";

        var pdfUrlInput = document.createElement("input");
        pdfUrlInput.type = "text";
        pdfUrlInput.className = "form-control form-control-sm";
        pdfUrlInput.placeholder = "PDF URL";
        pdfUrlInput.value = item.url || "";
        pdfUrlInput.style.flex = "1";
        pdfUrlInput.style.minWidth = "220px";

        var pdfFileInput = document.createElement("input");
        pdfFileInput.type = "file";
        pdfFileInput.accept = ".pdf,application/pdf";
        pdfFileInput.className = "form-control form-control-sm";
        pdfFileInput.style.maxWidth = "220px";

        rowC.appendChild(pdfUrlInput);
        rowC.appendChild(pdfFileInput);

        var actions = document.createElement("div");
        actions.className = "d-flex align-items-center gap-2";

        var saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "btn btn-sm btn-primary";
        saveBtn.textContent = "Save";

        var deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "btn btn-sm btn-outline-danger";
        deleteBtn.textContent = "Delete";

        var status = document.createElement("span");
        status.className = "small";

        saveBtn.addEventListener("click", async function () {
          var nextTitle = String(titleInput.value || "").trim();
          var nextDate =
            String(dateInput.value || "").trim() || getTodayDisplayDate();
          var nextImageUrl = String(imageUrlInput.value || "").trim();
          var nextPdfUrl = String(pdfUrlInput.value || "").trim();
          var nextTagName = getIrSelectedTagName(
            itemTagSelect,
            itemTagInput,
            item.tagName || tab.tagName
          );

          if (!nextTitle || !nextTagName) {
            status.className = "small text-danger";
            status.textContent = "Title and tagName are required";
            return;
          }

          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          status.className = "small text-muted";
          status.textContent = "Preparing data...";

          try {
            nextTagName = await ensureIrTagExists(nextTagName);

            var imageFile = imageFileInput.files && imageFileInput.files[0];
            if (imageFile) {
              status.textContent = "Uploading image...";
              var imageFd = new FormData();
              imageFd.append("upload", imageFile);
              var imageRes = await fetch("/api/upload/content-image", {
                method: "POST",
                body: imageFd,
              });
              var imageData = await imageRes.json();
              if (!imageData.url) {
                throw new Error(
                  (imageData.error && imageData.error.message) ||
                    "Image upload failed"
                );
              }
              nextImageUrl = imageData.url;
            }

            var pdfFile = pdfFileInput.files && pdfFileInput.files[0];
            if (pdfFile) {
              status.textContent = "Uploading PDF...";
              var pdfFd = new FormData();
              pdfFd.append("upload", pdfFile);
              var pdfRes = await fetch("/api/upload/content-pdf", {
                method: "POST",
                body: pdfFd,
              });
              var pdfData = await pdfRes.json();
              if (!pdfData.url) {
                throw new Error(
                  (pdfData.error && pdfData.error.message) ||
                    "PDF upload failed"
                );
              }
              nextPdfUrl = pdfData.url;
            }

            if (!nextImageUrl) {
              throw new Error("Image URL or upload is required");
            }
            if (!nextPdfUrl || !isPdfHrefValue(nextPdfUrl)) {
              throw new Error("Valid PDF URL or PDF upload is required");
            }

            var nextHtml = updateIrReportItemInHtml(getHtml(), tab.tabId, idx, {
              tagName: nextTagName,
              title: nextTitle,
              date: nextDate,
              img: nextImageUrl,
              url: nextPdfUrl,
              linkText: item.linkText || "Download",
              displayStyle: item.displayStyle,
            });

            setHtml(nextHtml);

            status.className = "small text-success";
            status.textContent = "Saved";
            setTimeout(recheck, 120);
          } catch (err) {
            status.className = "small text-danger";
            status.textContent = String(err.message || err);
          } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save";
          }
        });

        deleteBtn.addEventListener("click", function () {
          setHtml(deleteIrReportItemInHtml(getHtml(), tab.tabId, idx));
          setTimeout(recheck, 120);
        });

        actions.appendChild(saveBtn);
        actions.appendChild(deleteBtn);
        actions.appendChild(status);

        editor.appendChild(tagRow);
        editor.appendChild(rowA);
        editor.appendChild(rowB);
        editor.appendChild(rowC);
        editor.appendChild(actions);

        itemRow.appendChild(thumb);
        itemRow.appendChild(editor);
        existingList.appendChild(itemRow);
      });

      section.appendChild(existingList);

      var addWrap = document.createElement("div");
      addWrap.className = "border-top pt-3";

      var addTitle = document.createElement("div");
      addTitle.className = "small fw-semibold mb-2";
      addTitle.textContent = "Add PDF item";
      addWrap.appendChild(addTitle);

      var addTagRow = document.createElement("div");
      addTagRow.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

      var newTagSelect = document.createElement("select");
      newTagSelect.className = "form-select form-select-sm";
      newTagSelect.style.maxWidth = "220px";

      var newTagInput = document.createElement("input");
      newTagInput.type = "text";
      newTagInput.className = "form-control form-control-sm";
      newTagInput.placeholder = "Choose or create new tagName";
      newTagInput.value = tab.tagName || "";
      newTagInput.style.maxWidth = "260px";

      fillIrTagSelect(newTagSelect, tab.tagName);
      newTagSelect.addEventListener("change", function () {
        if (newTagSelect.value) {
          newTagInput.value = newTagSelect.value;
        }
      });

      addTagRow.appendChild(newTagSelect);
      addTagRow.appendChild(newTagInput);

      var addRowA = document.createElement("div");
      addRowA.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

      var newTitleInput = document.createElement("input");
      newTitleInput.type = "text";
      newTitleInput.className = "form-control form-control-sm";
      newTitleInput.placeholder = "Title";
      newTitleInput.style.flex = "1";
      newTitleInput.style.minWidth = "220px";

      var newDateInput = document.createElement("input");
      newDateInput.type = "text";
      newDateInput.className = "form-control form-control-sm";
      newDateInput.placeholder = "Date";
      newDateInput.style.maxWidth = "180px";

      addRowA.appendChild(newTitleInput);
      addRowA.appendChild(newDateInput);

      var addRowB = document.createElement("div");
      addRowB.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

      var newImageUrlInput = document.createElement("input");
      newImageUrlInput.type = "text";
      newImageUrlInput.className = "form-control form-control-sm";
      newImageUrlInput.placeholder = "Image URL";
      newImageUrlInput.style.flex = "1";
      newImageUrlInput.style.minWidth = "220px";

      var newImageFileInput = document.createElement("input");
      newImageFileInput.type = "file";
      newImageFileInput.accept = "image/*";
      newImageFileInput.className = "form-control form-control-sm";
      newImageFileInput.style.maxWidth = "220px";

      addRowB.appendChild(newImageUrlInput);
      addRowB.appendChild(newImageFileInput);

      var addRowC = document.createElement("div");
      addRowC.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

      var newPdfUrlInput = document.createElement("input");
      newPdfUrlInput.type = "text";
      newPdfUrlInput.className = "form-control form-control-sm";
      newPdfUrlInput.placeholder = "PDF URL";
      newPdfUrlInput.style.flex = "1";
      newPdfUrlInput.style.minWidth = "220px";

      var newPdfFileInput = document.createElement("input");
      newPdfFileInput.type = "file";
      newPdfFileInput.accept = ".pdf,application/pdf";
      newPdfFileInput.className = "form-control form-control-sm";
      newPdfFileInput.style.maxWidth = "220px";

      addRowC.appendChild(newPdfUrlInput);
      addRowC.appendChild(newPdfFileInput);

      var addActions = document.createElement("div");
      addActions.className = "d-flex align-items-center gap-2";

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-sm btn-primary";
      addBtn.textContent = "Add PDF";

      var addStatus = document.createElement("span");
      addStatus.className = "small";

      addBtn.addEventListener("click", async function () {
        var nextTitle = String(newTitleInput.value || "").trim();
        var nextDate =
          String(newDateInput.value || "").trim() || getTodayDisplayDate();
        var nextImageUrl = String(newImageUrlInput.value || "").trim();
        var nextPdfUrl = String(newPdfUrlInput.value || "").trim();
        var nextTagName = getIrSelectedTagName(
          newTagSelect,
          newTagInput,
          tab.tagName
        );

        if (!nextTitle || !nextTagName) {
          addStatus.className = "small text-danger";
          addStatus.textContent = "Title and tagName are required";
          return;
        }

        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        addStatus.className = "small text-muted";
        addStatus.textContent = "Preparing data...";

        try {
          nextTagName = await ensureIrTagExists(nextTagName);

          var imageFile = newImageFileInput.files && newImageFileInput.files[0];
          if (imageFile) {
            addStatus.textContent = "Uploading image...";
            var imageFd = new FormData();
            imageFd.append("upload", imageFile);
            var imageRes = await fetch("/api/upload/content-image", {
              method: "POST",
              body: imageFd,
            });
            var imageData = await imageRes.json();
            if (!imageData.url) {
              throw new Error(
                (imageData.error && imageData.error.message) ||
                  "Image upload failed"
              );
            }
            nextImageUrl = imageData.url;
          }

          var pdfFile = newPdfFileInput.files && newPdfFileInput.files[0];
          if (pdfFile) {
            addStatus.textContent = "Uploading PDF...";
            var pdfFd = new FormData();
            pdfFd.append("upload", pdfFile);
            var pdfRes = await fetch("/api/upload/content-pdf", {
              method: "POST",
              body: pdfFd,
            });
            var pdfData = await pdfRes.json();
            if (!pdfData.url) {
              throw new Error(
                (pdfData.error && pdfData.error.message) || "PDF upload failed"
              );
            }
            nextPdfUrl = pdfData.url;
          }

          if (!nextImageUrl) {
            throw new Error("Image URL or upload is required");
          }
          if (!nextPdfUrl || !isPdfHrefValue(nextPdfUrl)) {
            throw new Error("Valid PDF URL or PDF upload is required");
          }

          var nextHtml = appendIrReportItemToHtml(getHtml(), tab.tabId, {
            tagName: nextTagName,
            title: nextTitle,
            date: nextDate,
            img: nextImageUrl,
            url: nextPdfUrl,
            linkText: "Download",
          });

          setHtml(nextHtml);

          addStatus.className = "small text-success";
          addStatus.textContent = "Added";
          setTimeout(recheck, 120);
        } catch (err) {
          addStatus.className = "small text-danger";
          addStatus.textContent = String(err.message || err);
        } finally {
          addBtn.disabled = false;
          addBtn.textContent = "Add PDF";
        }
      });

      addWrap.appendChild(addTagRow);
      addActions.appendChild(addBtn);
      addActions.appendChild(addStatus);

      addWrap.appendChild(addRowA);
      addWrap.appendChild(addRowB);
      addWrap.appendChild(addRowC);
      addWrap.appendChild(addActions);
      section.appendChild(addWrap);

      panel.appendChild(section);
    });

    container.appendChild(panel);
  }

  function renderCardListEditor(container, items, getHtml, setHtml, recheck) {
    var panel = document.createElement("div");
    panel.className = "border rounded p-3 bg-white mb-2";

    var heading = document.createElement("div");
    heading.className = "fw-semibold mb-1";
    heading.textContent = "Charter & Governance PDFs";

    var subHeading = document.createElement("div");
    subHeading.className = "small text-muted mb-3";
    subHeading.textContent = "Manage PDF items and keep API data synchronized.";

    panel.appendChild(heading);
    panel.appendChild(subHeading);

    var section = document.createElement("div");
    section.className = "border rounded p-3 mb-3 bg-light";

    var title = document.createElement("div");
    title.className = "d-flex align-items-center justify-content-between mb-2";
    title.innerHTML =
      '<span class="fw-semibold">Existing PDFs</span>' +
      '<span class="badge bg-secondary">' +
      items.length +
      " PDF</span>";
    section.appendChild(title);

    var existingList = document.createElement("div");
    existingList.className = "d-flex flex-column gap-2 mb-3";

    if (!items.length) {
      var emptyState = document.createElement("div");
      emptyState.className = "small text-muted";
      emptyState.textContent = "No PDF items yet.";
      existingList.appendChild(emptyState);
    }

    items.forEach(function (item, idx) {
      var itemRow = document.createElement("div");
      itemRow.className =
        "d-flex align-items-start gap-2 p-2 border rounded bg-white flex-wrap";

      var indexSpan = document.createElement("div");
      indexSpan.className = "small fw-semibold text-muted";
      indexSpan.style.minWidth = "20px";
      indexSpan.textContent = "#" + (idx + 1);

      var editor = document.createElement("div");
      editor.className = "d-flex flex-column gap-2";
      editor.style.flex = "1";
      editor.style.minWidth = "320px";

      var tagRow = document.createElement("div");
      tagRow.className = "d-flex align-items-center gap-2 flex-wrap";

      var tagInput = document.createElement("input");
      tagInput.type = "text";
      tagInput.className = "form-control form-control-sm";
      tagInput.placeholder = "Tag (N/A for Charter)";
      tagInput.value = item.tagName || "";
      tagInput.style.maxWidth = "200px";
      tagInput.disabled = true;

      tagRow.appendChild(tagInput);

      var rowA = document.createElement("div");
      rowA.className = "d-flex align-items-center gap-2 flex-wrap";

      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "form-control form-control-sm";
      titleInput.placeholder = "Title";
      titleInput.value = item.title || "";
      titleInput.style.flex = "1";
      titleInput.style.minWidth = "220px";

      var dateInput = document.createElement("input");
      dateInput.type = "text";
      dateInput.className = "form-control form-control-sm";
      dateInput.placeholder = "Date (DD/MM/YYYY)";
      dateInput.value = item.date || "";
      dateInput.style.maxWidth = "140px";

      rowA.appendChild(titleInput);
      rowA.appendChild(dateInput);

      var rowB = document.createElement("div");
      rowB.className = "d-flex align-items-center gap-2 flex-wrap";

      var urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "form-control form-control-sm";
      urlInput.placeholder = "PDF URL";
      urlInput.value = item.url || "";
      urlInput.style.flex = "1";
      urlInput.style.minWidth = "280px";

      var pdfFileInput = document.createElement("input");
      pdfFileInput.type = "file";
      pdfFileInput.accept = ".pdf,application/pdf";
      pdfFileInput.style.display = "none";

      var chooseFileBtn = document.createElement("button");
      chooseFileBtn.type = "button";
      chooseFileBtn.className = "btn btn-sm btn-outline-secondary";
      chooseFileBtn.textContent = "Choose File";
      chooseFileBtn.style.flexShrink = "0";

      var itemFileNameDisplay = document.createElement("div");
      itemFileNameDisplay.className = "small text-muted";
      itemFileNameDisplay.style.minWidth = "100px";
      itemFileNameDisplay.style.flexShrink = "0";
      itemFileNameDisplay.textContent = "No file chosen";

      chooseFileBtn.addEventListener("click", function () {
        pdfFileInput.click();
      });

      pdfFileInput.addEventListener("change", function () {
        if (
          pdfFileInput.files &&
          pdfFileInput.files[0] &&
          pdfFileInput.files[0].name
        ) {
          itemFileNameDisplay.textContent = String(
            pdfFileInput.files[0].name || ""
          ).trim();
        } else {
          itemFileNameDisplay.textContent = "No file chosen";
        }
      });

      rowB.appendChild(urlInput);
      rowB.appendChild(chooseFileBtn);
      rowB.appendChild(itemFileNameDisplay);

      var actions = document.createElement("div");
      actions.className = "d-flex align-items-center gap-1 flex-wrap";

      var saveBtn = document.createElement("button");
      saveBtn.className = "btn btn-sm btn-outline-primary";
      saveBtn.textContent = "Save";

      var deleteBtn = document.createElement("button");
      deleteBtn.className = "btn btn-sm btn-outline-danger";
      deleteBtn.textContent = "Delete";

      var status = document.createElement("div");
      status.className = "small text-muted";

      saveBtn.type = "button";
      saveBtn.addEventListener("click", async function () {
        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          status.textContent = "";

          var nextTitle = String(titleInput.value || "").trim();
          var nextDate = String(dateInput.value || "").trim();
          var nextUrl = String(urlInput.value || "").trim();

          if (pdfFileInput.files && pdfFileInput.files[0]) {
            status.className = "small text-muted";
            status.textContent = "Uploading PDF...";
            var pdfFd = new FormData();
            pdfFd.append("upload", pdfFileInput.files[0]);
            var pdfRes = await fetch("/api/upload/content-pdf", {
              method: "POST",
              body: pdfFd,
            });
            var pdfData = await pdfRes.json();
            if (!pdfData.url) {
              throw new Error(
                (pdfData.error && pdfData.error.message) || "PDF upload failed"
              );
            }
            nextUrl = pdfData.url;
          }

          if (!nextUrl || !nextUrl.toLowerCase().endsWith(".pdf")) {
            throw new Error("Valid PDF URL is required");
          }

          var nextHtml = updateCardListItemInHtml(getHtml(), idx, {
            title: nextTitle,
            date: nextDate,
            url: nextUrl,
          });

          setHtml(nextHtml);
          urlInput.value = nextUrl;
          pdfFileInput.value = "";
          itemFileNameDisplay.textContent = "No file chosen";
          status.className = "small text-success";
          status.textContent = "Saved";
          setTimeout(recheck, 120);
        } catch (err) {
          status.className = "small text-danger";
          status.textContent = String(err.message || err);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }
      });

      deleteBtn.type = "button";
      deleteBtn.addEventListener("click", function () {
        setHtml(deleteCardListItemInHtml(getHtml(), idx));
        setTimeout(recheck, 120);
      });

      actions.appendChild(saveBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(status);

      editor.appendChild(tagRow);
      editor.appendChild(rowA);
      editor.appendChild(rowB);
      editor.appendChild(actions);

      itemRow.appendChild(indexSpan);
      itemRow.appendChild(editor);
      existingList.appendChild(itemRow);
    });

    section.appendChild(existingList);

    var addWrap = document.createElement("div");
    addWrap.className = "border-top pt-3";

    var addTitle = document.createElement("div");
    addTitle.className = "small fw-semibold mb-2";
    addTitle.textContent = "Add PDF item";
    addWrap.appendChild(addTitle);

    var addTagRow = document.createElement("div");
    addTagRow.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newTagInput = document.createElement("input");
    newTagInput.type = "text";
    newTagInput.className = "form-control form-control-sm";
    newTagInput.placeholder = "Tag (N/A for Charter)";
    newTagInput.value = "";
    newTagInput.style.maxWidth = "200px";
    newTagInput.disabled = true;

    addTagRow.appendChild(newTagInput);

    var addRowA = document.createElement("div");
    addRowA.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newTitleInput = document.createElement("input");
    newTitleInput.type = "text";
    newTitleInput.className = "form-control form-control-sm";
    newTitleInput.placeholder = "Title";
    newTitleInput.style.flex = "1";
    newTitleInput.style.minWidth = "220px";

    var newDateInput = document.createElement("input");
    newDateInput.type = "text";
    newDateInput.className = "form-control form-control-sm";
    newDateInput.placeholder = "Date";
    newDateInput.style.maxWidth = "140px";

    addRowA.appendChild(newTitleInput);
    addRowA.appendChild(newDateInput);

    var addRowB = document.createElement("div");
    addRowB.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newUrlInput = document.createElement("input");
    newUrlInput.type = "text";
    newUrlInput.className = "form-control form-control-sm";
    newUrlInput.placeholder = "PDF URL";
    newUrlInput.style.flex = "1";
    newUrlInput.style.minWidth = "280px";

    var newPdfFileInput = document.createElement("input");
    newPdfFileInput.type = "file";
    newPdfFileInput.accept = ".pdf,application/pdf";
    newPdfFileInput.style.display = "none";

    var chooseFileBtn = document.createElement("button");
    chooseFileBtn.type = "button";
    chooseFileBtn.className = "btn btn-sm btn-outline-secondary";
    chooseFileBtn.textContent = "Choose File";
    chooseFileBtn.style.flexShrink = "0";

    var fileNameDisplay = document.createElement("div");
    fileNameDisplay.className = "small text-muted";
    fileNameDisplay.style.minWidth = "100px";
    fileNameDisplay.style.flexShrink = "0";
    fileNameDisplay.textContent = "No file chosen";

    chooseFileBtn.addEventListener("click", function () {
      newPdfFileInput.click();
    });

    newPdfFileInput.addEventListener("change", function () {
      if (
        newPdfFileInput.files &&
        newPdfFileInput.files[0] &&
        newPdfFileInput.files[0].name
      ) {
        var fileName = String(newPdfFileInput.files[0].name || "").trim();
        fileNameDisplay.textContent = fileName;
      } else {
        fileNameDisplay.textContent = "No file chosen";
      }
    });

    addRowB.appendChild(newUrlInput);
    addRowB.appendChild(chooseFileBtn);
    addRowB.appendChild(fileNameDisplay);

    var addActions = document.createElement("div");
    addActions.className = "d-flex align-items-center gap-1 flex-wrap";

    var addBtn = document.createElement("button");
    addBtn.className = "btn btn-sm btn-success";
    addBtn.textContent = "Add PDF";

    var addStatus = document.createElement("div");
    addStatus.className = "small text-muted";

    addBtn.addEventListener("click", async function () {
      try {
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        addStatus.textContent = "";

        var nextTitle = String(newTitleInput.value || "").trim();
        var nextDate = String(newDateInput.value || "").trim();
        var nextUrl = String(newUrlInput.value || "").trim();

        if (newPdfFileInput.files && newPdfFileInput.files[0]) {
          addStatus.textContent = "Uploading PDF...";
          var pdfFd = new FormData();
          pdfFd.append("upload", newPdfFileInput.files[0]);
          var pdfRes = await fetch("/api/upload/content-pdf", {
            method: "POST",
            body: pdfFd,
          });
          var pdfData = await pdfRes.json();
          if (!pdfData.url) {
            throw new Error(
              (pdfData.error && pdfData.error.message) || "PDF upload failed"
            );
          }
          nextUrl = pdfData.url;
        }

        if (!nextUrl || !nextUrl.toLowerCase().endsWith(".pdf")) {
          throw new Error("Valid PDF URL or PDF upload is required");
        }

        var nextHtml = appendCardListItemToHtml(getHtml(), {
          title: nextTitle,
          date: nextDate,
          url: nextUrl,
        });

        setHtml(nextHtml);

        newTitleInput.value = "";
        newDateInput.value = "";
        newUrlInput.value = "";
        newPdfFileInput.value = "";
        fileNameDisplay.textContent = "No file chosen";

        addStatus.className = "small text-success";
        addStatus.textContent = "Added";
        setTimeout(recheck, 120);
      } catch (err) {
        addStatus.className = "small text-danger";
        addStatus.textContent = String(err.message || err);
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = "Add PDF";
      }
    });

    addActions.appendChild(addBtn);
    addActions.appendChild(addStatus);

    addWrap.appendChild(addTagRow);
    addWrap.appendChild(addRowA);
    addWrap.appendChild(addRowB);
    addWrap.appendChild(addActions);

    section.appendChild(addWrap);
    panel.appendChild(section);
    container.appendChild(panel);
  }

  function renderDisclosureListEditor(
    container,
    items,
    getHtml,
    setHtml,
    recheck
  ) {
    var panel = document.createElement("div");
    panel.className = "border rounded p-3 bg-white mb-2";

    var heading = document.createElement("div");
    heading.className = "fw-semibold mb-1";
    heading.textContent = "Disclosure PDFs";

    var subHeading = document.createElement("div");
    subHeading.className = "small text-muted mb-3";
    subHeading.textContent =
      "Manage disclosure announcements/reports/notices and keep API data synchronized.";

    panel.appendChild(heading);
    panel.appendChild(subHeading);

    var section = document.createElement("div");
    section.className = "border rounded p-3 mb-3 bg-light";

    var title = document.createElement("div");
    title.className = "d-flex align-items-center justify-content-between mb-2";
    title.innerHTML =
      '<span class="fw-semibold">Existing PDFs</span>' +
      '<span class="badge bg-secondary">' +
      items.length +
      " PDF</span>";
    section.appendChild(title);

    var existingList = document.createElement("div");
    existingList.className = "d-flex flex-column gap-2 mb-3";

    if (!items.length) {
      var emptyState = document.createElement("div");
      emptyState.className = "small text-muted";
      emptyState.textContent = "No disclosure items yet.";
      existingList.appendChild(emptyState);
    }

    items.forEach(function (item, idx) {
      var itemRow = document.createElement("div");
      itemRow.className =
        "d-flex align-items-start gap-2 p-2 border rounded bg-white flex-wrap";

      var indexSpan = document.createElement("div");
      indexSpan.className = "small fw-semibold text-muted";
      indexSpan.style.minWidth = "20px";
      indexSpan.textContent = "#" + (idx + 1);

      var editor = document.createElement("div");
      editor.className = "d-flex flex-column gap-2";
      editor.style.flex = "1";
      editor.style.minWidth = "320px";

      var rowA = document.createElement("div");
      rowA.className = "d-flex align-items-center gap-2 flex-wrap";

      var itemTagSelect = document.createElement("select");
      itemTagSelect.className = "form-select form-select-sm";
      itemTagSelect.style.maxWidth = "220px";

      var itemTagInput = document.createElement("input");
      itemTagInput.type = "text";
      itemTagInput.className = "form-control form-control-sm";
      itemTagInput.placeholder = "Choose or create new tagName";
      itemTagInput.value = item.tagName || item.type || "";
      itemTagInput.style.maxWidth = "260px";

      fillIrTagSelect(itemTagSelect, item.tagName || item.type);
      itemTagSelect.addEventListener("change", function () {
        if (itemTagSelect.value) {
          itemTagInput.value = itemTagSelect.value;
        }
      });

      var dateInput = document.createElement("input");
      dateInput.type = "text";
      dateInput.className = "form-control form-control-sm";
      dateInput.placeholder = "Date";
      dateInput.value = item.date || "";
      dateInput.style.maxWidth = "160px";

      rowA.appendChild(itemTagSelect);
      rowA.appendChild(itemTagInput);
      rowA.appendChild(dateInput);

      var rowB = document.createElement("div");
      rowB.className = "d-flex align-items-center gap-2 flex-wrap";

      var titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.className = "form-control form-control-sm";
      titleInput.placeholder = "Title";
      titleInput.value = item.title || "";
      titleInput.style.flex = "1";
      titleInput.style.minWidth = "280px";

      rowB.appendChild(titleInput);

      var rowC = document.createElement("div");
      rowC.className = "d-flex align-items-center gap-2 flex-wrap";

      var urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "form-control form-control-sm";
      urlInput.placeholder = "PDF URL";
      urlInput.value = item.url || "";
      urlInput.style.flex = "1";
      urlInput.style.minWidth = "280px";

      var pdfFileInput = document.createElement("input");
      pdfFileInput.type = "file";
      pdfFileInput.accept = ".pdf,application/pdf";
      pdfFileInput.style.display = "none";

      var chooseFileBtn = document.createElement("button");
      chooseFileBtn.type = "button";
      chooseFileBtn.className = "btn btn-sm btn-outline-secondary";
      chooseFileBtn.textContent = "Choose File";
      chooseFileBtn.style.flexShrink = "0";

      var fileNameDisplay = document.createElement("div");
      fileNameDisplay.className = "small text-muted";
      fileNameDisplay.style.minWidth = "100px";
      fileNameDisplay.style.flexShrink = "0";
      fileNameDisplay.textContent = "No file chosen";

      chooseFileBtn.addEventListener("click", function () {
        pdfFileInput.click();
      });
      pdfFileInput.addEventListener("change", function () {
        if (
          pdfFileInput.files &&
          pdfFileInput.files[0] &&
          pdfFileInput.files[0].name
        ) {
          fileNameDisplay.textContent = String(
            pdfFileInput.files[0].name || ""
          ).trim();
        } else {
          fileNameDisplay.textContent = "No file chosen";
        }
      });

      rowC.appendChild(urlInput);
      rowC.appendChild(chooseFileBtn);
      rowC.appendChild(fileNameDisplay);

      var actions = document.createElement("div");
      actions.className = "d-flex align-items-center gap-1 flex-wrap";

      var saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.className = "btn btn-sm btn-outline-primary";
      saveBtn.textContent = "Save";

      var deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn btn-sm btn-outline-danger";
      deleteBtn.textContent = "Delete";

      var status = document.createElement("div");
      status.className = "small text-muted";

      saveBtn.addEventListener("click", async function () {
        try {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving...";
          status.textContent = "";

          var nextTitle = String(titleInput.value || "").trim();
          var nextDate =
            String(dateInput.value || "").trim() || getTodayDisplayDate();
          var nextTagName = getIrSelectedTagName(
            itemTagSelect,
            itemTagInput,
            item.tagName || item.type
          );
          var nextUrl = String(urlInput.value || "").trim();

          if (!nextTagName) throw new Error("tagName is required");
          nextTagName = await ensureIrTagExists(nextTagName);
          var nextType = toDisclosureTypeValue(nextTagName);
          var nextYear = getYearFromDateValue(nextDate);

          if (pdfFileInput.files && pdfFileInput.files[0]) {
            status.className = "small text-muted";
            status.textContent = "Uploading PDF...";
            var pdfFd = new FormData();
            pdfFd.append("upload", pdfFileInput.files[0]);
            var pdfRes = await fetch("/api/upload/content-pdf", {
              method: "POST",
              body: pdfFd,
            });
            var pdfData = await pdfRes.json();
            if (!pdfData.url) {
              throw new Error(
                (pdfData.error && pdfData.error.message) || "PDF upload failed"
              );
            }
            nextUrl = pdfData.url;
          }

          if (!nextTitle) throw new Error("Title is required");
          if (!nextUrl || !isPdfHrefValue(nextUrl)) {
            throw new Error("Valid PDF URL is required");
          }

          var nextHtml = updateDisclosureListItemInHtml(getHtml(), idx, {
            tagName: nextTagName,
            type: nextType,
            year: nextYear,
            date: nextDate,
            title: nextTitle,
            url: nextUrl,
            style: item.style,
            linkClass: item.linkClass,
          });

          setHtml(nextHtml);
          urlInput.value = nextUrl;
          pdfFileInput.value = "";
          fileNameDisplay.textContent = "No file chosen";
          status.className = "small text-success";
          status.textContent = "Saved";
          setTimeout(recheck, 120);
        } catch (err) {
          status.className = "small text-danger";
          status.textContent = String(err.message || err);
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }
      });

      deleteBtn.addEventListener("click", function () {
        setHtml(deleteDisclosureListItemInHtml(getHtml(), idx));
        setTimeout(recheck, 120);
      });

      actions.appendChild(saveBtn);
      actions.appendChild(deleteBtn);
      actions.appendChild(status);

      editor.appendChild(rowA);
      editor.appendChild(rowB);
      editor.appendChild(rowC);
      editor.appendChild(actions);

      itemRow.appendChild(indexSpan);
      itemRow.appendChild(editor);
      existingList.appendChild(itemRow);
    });

    section.appendChild(existingList);

    var addWrap = document.createElement("div");
    addWrap.className = "border-top pt-3";

    var addTitle = document.createElement("div");
    addTitle.className = "small fw-semibold mb-2";
    addTitle.textContent = "Add PDF item";
    addWrap.appendChild(addTitle);

    var addRowA = document.createElement("div");
    addRowA.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newTagSelect = document.createElement("select");
    newTagSelect.className = "form-select form-select-sm";
    newTagSelect.style.maxWidth = "220px";

    var newTagInput = document.createElement("input");
    newTagInput.type = "text";
    newTagInput.className = "form-control form-control-sm";
    newTagInput.placeholder = "Choose or create new tagName";
    newTagInput.style.maxWidth = "260px";

    fillIrTagSelect(newTagSelect, "");
    newTagSelect.addEventListener("change", function () {
      if (newTagSelect.value) {
        newTagInput.value = newTagSelect.value;
      }
    });

    var newDateInput = document.createElement("input");
    newDateInput.type = "text";
    newDateInput.className = "form-control form-control-sm";
    newDateInput.placeholder = "Date";
    newDateInput.style.maxWidth = "160px";

    addRowA.appendChild(newTagSelect);
    addRowA.appendChild(newTagInput);
    addRowA.appendChild(newDateInput);

    var addRowB = document.createElement("div");
    addRowB.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newTitleInput = document.createElement("input");
    newTitleInput.type = "text";
    newTitleInput.className = "form-control form-control-sm";
    newTitleInput.placeholder = "Title";
    newTitleInput.style.flex = "1";
    newTitleInput.style.minWidth = "280px";
    addRowB.appendChild(newTitleInput);

    var addRowC = document.createElement("div");
    addRowC.className = "d-flex align-items-center gap-2 flex-wrap mb-2";

    var newUrlInput = document.createElement("input");
    newUrlInput.type = "text";
    newUrlInput.className = "form-control form-control-sm";
    newUrlInput.placeholder = "PDF URL";
    newUrlInput.style.flex = "1";
    newUrlInput.style.minWidth = "280px";

    var newPdfFileInput = document.createElement("input");
    newPdfFileInput.type = "file";
    newPdfFileInput.accept = ".pdf,application/pdf";
    newPdfFileInput.style.display = "none";

    var chooseFileBtn = document.createElement("button");
    chooseFileBtn.type = "button";
    chooseFileBtn.className = "btn btn-sm btn-outline-secondary";
    chooseFileBtn.textContent = "Choose File";
    chooseFileBtn.style.flexShrink = "0";

    var fileNameDisplay = document.createElement("div");
    fileNameDisplay.className = "small text-muted";
    fileNameDisplay.style.minWidth = "100px";
    fileNameDisplay.style.flexShrink = "0";
    fileNameDisplay.textContent = "No file chosen";

    chooseFileBtn.addEventListener("click", function () {
      newPdfFileInput.click();
    });
    newPdfFileInput.addEventListener("change", function () {
      if (
        newPdfFileInput.files &&
        newPdfFileInput.files[0] &&
        newPdfFileInput.files[0].name
      ) {
        fileNameDisplay.textContent = String(
          newPdfFileInput.files[0].name || ""
        ).trim();
      } else {
        fileNameDisplay.textContent = "No file chosen";
      }
    });

    addRowC.appendChild(newUrlInput);
    addRowC.appendChild(chooseFileBtn);
    addRowC.appendChild(fileNameDisplay);

    var addActions = document.createElement("div");
    addActions.className = "d-flex align-items-center gap-1 flex-wrap";

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm btn-success";
    addBtn.textContent = "Add PDF";

    var addStatus = document.createElement("div");
    addStatus.className = "small text-muted";

    addBtn.addEventListener("click", async function () {
      try {
        addBtn.disabled = true;
        addBtn.textContent = "Adding...";
        addStatus.textContent = "";

        var nextDate =
          String(newDateInput.value || "").trim() || getTodayDisplayDate();
        var nextTagName = getIrSelectedTagName(newTagSelect, newTagInput, "");
        var nextTitle = String(newTitleInput.value || "").trim();
        var nextUrl = String(newUrlInput.value || "").trim();

        if (!nextTagName) throw new Error("tagName is required");
        nextTagName = await ensureIrTagExists(nextTagName);
        var nextType = toDisclosureTypeValue(nextTagName);
        var nextYear = getYearFromDateValue(nextDate);

        if (newPdfFileInput.files && newPdfFileInput.files[0]) {
          addStatus.textContent = "Uploading PDF...";
          var pdfFd = new FormData();
          pdfFd.append("upload", newPdfFileInput.files[0]);
          var pdfRes = await fetch("/api/upload/content-pdf", {
            method: "POST",
            body: pdfFd,
          });
          var pdfData = await pdfRes.json();
          if (!pdfData.url) {
            throw new Error(
              (pdfData.error && pdfData.error.message) || "PDF upload failed"
            );
          }
          nextUrl = pdfData.url;
        }

        if (!nextTitle) throw new Error("Title is required");
        if (!nextUrl || !isPdfHrefValue(nextUrl)) {
          throw new Error("Valid PDF URL or PDF upload is required");
        }

        var nextHtml = appendDisclosureListItemToHtml(getHtml(), {
          tagName: nextTagName,
          type: nextType,
          year: nextYear,
          date: nextDate,
          title: nextTitle,
          url: nextUrl,
        });

        setHtml(nextHtml);
        newTagInput.value = "";
        newDateInput.value = "";
        newTitleInput.value = "";
        newUrlInput.value = "";
        newPdfFileInput.value = "";
        fileNameDisplay.textContent = "No file chosen";

        addStatus.className = "small text-success";
        addStatus.textContent = "Added";
        setTimeout(recheck, 120);
      } catch (err) {
        addStatus.className = "small text-danger";
        addStatus.textContent = String(err.message || err);
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = "Add PDF";
      }
    });

    addActions.appendChild(addBtn);
    addActions.appendChild(addStatus);

    addWrap.appendChild(addRowA);
    addWrap.appendChild(addRowB);
    addWrap.appendChild(addRowC);
    addWrap.appendChild(addActions);

    section.appendChild(addWrap);
    panel.appendChild(section);
    container.appendChild(panel);
  }
  // ─────────────────────────────────────────────────────────────────────────────

  function extractUnresolvedServerImgs(html) {
    return extractImageAssets(html)
      .map(function (x) {
        return x.src;
      })
      .filter(function (src) {
        // YouTube/TikTok CDN thumbnails are valid external URLs – do not block save
        return (
          !isServerHostedSrc(src) &&
          !isYoutubeThumbnailSrc(src) &&
          !isTikTokThumbnailSrc(src)
        );
      });
  }

  function extractUnresolvedServerAssets(html) {
    const img = extractUnresolvedServerImgs(html);
    const pdf = extractPdfLinks(html)
      .map(function (x) {
        return x.src;
      })
      .filter(function (src) {
        return !isServerHostedSrc(src);
      });
    return img.concat(pdf);
  }

  var _activeCheck = null;

  /** Trigger the last registered check (called from CKEditor change:data etc.) */
  function recheck() {
    if (_activeCheck) _activeCheck();
  }

  /**
   * Initialise the checker for a content area.
   * opts:
   *   getHtml()        – returns current HTML string
   *   setHtml(html)    – updates content with new HTML
   *   warningContainerId – id of the <div> where warnings render
   *   textarea         – (optional) raw <textarea> element to watch directly
   */
  function init(opts) {
    var container = document.getElementById(opts.warningContainerId);
    if (!container) return { recheck: function () {} };

    function shouldAlwaysShowPanel() {
      if (typeof opts.alwaysShowPanel === "function") {
        try {
          return !!opts.alwaysShowPanel();
        } catch {
          return false;
        }
      }
      return !!opts.alwaysShowPanel;
    }

    function check() {
      var html = opts.getHtml() || "";
      var images = extractImageAssets(html);
      var pdfLinks = extractPdfLinks(html);
      render(
        container,
        images.concat(pdfLinks),
        opts.getHtml,
        opts.setHtml,
        check,
        shouldAlwaysShowPanel()
      );
    }

    _activeCheck = check;

    // Block create/update when content still contains non-server images.
    var formEl =
      opts.form ||
      (opts.textarea && opts.textarea.closest && opts.textarea.closest("form"));
    if (formEl && opts.blockSubmit !== false) {
      formEl.addEventListener(
        "submit",
        function (ev) {
          var html = opts.getHtml ? opts.getHtml() || "" : "";
          var unresolved = extractUnresolvedServerAssets(html);
          if (!unresolved.length) return;

          ev.preventDefault();
          if (typeof ev.stopImmediatePropagation === "function") {
            ev.stopImmediatePropagation();
          }
          if (typeof ev.stopPropagation === "function") {
            ev.stopPropagation();
          }
          check();
          if (typeof window.showToast === "function") {
            window.showToast(
              "Please upload and replace all non-server images/PDF links before save/update",
              true
            );
          }
        },
        true
      );
    }

    if (opts.textarea) {
      opts.textarea.addEventListener("input", check);
      opts.textarea.addEventListener("paste", function () {
        setTimeout(check, 150);
      });
    }

    return {
      recheck: check,
      getUnresolvedServerImages: function () {
        return extractUnresolvedServerAssets(
          opts.getHtml ? opts.getHtml() : ""
        );
      },
    };
  }

  function render(
    container,
    assets,
    getHtml,
    setHtml,
    recheck,
    forceShowPanel
  ) {
    container.innerHTML = "";
    if (!assets.length && !forceShowPanel) return;

    var pdfGroupForHtml = !forceShowPanel
      ? detectPdfArticleGroup(getHtml())
      : null;
    var irReportTabsForHtml = !forceShowPanel
      ? extractIrReportTabItems(getHtml())
      : [];
    var pdfGroupItemsForHtml =
      !forceShowPanel && pdfGroupForHtml
        ? extractPdfArticleItems(getHtml())
        : [];
    var hiddenAssetSources = {};
    irReportTabsForHtml.forEach(function (tab) {
      (tab.items || []).forEach(function (item) {
        var imageSrc = String((item && item.img) || "").trim();
        var pdfSrc = String((item && item.url) || "").trim();
        if (imageSrc) hiddenAssetSources[imageSrc] = true;
        if (pdfSrc) hiddenAssetSources[pdfSrc] = true;
      });
    });
    var cardListItemsForHtml = !forceShowPanel
      ? extractCardListItems(getHtml())
      : [];
    cardListItemsForHtml.forEach(function (item) {
      var pdfSrc = String((item && item.url) || "").trim();
      if (pdfSrc) hiddenAssetSources[pdfSrc] = true;
    });
    var disclosureItemsForHtml = !forceShowPanel
      ? extractDisclosureListItems(getHtml())
      : [];
    disclosureItemsForHtml.forEach(function (item) {
      var pdfSrc = String((item && item.url) || "").trim();
      if (pdfSrc) hiddenAssetSources[pdfSrc] = true;
    });
    pdfGroupItemsForHtml.forEach(function (item) {
      var imageSrc = String((item && item.imageUrl) || "").trim();
      var pdfSrc = String((item && item.pdfUrl) || "").trim();
      if (imageSrc) hiddenAssetSources[imageSrc] = true;
      if (pdfSrc) hiddenAssetSources[pdfSrc] = true;
    });

    var localCount = assets.filter(function (x) {
      return x.isLocal;
    }).length;
    var plural = assets.length > 1 ? "s" : "";
    var header = document.createElement("div");
    header.className = "alert alert-warning py-2 px-3 mb-2";
    if (assets.length) {
      header.innerHTML =
        "<strong>&#128206; " +
        assets.length +
        " asset" +
        plural +
        " found in content</strong>" +
        " &mdash; Upload to server to replace source quickly." +
        (localCount
          ? " <br><small>" +
            localCount +
            " local path(s) may break on production if not uploaded.</small>"
          : "");
    } else {
      header.innerHTML =
        "<strong>&#128250; Video Share List</strong>" +
        " &mdash; Add link url, image, tag, title without storing HTML.";
    }
    container.appendChild(header);

    if (!forceShowPanel) {
      var irReportTabs = detectIrReportTabs(getHtml());
      if (irReportTabs) {
        renderIrReportTabsEditor(
          container,
          irReportTabsForHtml,
          getHtml,
          setHtml,
          recheck
        );
      }

      var cardListGroup = detectCardListGroup(getHtml());
      var disclosureListGroup = detectDisclosureListGroup(getHtml());
      if (disclosureListGroup && !irReportTabs) {
        renderDisclosureListEditor(
          container,
          disclosureItemsForHtml,
          getHtml,
          setHtml,
          recheck
        );
      }
      if (cardListGroup && !irReportTabs && !disclosureListGroup) {
        var cardListItems = extractCardListItems(getHtml());
        renderCardListEditor(
          container,
          cardListItems,
          getHtml,
          setHtml,
          recheck
        );
      }

      var pdfGroup = pdfGroupForHtml;
      if (pdfGroup && !irReportTabs && !cardListGroup && !disclosureListGroup) {
        var existingPdfItems = pdfGroupItemsForHtml;

        var pdfBuilder = document.createElement("div");
        pdfBuilder.className = "border rounded p-3 bg-white mb-2";

        var pdfBuilderTitle = document.createElement("div");
        pdfBuilderTitle.className = "fw-semibold mb-1";
        pdfBuilderTitle.textContent = "PDF Article Group";

        var pdfBuilderSub = document.createElement("div");
        pdfBuilderSub.className = "small text-muted mb-2";
        pdfBuilderSub.textContent =
          "Detected " +
          pdfGroup.count +
          " PDF card(s). Add new card to the same HTML group.";

        var existingWrap = document.createElement("div");
        existingWrap.className = "mb-3";

        var existingTitle = document.createElement("div");
        existingTitle.className = "small fw-semibold mb-2";
        existingTitle.textContent = "Existing PDF Articles";

        var existingList = document.createElement("div");
        existingList.className = "d-flex flex-column gap-2";

        existingPdfItems.forEach(function (item, idx) {
          var itemRow = document.createElement("div");
          itemRow.className =
            "d-flex align-items-start gap-2 p-2 border rounded bg-light flex-wrap";

          var thumb = document.createElement("img");
          thumb.alt = "PDF article thumbnail";
          thumb.style.width = "64px";
          thumb.style.height = "44px";
          thumb.style.objectFit = "cover";
          thumb.style.border = "1px solid #dee2e6";
          thumb.style.borderRadius = "4px";
          thumb.style.background = "#f8f9fa";
          thumb.style.flexShrink = "0";
          if (item.imageUrl) {
            thumb.src = item.imageUrl;
          } else {
            thumb.style.display = "none";
          }

          var editor = document.createElement("div");
          editor.className = "d-flex flex-column gap-2";
          editor.style.flex = "1";
          editor.style.minWidth = "320px";

          var heading = document.createElement("div");
          heading.className = "small fw-semibold";
          heading.textContent = "#" + (idx + 1);

          var firstRow = document.createElement("div");
          firstRow.className = "d-flex align-items-center gap-2 flex-wrap";

          var tagInputRow = document.createElement("input");
          tagInputRow.type = "text";
          tagInputRow.className = "form-control form-control-sm";
          tagInputRow.placeholder = "Tag";
          tagInputRow.value = item.tag || "";
          tagInputRow.style.maxWidth = "160px";

          var titleInputRow = document.createElement("input");
          titleInputRow.type = "text";
          titleInputRow.className = "form-control form-control-sm";
          titleInputRow.placeholder = "Title";
          titleInputRow.value = item.title || "";
          titleInputRow.style.minWidth = "220px";
          titleInputRow.style.flex = "1";

          var descInputRow = document.createElement("textarea");
          descInputRow.className = "form-control form-control-sm";
          descInputRow.placeholder = "Description";
          descInputRow.rows = 2;
          descInputRow.value = item.desc || "";

          var secondRow = document.createElement("div");
          secondRow.className = "d-flex align-items-center gap-2 flex-wrap";

          var imageUrlInputRow = document.createElement("input");
          imageUrlInputRow.type = "text";
          imageUrlInputRow.className = "form-control form-control-sm";
          imageUrlInputRow.placeholder = "Thumbnail URL";
          imageUrlInputRow.value = item.imageUrl || "";
          imageUrlInputRow.style.minWidth = "220px";
          imageUrlInputRow.style.flex = "1";

          var imageFileInputRow = document.createElement("input");
          imageFileInputRow.type = "file";
          imageFileInputRow.accept = "image/*";
          imageFileInputRow.className = "form-control form-control-sm";
          imageFileInputRow.style.maxWidth = "220px";

          var thirdRow = document.createElement("div");
          thirdRow.className = "d-flex align-items-center gap-2 flex-wrap";

          var pdfUrlInputRow = document.createElement("input");
          pdfUrlInputRow.type = "text";
          pdfUrlInputRow.className = "form-control form-control-sm";
          pdfUrlInputRow.placeholder = "PDF URL";
          pdfUrlInputRow.value = item.pdfUrl || "";
          pdfUrlInputRow.style.minWidth = "220px";
          pdfUrlInputRow.style.flex = "1";

          var pdfFileInputRow = document.createElement("input");
          pdfFileInputRow.type = "file";
          pdfFileInputRow.accept = ".pdf,application/pdf";
          pdfFileInputRow.className = "form-control form-control-sm";
          pdfFileInputRow.style.maxWidth = "220px";

          var linkTextInputRow = document.createElement("input");
          linkTextInputRow.type = "text";
          linkTextInputRow.className = "form-control form-control-sm";
          linkTextInputRow.placeholder = "Link text";
          linkTextInputRow.value = item.linkText || "Download PDF";
          linkTextInputRow.style.maxWidth = "180px";

          var actionRowExisting = document.createElement("div");
          actionRowExisting.className = "d-flex align-items-center gap-2";

          var saveBtnExisting = document.createElement("button");
          saveBtnExisting.type = "button";
          saveBtnExisting.className = "btn btn-sm btn-primary";
          saveBtnExisting.textContent = "Save";

          var deleteBtnExisting = document.createElement("button");
          deleteBtnExisting.type = "button";
          deleteBtnExisting.className = "btn btn-sm btn-outline-danger";
          deleteBtnExisting.textContent = "Delete";

          var statusExisting = document.createElement("span");
          statusExisting.className = "small";

          saveBtnExisting.addEventListener("click", async function () {
            var nextTitle = String(titleInputRow.value || "").trim();
            var nextDesc = String(descInputRow.value || "").trim();
            var nextTag = String(tagInputRow.value || "").trim();
            var nextImageUrl = String(imageUrlInputRow.value || "").trim();
            var nextPdfUrl = String(pdfUrlInputRow.value || "").trim();
            var nextLinkText =
              String(linkTextInputRow.value || "").trim() || "Download PDF";

            if (!nextTitle || !nextDesc) {
              statusExisting.className = "small text-danger";
              statusExisting.textContent = "Title and description are required";
              return;
            }

            saveBtnExisting.disabled = true;
            saveBtnExisting.textContent = "Saving…";
            statusExisting.className = "small text-muted";
            statusExisting.textContent = "Preparing data…";

            try {
              var imageFile =
                imageFileInputRow.files && imageFileInputRow.files[0];
              if (imageFile) {
                statusExisting.textContent = "Uploading thumbnail…";
                var imageFd = new FormData();
                imageFd.append("upload", imageFile);
                var imageRes = await fetch("/api/upload/content-image", {
                  method: "POST",
                  body: imageFd,
                });
                var imageData = await imageRes.json();
                if (!imageData.url) {
                  throw new Error(
                    (imageData.error && imageData.error.message) ||
                      "Thumbnail upload failed"
                  );
                }
                nextImageUrl = imageData.url;
              }

              var pdfFile = pdfFileInputRow.files && pdfFileInputRow.files[0];
              if (pdfFile) {
                statusExisting.textContent = "Uploading PDF…";
                var pdfFd = new FormData();
                pdfFd.append("upload", pdfFile);
                var pdfRes = await fetch("/api/upload/content-pdf", {
                  method: "POST",
                  body: pdfFd,
                });
                var pdfData = await pdfRes.json();
                if (!pdfData.url) {
                  throw new Error(
                    (pdfData.error && pdfData.error.message) ||
                      "PDF upload failed"
                  );
                }
                nextPdfUrl = pdfData.url;
              }

              if (!nextImageUrl) {
                throw new Error(
                  "Thumbnail URL or thumbnail upload is required"
                );
              }
              if (!nextPdfUrl || !isPdfHrefValue(nextPdfUrl)) {
                throw new Error("Valid PDF URL or PDF upload is required");
              }

              var updatedHtml = updatePdfArticleInHtml(getHtml(), idx, {
                title: nextTitle,
                desc: nextDesc,
                tag: nextTag,
                imageUrl: nextImageUrl,
                pdfUrl: nextPdfUrl,
                linkText: nextLinkText,
              });

              setHtml(updatedHtml);
              statusExisting.className = "small text-success";
              statusExisting.textContent = "✓ Saved";
              setTimeout(recheck, 120);
            } catch (err) {
              statusExisting.className = "small text-danger";
              statusExisting.textContent = "✗ " + err.message;
            } finally {
              saveBtnExisting.disabled = false;
              saveBtnExisting.textContent = "Save";
            }
          });

          deleteBtnExisting.addEventListener("click", function () {
            var updatedHtml = deletePdfArticleInHtml(getHtml(), idx);
            setHtml(updatedHtml);
            setTimeout(recheck, 120);
          });

          firstRow.appendChild(tagInputRow);
          firstRow.appendChild(titleInputRow);

          secondRow.appendChild(imageUrlInputRow);
          secondRow.appendChild(imageFileInputRow);

          thirdRow.appendChild(pdfUrlInputRow);
          thirdRow.appendChild(pdfFileInputRow);
          thirdRow.appendChild(linkTextInputRow);

          actionRowExisting.appendChild(saveBtnExisting);
          actionRowExisting.appendChild(deleteBtnExisting);
          actionRowExisting.appendChild(statusExisting);

          editor.appendChild(heading);
          editor.appendChild(firstRow);
          editor.appendChild(descInputRow);
          editor.appendChild(secondRow);
          editor.appendChild(thirdRow);
          editor.appendChild(actionRowExisting);

          itemRow.appendChild(thumb);
          itemRow.appendChild(editor);
          existingList.appendChild(itemRow);
        });

        existingWrap.appendChild(existingTitle);
        existingWrap.appendChild(existingList);

        var row = document.createElement("div");
        row.className = "d-flex align-items-center gap-2 flex-wrap";

        var tagInput = document.createElement("input");
        tagInput.type = "text";
        tagInput.className = "form-control form-control-sm";
        tagInput.placeholder = "Tag";
        tagInput.value = "Customs";
        tagInput.style.maxWidth = "160px";

        var titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "form-control form-control-sm";
        titleInput.placeholder = "Title";
        titleInput.style.minWidth = "260px";
        titleInput.style.flex = "1";

        var descInput = document.createElement("textarea");
        descInput.className = "form-control form-control-sm mt-2";
        descInput.placeholder = "Description";
        descInput.rows = 2;

        var secondRow = document.createElement("div");
        secondRow.className = "d-flex align-items-center gap-2 flex-wrap mt-2";

        var imageUrlInput = document.createElement("input");
        imageUrlInput.type = "text";
        imageUrlInput.className = "form-control form-control-sm";
        imageUrlInput.placeholder = "Thumbnail URL (optional if upload)";
        imageUrlInput.style.minWidth = "260px";
        imageUrlInput.style.flex = "1";

        var imageFileInput = document.createElement("input");
        imageFileInput.type = "file";
        imageFileInput.accept = "image/*";
        imageFileInput.className = "form-control form-control-sm";
        imageFileInput.style.maxWidth = "240px";

        var thirdRow = document.createElement("div");
        thirdRow.className = "d-flex align-items-center gap-2 flex-wrap mt-2";

        var pdfUrlInput = document.createElement("input");
        pdfUrlInput.type = "text";
        pdfUrlInput.className = "form-control form-control-sm";
        pdfUrlInput.placeholder = "PDF URL (optional if upload)";
        pdfUrlInput.style.minWidth = "260px";
        pdfUrlInput.style.flex = "1";

        var pdfFileInput = document.createElement("input");
        pdfFileInput.type = "file";
        pdfFileInput.accept = ".pdf,application/pdf";
        pdfFileInput.className = "form-control form-control-sm";
        pdfFileInput.style.maxWidth = "240px";

        var linkTextInput = document.createElement("input");
        linkTextInput.type = "text";
        linkTextInput.className = "form-control form-control-sm";
        linkTextInput.placeholder = "Link text";
        linkTextInput.value = "Download PDF";
        linkTextInput.style.maxWidth = "200px";

        var actionRow = document.createElement("div");
        actionRow.className = "d-flex align-items-center gap-2 mt-2";

        var addPdfCardBtn = document.createElement("button");
        addPdfCardBtn.type = "button";
        addPdfCardBtn.className = "btn btn-sm btn-primary";
        addPdfCardBtn.textContent = "Add PDF Card";

        var resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "btn btn-sm btn-outline-secondary";
        resetBtn.textContent = "Reset";

        var builderStatus = document.createElement("span");
        builderStatus.className = "small";

        resetBtn.addEventListener("click", function () {
          titleInput.value = "";
          descInput.value = "";
          imageUrlInput.value = "";
          pdfUrlInput.value = "";
          imageFileInput.value = "";
          pdfFileInput.value = "";
          linkTextInput.value = "Download PDF";
          builderStatus.className = "small text-muted";
          builderStatus.textContent = "Form reset";
        });

        addPdfCardBtn.addEventListener("click", async function () {
          var title = String(titleInput.value || "").trim();
          var desc = String(descInput.value || "").trim();
          var tag = String(tagInput.value || "").trim();
          var linkText =
            String(linkTextInput.value || "").trim() || "Download PDF";
          var imageUrl = String(imageUrlInput.value || "").trim();
          var pdfUrl = String(pdfUrlInput.value || "").trim();

          if (!title || !desc) {
            builderStatus.className = "small text-danger";
            builderStatus.textContent = "Title and description are required";
            return;
          }

          addPdfCardBtn.disabled = true;
          addPdfCardBtn.textContent = "Adding…";
          builderStatus.className = "small text-muted";
          builderStatus.textContent = "Preparing card data…";

          try {
            var imageFile = imageFileInput.files && imageFileInput.files[0];
            if (imageFile) {
              builderStatus.textContent = "Uploading thumbnail…";
              var imageFd = new FormData();
              imageFd.append("upload", imageFile);
              var imageRes = await fetch("/api/upload/content-image", {
                method: "POST",
                body: imageFd,
              });
              var imageData = await imageRes.json();
              if (!imageData.url) {
                throw new Error(
                  (imageData.error && imageData.error.message) ||
                    "Thumbnail upload failed"
                );
              }
              imageUrl = imageData.url;
            }

            var pdfFile = pdfFileInput.files && pdfFileInput.files[0];
            if (pdfFile) {
              builderStatus.textContent = "Uploading PDF…";
              var pdfFd = new FormData();
              pdfFd.append("upload", pdfFile);
              var pdfRes = await fetch("/api/upload/content-pdf", {
                method: "POST",
                body: pdfFd,
              });
              var pdfData = await pdfRes.json();
              if (!pdfData.url) {
                throw new Error(
                  (pdfData.error && pdfData.error.message) ||
                    "PDF upload failed"
                );
              }
              pdfUrl = pdfData.url;
            }

            if (!imageUrl) {
              throw new Error("Thumbnail URL or thumbnail upload is required");
            }
            if (!pdfUrl || !isPdfHrefValue(pdfUrl)) {
              throw new Error("Valid PDF URL or PDF upload is required");
            }

            var nextHtml = appendPdfCardToHtml(getHtml(), {
              title: title,
              desc: desc,
              tag: tag,
              imageUrl: imageUrl,
              pdfUrl: pdfUrl,
              linkText: linkText,
            });

            setHtml(nextHtml);
            builderStatus.className = "small text-success";
            builderStatus.textContent = "✓ Added new PDF card";
            setTimeout(recheck, 120);
          } catch (err) {
            builderStatus.className = "small text-danger";
            builderStatus.textContent = "✗ " + err.message;
          } finally {
            addPdfCardBtn.disabled = false;
            addPdfCardBtn.textContent = "Add PDF Card";
          }
        });

        row.appendChild(tagInput);
        row.appendChild(titleInput);

        secondRow.appendChild(imageUrlInput);
        secondRow.appendChild(imageFileInput);

        thirdRow.appendChild(pdfUrlInput);
        thirdRow.appendChild(pdfFileInput);
        thirdRow.appendChild(linkTextInput);

        actionRow.appendChild(addPdfCardBtn);
        actionRow.appendChild(resetBtn);
        actionRow.appendChild(builderStatus);

        pdfBuilder.appendChild(pdfBuilderTitle);
        pdfBuilder.appendChild(pdfBuilderSub);
        pdfBuilder.appendChild(existingWrap);
        pdfBuilder.appendChild(row);
        pdfBuilder.appendChild(descInput);
        pdfBuilder.appendChild(secondRow);
        pdfBuilder.appendChild(thirdRow);
        pdfBuilder.appendChild(actionRow);
        container.appendChild(pdfBuilder);
      }
    }

    if (forceShowPanel) {
      var addBar = document.createElement("div");
      addBar.className = "d-flex justify-content-end mb-2";

      var addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className = "btn btn-sm btn-primary";
      addBtn.textContent = "Add";
      addBar.appendChild(addBtn);
      container.appendChild(addBar);

      var existingList = extractVideoShareListFromHtml(getHtml());
      existingList.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className =
          "d-flex align-items-start gap-2 mt-2 flex-wrap border rounded p-2 bg-white";

        var previewRow = document.createElement("img");
        previewRow.alt = "Video share preview";
        previewRow.style.width = "80px";
        previewRow.style.height = "56px";
        previewRow.style.objectFit = "cover";
        previewRow.style.borderRadius = "4px";
        previewRow.style.border = "1px solid #e9ecef";
        previewRow.style.background = "#f8f9fa";
        if (item && item.image) {
          previewRow.src = String(item.image);
        } else {
          previewRow.style.display = "none";
        }

        var badgeRow = document.createElement("span");
        badgeRow.className = "badge bg-secondary";
        badgeRow.textContent = "Saved #" + (idx + 1);

        var controlsRow = document.createElement("div");
        controlsRow.className =
          "d-flex align-items-center gap-2 flex-wrap w-100";

        var urlInputRow = document.createElement("input");
        urlInputRow.type = "text";
        urlInputRow.className = "form-control form-control-sm";
        urlInputRow.style.minWidth = "280px";
        urlInputRow.style.flex = "1";
        urlInputRow.value = String((item && item.linkUrl) || "");
        urlInputRow.placeholder = "Link URL";

        var groupSelectRow = document.createElement("select");
        groupSelectRow.className = "form-select form-select-sm";
        groupSelectRow.style.cssText = "width:auto;min-width:110px";
        ["video", "webinars"].forEach(function (g) {
          var opt = document.createElement("option");
          opt.value = g;
          opt.textContent = g.charAt(0).toUpperCase() + g.slice(1);
          groupSelectRow.appendChild(opt);
        });
        groupSelectRow.value =
          String((item && item.tag) || "").toLowerCase() === "webinar"
            ? "webinars"
            : "video";

        var titleInputRow = document.createElement("input");
        titleInputRow.type = "text";
        titleInputRow.className = "form-control form-control-sm";
        titleInputRow.style.minWidth = "220px";
        titleInputRow.placeholder = "Title";
        titleInputRow.value = String((item && item.title) || "");

        var thumbInputRow = document.createElement("input");
        thumbInputRow.type = "file";
        thumbInputRow.accept = "image/*";
        thumbInputRow.className = "form-control form-control-sm";
        thumbInputRow.style.maxWidth = "220px";

        var saveBtnRow = document.createElement("button");
        saveBtnRow.type = "button";
        saveBtnRow.className = "btn btn-sm btn-primary";
        saveBtnRow.textContent = "Save";

        var deleteBtnRow = document.createElement("button");
        deleteBtnRow.type = "button";
        deleteBtnRow.className = "btn btn-sm btn-outline-danger";
        deleteBtnRow.textContent = "Delete";

        var statusRow = document.createElement("span");
        statusRow.className = "small";

        saveBtnRow.addEventListener("click", async function () {
          var listNow = extractVideoShareListFromHtml(getHtml());
          if (!Array.isArray(listNow) || !listNow[idx]) return;

          var nextLinkUrl = String(urlInputRow.value || "").trim();
          if (!nextLinkUrl) {
            statusRow.className = "small text-danger";
            statusRow.textContent = "\u2717 Link URL is required";
            return;
          }
          var nextTitle = String(titleInputRow.value || "").trim();
          var platform = detectVideoPlatform(nextLinkUrl);

          var nextImage = String((listNow[idx] && listNow[idx].image) || "");
          var file = thumbInputRow.files && thumbInputRow.files[0];
          if (file) {
            statusRow.className = "small text-muted";
            statusRow.textContent = "Uploading thumbnail…";
            try {
              var fd = new FormData();
              fd.append("upload", file);
              var upRes = await fetch("/api/upload/content-image", {
                method: "POST",
                body: fd,
              });
              var upData = await upRes.json();
              if (!upData.url) {
                throw new Error(
                  (upData.error && upData.error.message) ||
                    "Thumbnail upload failed"
                );
              }
              nextImage = upData.url;
            } catch (err) {
              statusRow.className = "small text-danger";
              statusRow.textContent = "✗ " + err.message;
              return;
            }
          }

          if (platform === "unknown") {
            if (!nextTitle) {
              statusRow.className = "small text-danger";
              statusRow.textContent =
                "\u2717 Title is required for non-YouTube/TikTok URLs";
              return;
            }
            if (!nextImage) {
              statusRow.className = "small text-danger";
              statusRow.textContent =
                "\u2717 Thumbnail is required for non-YouTube/TikTok URLs";
              return;
            }
          }

          listNow[idx] = {
            linkUrl: nextLinkUrl,
            image: nextImage,
            tag: groupSelectRow.value === "webinars" ? "Webinar" : "Video",
            title: nextTitle,
          };

          setHtml(setVideoShareListToHtml(getHtml(), listNow));
          statusRow.className = "small text-success";
          statusRow.textContent = "✓ Saved";
          setTimeout(recheck, 120);
        });

        deleteBtnRow.addEventListener("click", function () {
          var listNow = extractVideoShareListFromHtml(getHtml());
          if (!Array.isArray(listNow) || idx >= listNow.length) return;
          listNow.splice(idx, 1);
          setHtml(setVideoShareListToHtml(getHtml(), listNow));
          setTimeout(recheck, 120);
        });

        controlsRow.appendChild(urlInputRow);
        controlsRow.appendChild(groupSelectRow);
        controlsRow.appendChild(titleInputRow);
        controlsRow.appendChild(thumbInputRow);
        controlsRow.appendChild(saveBtnRow);
        controlsRow.appendChild(deleteBtnRow);
        controlsRow.appendChild(statusRow);

        row.appendChild(previewRow);
        row.appendChild(badgeRow);
        row.appendChild(controlsRow);
        container.appendChild(row);
      });

      addBtn.addEventListener("click", function () {
        var manualRow = document.createElement("div");
        manualRow.className =
          "d-flex align-items-start gap-2 mt-2 flex-wrap border rounded p-2 bg-white";

        var preview = document.createElement("span");
        preview.style.width = "80px";
        preview.style.height = "56px";
        preview.style.borderRadius = "4px";
        preview.style.border = "1px solid #e9ecef";
        preview.style.background = "#f8f9fa";
        preview.style.display = "inline-flex";
        preview.style.alignItems = "center";
        preview.style.justifyContent = "center";
        preview.style.fontSize = "12px";
        preview.style.fontWeight = "600";
        preview.style.color = "#495057";
        preview.textContent = "New";

        var badge = document.createElement("span");
        badge.className = "badge bg-info";
        badge.textContent = "Video share - New item";

        var controls = document.createElement("div");
        controls.className = "d-flex align-items-center gap-2 flex-wrap w-100";

        var urlInput = document.createElement("input");
        urlInput.type = "text";
        urlInput.className = "form-control form-control-sm";
        urlInput.style.minWidth = "300px";
        urlInput.style.flex = "1";
        urlInput.placeholder = "Paste video share URL (YouTube / TikTok)";

        var groupSelect = document.createElement("select");
        groupSelect.className = "form-select form-select-sm";
        groupSelect.style.cssText = "width:auto;min-width:110px";
        ["video", "webinars"].forEach(function (g) {
          var opt = document.createElement("option");
          opt.value = g;
          opt.textContent = g.charAt(0).toUpperCase() + g.slice(1);
          groupSelect.appendChild(opt);
        });

        var titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "form-control form-control-sm";
        titleInput.style.minWidth = "220px";
        titleInput.placeholder = "Title (optional)";

        var shouldAutoFillTitle = true;
        var lastResolvedUrl = "";
        var hydrateTitleTimer = null;

        titleInput.addEventListener("input", function () {
          shouldAutoFillTitle = !(titleInput.value || "").trim();
        });

        async function hydrateTitleFromUrl() {
          var inputUrl = (urlInput.value || "").trim();
          if (!inputUrl) return;

          // Avoid duplicate fetches for the same URL when title exists.
          if (inputUrl === lastResolvedUrl && (titleInput.value || "").trim()) {
            return;
          }

          try {
            status.className = "small text-muted";
            status.textContent = "Fetching title\u2026";
            var meta = await resolveVideoMetaFromUrl(inputUrl);
            if (!meta) {
              status.className = "small text-warning";
              status.textContent =
                "Unsupported URL: enter title and upload thumbnail manually";
              return;
            }

            var fetchedTitle = meta.title;
            if (
              fetchedTitle &&
              (shouldAutoFillTitle || !(titleInput.value || "").trim())
            ) {
              titleInput.value = fetchedTitle;
              shouldAutoFillTitle = true;
            }

            var hasThumbFile = !!(thumbInput.files && thumbInput.files.length);
            if (meta.thumbnailUrl && !hasThumbFile) {
              preview.textContent = "";
              preview.style.backgroundImage =
                "url('" + meta.thumbnailUrl + "')";
              preview.style.backgroundSize = "cover";
              preview.style.backgroundPosition = "center";
            }

            status.textContent = "";
            status.className = "small";
            lastResolvedUrl = inputUrl;
          } catch {
            // Ignore lookup failures; user can still add with manual title.
          }
        }

        function queueHydrateTitleFromUrl() {
          if (hydrateTitleTimer) clearTimeout(hydrateTitleTimer);
          hydrateTitleTimer = setTimeout(hydrateTitleFromUrl, 180);
        }

        urlInput.addEventListener("change", queueHydrateTitleFromUrl);
        urlInput.addEventListener("blur", queueHydrateTitleFromUrl);
        urlInput.addEventListener("paste", function () {
          setTimeout(queueHydrateTitleFromUrl, 0);
        });

        var thumbInput = document.createElement("input");
        thumbInput.type = "file";
        thumbInput.accept = "image/*";
        thumbInput.className = "form-control form-control-sm";
        thumbInput.style.maxWidth = "220px";

        var addItemBtn = document.createElement("button");
        addItemBtn.type = "button";
        addItemBtn.className = "btn btn-sm btn-success";
        addItemBtn.textContent = "Add item";

        var cancelBtn = document.createElement("button");
        cancelBtn.type = "button";
        cancelBtn.className = "btn btn-sm btn-outline-secondary";
        cancelBtn.textContent = "Cancel";

        var status = document.createElement("span");
        status.className = "small";

        cancelBtn.addEventListener("click", function () {
          manualRow.remove();
        });

        addItemBtn.addEventListener("click", async function () {
          var inputUrl = (urlInput.value || "").trim();
          if (!inputUrl) {
            status.className = "small text-danger";
            status.textContent = "\u2717 Link URL is required";
            return;
          }

          var platform = detectVideoPlatform(inputUrl);
          var resolvedMeta = null;
          if (platform !== "unknown") {
            resolvedMeta = await resolveVideoMetaFromUrl(inputUrl);
          }

          addItemBtn.disabled = true;
          addItemBtn.textContent = "Adding\u2026";
          status.className = "small text-muted";
          status.textContent = "Preparing video data\u2026";

          var title = (titleInput.value || "").trim();
          if (!title) {
            title = (resolvedMeta && resolvedMeta.title) || "";
          }

          var tag = groupSelect.value === "webinars" ? "Webinar" : "Video";

          var customThumbnailUrl = null;
          var thumbFile = thumbInput.files && thumbInput.files[0];
          if (thumbFile) {
            status.textContent = "Uploading thumbnail\u2026";
            try {
              var fd = new FormData();
              fd.append("upload", thumbFile);
              var upRes = await fetch("/api/upload/content-image", {
                method: "POST",
                body: fd,
              });
              var upData = await upRes.json();
              if (!upData.url) {
                throw new Error(
                  (upData.error && upData.error.message) ||
                    "Thumbnail upload failed"
                );
              }
              customThumbnailUrl = upData.url;
            } catch (err) {
              status.className = "small text-danger";
              status.textContent = "\u2717 " + err.message;
              addItemBtn.disabled = false;
              addItemBtn.textContent = "Add item";
              return;
            }
          }

          var resolvedImage =
            customThumbnailUrl ||
            String((resolvedMeta && resolvedMeta.thumbnailUrl) || "").trim();

          if (platform === "unknown") {
            if (!title) {
              status.className = "small text-danger";
              status.textContent =
                "\u2717 Title is required for non-YouTube/TikTok URLs";
              addItemBtn.disabled = false;
              addItemBtn.textContent = "Add item";
              return;
            }
            if (!resolvedImage) {
              status.className = "small text-danger";
              status.textContent =
                "\u2717 Thumbnail is required for non-YouTube/TikTok URLs";
              addItemBtn.disabled = false;
              addItemBtn.textContent = "Add item";
              return;
            }
          }

          var metaForSave = resolvedMeta || {
            url: inputUrl,
            thumbnailUrl: "",
            videoId: null,
            provider: "Video",
          };

          var updatedHtml = appendVideoShareDataToHtml(
            getHtml(),
            metaForSave,
            resolvedImage,
            title || "Video Title Goes Here",
            tag
          );
          setHtml(updatedHtml);

          status.className = "small text-success";
          status.textContent = "\u2713 Added";
          setTimeout(recheck, 200);
        });

        controls.appendChild(urlInput);
        controls.appendChild(groupSelect);
        controls.appendChild(titleInput);
        controls.appendChild(thumbInput);
        controls.appendChild(addItemBtn);
        controls.appendChild(cancelBtn);
        controls.appendChild(status);

        manualRow.appendChild(preview);
        manualRow.appendChild(badge);
        manualRow.appendChild(controls);
        addBar.insertAdjacentElement("afterend", manualRow);
      });
    }

    var assetsToRender = assets.filter(function (asset) {
      var src = String((asset && asset.src) || "").trim();
      if (!src) return true;
      return !hiddenAssetSources[src];
    });

    assetsToRender.forEach(function (asset) {
      var src = asset.src;
      var row = document.createElement("div");
      row.className =
        "d-flex align-items-start gap-2 mt-2 flex-wrap border rounded p-2 bg-white";

      var preview = document.createElement(
        asset.type === "pdf" ? "span" : "img"
      );
      preview.alt = "Content asset preview";
      preview.style.width = "80px";
      preview.style.height = "56px";
      preview.style.objectFit = "cover";
      preview.style.borderRadius = "4px";
      preview.style.border = "1px solid #e9ecef";
      preview.style.background = "#f8f9fa";
      preview.style.display = "inline-flex";
      preview.style.alignItems = "center";
      preview.style.justifyContent = "center";
      preview.style.fontSize = "12px";
      preview.style.fontWeight = "600";
      preview.style.color = "#495057";
      if (asset.type === "pdf") {
        preview.textContent = "PDF";
      } else if (/^(https?:\/\/|\/|\/\/|data:)/i.test(src)) {
        preview.src = src;
      } else {
        preview.style.display = "none";
      }

      var label = document.createElement("code");
      label.className = "small text-danger w-100 mb-1";
      label.style.wordBreak = "break-all";
      label.textContent = src;

      var typeBadge = document.createElement("span");
      typeBadge.className =
        "badge " + (asset.isLocal ? "bg-danger" : "bg-secondary");
      var assetLabel = "Image";
      if (asset.type === "pdf") {
        assetLabel = "PDF";
      } else if (asset.assetKind === "background") {
        assetLabel = "Background Image";
      }
      typeBadge.textContent =
        assetLabel + (asset.isLocal ? " - Local path" : " - Current source");

      var controls = document.createElement("div");
      controls.className = "d-flex align-items-center gap-2 flex-wrap w-100";

      var youtubeId = asset.type !== "pdf" ? getYoutubeIdFromSrc(src) : null;

      if (!youtubeId) {
        var fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept =
          asset.type === "pdf" ? ".pdf,application/pdf" : "image/*";
        fileInput.className = "form-control form-control-sm";
        fileInput.style.maxWidth = "240px";

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-sm btn-warning";
        btn.textContent = "Upload & Replace";

        var status = document.createElement("span");
        status.className = "small";

        btn.addEventListener("click", async function () {
          if (!fileInput.files || !fileInput.files[0]) {
            status.textContent = "Select a file first";
            return;
          }
          btn.disabled = true;
          btn.textContent = "Uploading…";
          status.textContent = "";
          var fd = new FormData();
          fd.append("upload", fileInput.files[0]);
          fd.append("oldSource", src);
          try {
            var endpoint =
              asset.type === "pdf"
                ? "/api/upload/content-pdf"
                : "/api/upload/content-image";
            var res = await fetch(endpoint, {
              method: "POST",
              body: fd,
            });
            var data = await res.json();
            if (!data.url)
              throw new Error(
                (data.error && data.error.message) || "Upload failed"
              );

            // Replace old asset path in HTML attributes and CSS url(...).
            var oldHtml = getHtml();
            var newHtml = replaceAssetSourceInHtml(oldHtml, src, data.url);
            setHtml(newHtml);

            status.className = "small text-success";
            status.textContent = "\u2713 Replaced \u2192 " + data.url;
            row.style.borderColor = "#198754";
            row.style.background = "#f0fff4";
            btn.textContent = "Done";
            btn.className = "btn btn-sm btn-success";

            // Re-scan after a short delay
            setTimeout(recheck, 200);
          } catch (err) {
            status.className = "small text-danger";
            status.textContent = "\u2717 " + err.message;
            btn.disabled = false;
            btn.textContent = "Upload & Replace";
          }
        });

        controls.appendChild(fileInput);
        controls.appendChild(btn);
        controls.appendChild(status);
      }

      // ── YouTube replace section (shown for YouTube thumbnail assets) ─────────
      if (youtubeId) {
        // Mutable ref so repeated Replace clicks always use the current video ID
        var ytIdRef = { current: youtubeId };
        var ytTitleRef = {
          current: getCurrentVideoTitle(getHtml(), youtubeId),
        };

        var ytSection = document.createElement("div");
        ytSection.className = "w-100";
        ytSection.style.cssText =
          "border-top:1px dashed #dee2e6;margin-top:8px;padding-top:10px";

        var ytLabelEl = document.createElement("div");
        ytLabelEl.className = "small text-muted mb-1";
        ytLabelEl.innerHTML =
          '<i class="bi bi-youtube" style="color:#FF0000"></i>' +
          " <strong>Replace YouTube video:</strong>";

        var ytControls = document.createElement("div");
        ytControls.className =
          "d-flex align-items-center gap-2 flex-wrap w-100";

        var ytInput = document.createElement("input");
        ytInput.type = "text";
        ytInput.placeholder =
          "Paste YouTube URL (youtu.be/... or youtube.com/watch?v=...)";
        ytInput.className = "form-control form-control-sm";
        ytInput.style.flex = "1";
        ytInput.style.minWidth = "240px";

        var ytTitleInput = document.createElement("input");
        ytTitleInput.type = "text";
        ytTitleInput.placeholder = "Title (optional)";
        ytTitleInput.className = "form-control form-control-sm";
        ytTitleInput.style.flex = "1";
        ytTitleInput.style.minWidth = "220px";
        ytTitleInput.value = ytTitleRef.current || "";

        var groupSelect = document.createElement("select");
        groupSelect.className = "form-select form-select-sm";
        groupSelect.style.cssText = "width:auto;min-width:120px";
        ["video", "webinars"].forEach(function (g) {
          var opt = document.createElement("option");
          opt.value = g;
          opt.textContent = g.charAt(0).toUpperCase() + g.slice(1);
          groupSelect.appendChild(opt);
        });
        groupSelect.value = getCurrentVideoGroup(getHtml(), youtubeId);

        var ytActionsRow = document.createElement("div");
        ytActionsRow.className =
          "d-flex align-items-center gap-2 flex-wrap w-100 mt-2";

        var ytThumbLabel = document.createElement("label");
        ytThumbLabel.className = "small text-muted mb-0";
        ytThumbLabel.style.whiteSpace = "nowrap";
        ytThumbLabel.textContent = "Custom thumbnail (optional):";

        var ytThumbInput = document.createElement("input");
        ytThumbInput.type = "file";
        ytThumbInput.accept = "image/*";
        ytThumbInput.className = "form-control form-control-sm";
        ytThumbInput.style.maxWidth = "240px";

        var ytThumbPreview = document.createElement("img");
        ytThumbPreview.style.cssText =
          "width:64px;height:44px;object-fit:cover;border-radius:4px;border:1px solid #ddd;display:none";

        ytThumbInput.addEventListener("change", function () {
          var file = ytThumbInput.files && ytThumbInput.files[0];
          if (!file) {
            ytThumbPreview.style.display = "none";
            ytThumbPreview.src = "";
            return;
          }
          var reader = new FileReader();
          reader.onload = function (e) {
            ytThumbPreview.src = e.target.result;
            ytThumbPreview.style.display = "inline-block";
          };
          reader.readAsDataURL(file);
        });

        var ytBtn = document.createElement("button");
        ytBtn.type = "button";
        ytBtn.className = "btn btn-sm btn-danger";
        ytBtn.textContent = "Replace";

        var ytStatus = document.createElement("span");
        ytStatus.className = "small";
        ytStatus.style.flex = "1";
        ytStatus.style.minWidth = "180px";

        ytBtn.addEventListener(
          "click",
          (function (idRef, titleRef) {
            return async function () {
              var url = ytInput.value.trim();
              var thumbFile = ytThumbInput.files && ytThumbInput.files[0];
              var manualTitle = (ytTitleInput.value || "").trim();
              var titleChanged = manualTitle !== (titleRef.current || "");

              if (!url && !thumbFile && !titleChanged) {
                ytStatus.className = "small text-warning";
                ytStatus.textContent =
                  "\u26A0 Paste YouTube URL, change title, or choose a custom thumbnail";
                return;
              }

              var newId = idRef.current;
              if (url) {
                newId = extractYoutubeIdFromUrl(url);
              }
              if (url && !newId) {
                ytStatus.className = "small text-danger";
                ytStatus.textContent =
                  "\u2717 Cannot find YouTube video ID in that URL";
                return;
              }

              ytBtn.disabled = true;
              ytBtn.textContent = "Replacing\u2026";
              ytStatus.className = "small text-muted";
              ytStatus.textContent = url
                ? "Fetching title\u2026"
                : "Uploading thumbnail\u2026";

              var newTitle = null;
              if (url) {
                try {
                  var oembedUrl =
                    "https://www.youtube.com/oembed?url=https://youtu.be/" +
                    encodeURIComponent(newId) +
                    "&format=json";
                  var resp = await fetch(oembedUrl);
                  if (resp.ok) {
                    var meta = await resp.json();
                    newTitle = meta.title || null;
                  }
                } catch (e) {
                  // oEmbed unavailable – proceed without title
                }
              }

              // Only override fetched title when user actually edited title input.
              if (titleChanged) {
                newTitle = manualTitle;
              }

              var customThumbnailUrl = null;
              if (thumbFile) {
                try {
                  var fd = new FormData();
                  fd.append("upload", thumbFile);
                  var thumbRes = await fetch("/api/upload/content-image", {
                    method: "POST",
                    body: fd,
                  });
                  var thumbData = await thumbRes.json();
                  if (!thumbData.url) {
                    throw new Error(
                      (thumbData.error && thumbData.error.message) ||
                        "Thumbnail upload failed"
                    );
                  }
                  customThumbnailUrl = thumbData.url;
                } catch (err) {
                  ytStatus.className = "small text-danger";
                  ytStatus.textContent = "\u2717 " + err.message;
                  ytBtn.disabled = false;
                  ytBtn.textContent = "Replace";
                  return;
                }
              }

              var newGroup = groupSelect.value;
              var newHtml = replaceYoutubeVideoInHtml(
                getHtml(),
                idRef.current,
                newId,
                newGroup,
                newTitle,
                customThumbnailUrl
              );
              setHtml(newHtml);

              var newDisplaySrc =
                customThumbnailUrl ||
                "https://img.youtube.com/vi/" + newId + "/hqdefault.jpg";
              src = newDisplaySrc;
              idRef.current = newId;
              if (newTitle) {
                titleRef.current = newTitle;
                ytTitleInput.value = newTitle;
              }
              preview.src = newDisplaySrc;
              label.textContent = newDisplaySrc;
              ytInput.value = "";
              ytThumbInput.value = "";
              ytThumbPreview.style.display = "none";
              ytThumbPreview.src = "";

              ytStatus.className = "small text-success";
              ytStatus.textContent =
                "\u2713 Replaced" + (newTitle ? " \u2192 " + newTitle : "");
              row.style.borderColor = "#198754";
              row.style.background = "#f0fff4";
              ytBtn.disabled = false;
              ytBtn.textContent = "Replace";
            };
          })(ytIdRef, ytTitleRef)
        );

        ytActionsRow.appendChild(ytThumbLabel);
        ytActionsRow.appendChild(ytThumbInput);
        ytActionsRow.appendChild(ytThumbPreview);
        ytActionsRow.appendChild(ytStatus);
        ytActionsRow.appendChild(ytBtn);

        ytControls.appendChild(ytInput);
        ytControls.appendChild(groupSelect);
        ytControls.appendChild(ytTitleInput);
        ytSection.appendChild(ytLabelEl);
        ytSection.appendChild(ytControls);
        ytSection.appendChild(ytActionsRow);
        controls.appendChild(ytSection);
      }
      // ─────────────────────────────────────────────────────────────────────────

      row.appendChild(preview);
      row.appendChild(typeBadge);
      row.appendChild(label);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }

  global.ContentImgChecker = { init: init, recheck: recheck };
})(window);
