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

  /** Extract all local <img src="..."> values from an HTML string */
  function extractLocalImgs(html) {
    const found = [];
    const re = /<img[^>]+src=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const src = m[1];
      if (isLocalSrc(src) && !found.includes(src)) found.push(src);
    }
    return found;
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
      var locals = extractLocalImgs(html);
      render(container, locals, opts.getHtml, opts.setHtml, check);
    }

    _activeCheck = check;

    if (opts.textarea) {
      opts.textarea.addEventListener("input", check);
      opts.textarea.addEventListener("paste", function () {
        setTimeout(check, 150);
      });
    }

    return { recheck: check };
  }

  function render(container, localSrcs, getHtml, setHtml, recheck) {
    container.innerHTML = "";
    if (!localSrcs.length) return;

    var plural = localSrcs.length > 1 ? "s" : "";
    var header = document.createElement("div");
    header.className = "alert alert-warning py-2 px-3 mb-2";
    header.innerHTML =
      "<strong>&#9888; " +
      localSrcs.length +
      " local image" +
      plural +
      " detected</strong>" +
      " &mdash; These paths only exist on your machine and will be broken on the server." +
      " Upload each image to replace the path automatically.";
    container.appendChild(header);

    localSrcs.forEach(function (src) {
      var row = document.createElement("div");
      row.className =
        "d-flex align-items-start gap-2 mt-2 flex-wrap border rounded p-2 bg-white";

      var label = document.createElement("code");
      label.className = "small text-danger w-100 mb-1";
      label.style.wordBreak = "break-all";
      label.textContent = src;

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
      row.appendChild(label);
      row.appendChild(controls);
      container.appendChild(row);
    });
  }

  global.ContentImgChecker = { init: init, recheck: recheck };
})(window);
