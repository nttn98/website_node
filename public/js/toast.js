// Toast Notification Helper
function showToast(message, isError = false) {
  const id = "ephemeral-toast";
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement("div");
    el.id = id;
    el.className = "toast-notification";
    document.body.appendChild(el);
  }
  el.className = "toast-notification " + (isError ? "error" : "success");
  el.textContent = message;
  el.classList.add("show");
  el.classList.remove("hide");
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.classList.add("hide");
    el.classList.remove("show");
    setTimeout(() => el.remove(), 500); // Remove after animation
  }, 3000);
}
