// Toast Notification Helper
(function () {
  function ensureBodyReady(callback) {
    if (document.body) {
      callback();
      return;
    }
    window.addEventListener("DOMContentLoaded", callback, { once: true });
  }

  function showToast(message, isError = false) {
    ensureBodyReady(() => {
      const id = "ephemeral-toast";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        el.className = "toast-notification";
        el.innerHTML = '<div class="toast-message"></div>';
        document.body.appendChild(el);
      }

      el.className = "toast-notification " + (isError ? "error" : "success");
      el.querySelector(".toast-message").textContent = String(message || "");
      el.classList.add("show");
      el.classList.remove("hide");

      // pause on hover
      el.onmouseenter = () => clearTimeout(el._timeout);
      el.onmouseleave = () => {
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => {
          el.classList.add("hide");
          el.classList.remove("show");
          setTimeout(() => el.remove(), 300);
        }, 2500);
      };

      clearTimeout(el._timeout);
      el._timeout = setTimeout(() => {
        el.classList.add("hide");
        el.classList.remove("show");
        setTimeout(() => el.remove(), 500);
      }, 3000);
    });
  }

  function redirectWithToast(url, message, isError = false) {
    try {
      sessionStorage.setItem(
        "pendingToast",
        JSON.stringify({ message: String(message || ""), isError: !!isError })
      );
    } catch {
      // Best effort only; if storage fails, still redirect.
    }
    window.location.href = url;
  }

  window.showToast = showToast;
  window.redirectWithToast = redirectWithToast;

  ensureBodyReady(() => {
    try {
      const raw = sessionStorage.getItem("pendingToast");
      if (!raw) return;
      sessionStorage.removeItem("pendingToast");
      const payload = JSON.parse(raw);
      if (!payload || !payload.message) return;
      showToast(payload.message, !!payload.isError);
    } catch {
      // Ignore invalid session data.
    }
  });
})();
