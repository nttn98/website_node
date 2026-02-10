// Toast Notification Helper
function showToast(message, isError = false) {
  const id = "ephemeral-toast";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "toast-notification";
    // structure: message (no close button)
    el.innerHTML = '<div class="toast-message"></div>';
    document.body.appendChild(el);
  }
  el.className = "toast-notification " + (isError ? "error" : "success");
  el.querySelector(".toast-message").textContent = message;
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
}
