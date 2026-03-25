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

  function getPdfArticleCards(wrapper) {
    var cards = Array.from(
      wrapper.querySelectorAll(
        "article.whitepaper-card, article.card.card-horizontal"
      )
    );
    return cards.filter(function (card) {
      var anchor = card.querySelector("a.card-link[href], a[href]");
      var href = anchor ? anchor.getAttribute("href") || "" : "";
      return isPdfHrefValue(href);
    });
  }

  function getArticleCardsInParent(parent) {
    if (!parent) return [];
    return Array.from(
      parent.querySelectorAll(
        "article.whitepaper-card, article.card.card-horizontal"
      )
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
  // ─────────────────────────────────────────────────────────────────────────────

  function extractUnresolvedServerImgs(html) {
    return extractImgs(html)
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
      var images = extractImgs(html).map(function (x) {
        return { src: x.src, isLocal: x.isLocal, type: "image" };
      });
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
    var pdfGroupItemsForHtml =
      !forceShowPanel && pdfGroupForHtml
        ? extractPdfArticleItems(getHtml())
        : [];
    var hiddenAssetSources = {};
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
      var pdfGroup = pdfGroupForHtml;
      if (pdfGroup) {
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
      typeBadge.textContent =
        (asset.type === "pdf" ? "PDF" : "Image") +
        (asset.isLocal ? " - Local path" : " - Current source");

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

            // Replace old src in the HTML (handles both quote styles)
            var oldHtml = getHtml();
            var newHtml = oldHtml
              .split('"' + src + '"')
              .join('"' + data.url + '"')
              .split("'" + src + "'")
              .join("'" + data.url + "'");
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
