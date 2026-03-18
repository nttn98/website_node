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
      if (found.some((x) => x.src === src)) continue;
      found.push({ src: src, isLocal: isLocalSrc(src) });
    }
    return found;
  }

  function extractUnresolvedServerImgs(html) {
    return extractImgs(html)
      .map(function (x) {
        return x.src;
      })
      .filter(function (src) {
        return !isServerHostedSrc(src);
      });
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
      var images = extractImgs(html);
      render(container, images, opts.getHtml, opts.setHtml, check);
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
          var unresolved = extractUnresolvedServerImgs(html);
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
              "Please upload and replace all non-server images before save/update",
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
        return extractUnresolvedServerImgs(opts.getHtml ? opts.getHtml() : "");
      },
    };
  }

  function render(container, images, getHtml, setHtml, recheck) {
    container.innerHTML = "";
    if (!images.length) return;

    var localCount = images.filter(function (x) {
      return x.isLocal;
    }).length;
    var plural = images.length > 1 ? "s" : "";
    var header = document.createElement("div");
    header.className = "alert alert-warning py-2 px-3 mb-2";
    header.innerHTML =
      "<strong>&#128247; " +
      images.length +
      " image" +
      plural +
      " found in content</strong>" +
      " &mdash; Upload to server to replace source quickly." +
      (localCount
        ? " <br><small>" +
          localCount +
          " local path(s) may break on production if not uploaded.</small>"
        : "");
    container.appendChild(header);

    images.forEach(function (img) {
      var src = img.src;
      var row = document.createElement("div");
      row.className =
        "d-flex align-items-start gap-2 mt-2 flex-wrap border rounded p-2 bg-white";

      var preview = document.createElement("img");
      preview.alt = "Content image preview";
      preview.style.width = "80px";
      preview.style.height = "56px";
      preview.style.objectFit = "cover";
      preview.style.borderRadius = "4px";
      preview.style.border = "1px solid #e9ecef";
      preview.style.background = "#f8f9fa";
      if (/^(https?:\/\/|\/|\/\/|data:)/i.test(src)) {
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
        "badge " + (img.isLocal ? "bg-danger" : "bg-secondary");
      typeBadge.textContent = img.isLocal ? "Local path" : "Current source";

      var controls = document.createElement("div");
      controls.className = "d-flex align-items-center gap-2 flex-wrap w-100";

      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
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
        try {
          var res = await fetch("/api/upload/content-image", {
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
      row.appendChild(preview);
      row.appendChild(typeBadge);
      row.appendChild(label);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }

  global.ContentImgChecker = { init: init, recheck: recheck };
})(window);
