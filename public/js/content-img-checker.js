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

  function appendYoutubeCardToHtml(html, videoId, group, title, thumbnailUrl) {
    var wrapper = document.createElement("div");
    wrapper.innerHTML = String(html || "");
    var cardHtml = buildYoutubeCardHtml(videoId, group, title, thumbnailUrl);
    var track = wrapper.querySelector(".my-carousel-track");

    if (track) {
      // Add newest item on top (start of the track).
      track.insertAdjacentHTML("afterbegin", cardHtml);
      return wrapper.innerHTML;
    }

    // Fallback: put newest card first if no carousel track found.
    return cardHtml + wrapper.innerHTML;
  }
  // ─────────────────────────────────────────────────────────────────────────────

  function extractUnresolvedServerImgs(html) {
    return extractImgs(html)
      .map(function (x) {
        return x.src;
      })
      .filter(function (src) {
        // YouTube CDN thumbnails are valid external URLs – do not block save
        return !isServerHostedSrc(src) && !isYoutubeThumbnailSrc(src);
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
        check
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

  function render(container, assets, getHtml, setHtml, recheck) {
    container.innerHTML = "";
    if (!assets.length) return;

    var localCount = assets.filter(function (x) {
      return x.isLocal;
    }).length;
    var plural = assets.length > 1 ? "s" : "";
    var header = document.createElement("div");
    header.className = "alert alert-warning py-2 px-3 mb-2";
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
    container.appendChild(header);

    var addBar = document.createElement("div");
    addBar.className = "d-flex justify-content-end mb-2";

    var addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-sm btn-primary";
    addBtn.textContent = "Add";
    addBar.appendChild(addBtn);
    container.appendChild(addBar);

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
      badge.textContent = "YouTube - New item";

      var controls = document.createElement("div");
      controls.className = "d-flex align-items-center gap-2 flex-wrap w-100";

      var urlInput = document.createElement("input");
      urlInput.type = "text";
      urlInput.className = "form-control form-control-sm";
      urlInput.style.minWidth = "260px";
      urlInput.style.flex = "1";
      urlInput.placeholder = "Paste YouTube URL";

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
      var lastResolvedVideoId = "";
      var hydrateTitleTimer = null;

      titleInput.addEventListener("input", function () {
        shouldAutoFillTitle = !(titleInput.value || "").trim();
      });

      async function hydrateTitleFromUrl() {
        var inputUrl = (urlInput.value || "").trim();
        var videoId = extractYoutubeIdFromUrl(inputUrl);
        if (!videoId) return;

        // Avoid duplicate fetches for the same URL/video when title exists.
        if (
          videoId === lastResolvedVideoId &&
          (titleInput.value || "").trim()
        ) {
          return;
        }

        try {
          status.className = "small text-muted";
          status.textContent = "Fetching title\u2026";
          var oembedUrl =
            "https://www.youtube.com/oembed?url=https://youtu.be/" +
            encodeURIComponent(videoId) +
            "&format=json";
          var resp = await fetch(oembedUrl);
          if (!resp.ok) return;

          var meta = await resp.json();
          var fetchedTitle = (meta.title || "").trim();
          if (
            fetchedTitle &&
            (shouldAutoFillTitle || !(titleInput.value || "").trim())
          ) {
            titleInput.value = fetchedTitle;
            shouldAutoFillTitle = true;
          }

          status.textContent = "";
          status.className = "small";
          lastResolvedVideoId = videoId;
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
        var videoId = extractYoutubeIdFromUrl(inputUrl);
        if (!videoId) {
          status.className = "small text-danger";
          status.textContent = "\u2717 Invalid YouTube URL";
          return;
        }

        addItemBtn.disabled = true;
        addItemBtn.textContent = "Adding\u2026";
        status.className = "small text-muted";
        status.textContent = "Preparing video data\u2026";

        var title = (titleInput.value || "").trim();
        if (!title) {
          try {
            var oembedUrl =
              "https://www.youtube.com/oembed?url=https://youtu.be/" +
              encodeURIComponent(videoId) +
              "&format=json";
            var resp = await fetch(oembedUrl);
            if (resp.ok) {
              var meta = await resp.json();
              title = (meta.title || "").trim();
            }
          } catch {
            // Ignore oEmbed failures and keep default title fallback.
          }
        }

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

        var updatedHtml = appendYoutubeCardToHtml(
          getHtml(),
          videoId,
          groupSelect.value,
          title || "Video Title Goes Here",
          customThumbnailUrl
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

    assets.forEach(function (asset) {
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
