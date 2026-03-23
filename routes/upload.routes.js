const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { requireLogin } = require("../middleware/auth");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/uploads/content");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype && file.mimetype.startsWith("image/"))
    return cb(null, true);
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".svg") return cb(null, true);
  cb(new Error("Only image files are allowed"), false);
}

const contentUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const pdfStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, "../public/uploads/pdf");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ext);
  },
});

function pdfFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === "application/pdf" || ext === ".pdf") {
    return cb(null, true);
  }
  cb(new Error("Only PDF files are allowed"), false);
}

const contentPdfUpload = multer({
  storage: pdfStorage,
  fileFilter: pdfFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

function normalizePublicPathFromSource(value) {
  let input = String(value || "")
    .trim()
    .replace(/\\/g, "/");
  if (!input) return "";

  if (/^https?:\/\//i.test(input)) {
    try {
      input = new URL(input).pathname || "";
    } catch {
      return "";
    }
  }

  input = input.split("?")[0].split("#")[0];
  if (!input.startsWith("/")) input = `/${input}`;
  return input;
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

function cleanupOldSourceByPrefix(oldSource, requiredPrefix) {
  const normalized = normalizePublicPathFromSource(oldSource);
  if (!normalized.startsWith(requiredPrefix)) return;

  const oldFilePath = resolvePublicFilePath(normalized);
  if (!oldFilePath) return;

  try {
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
  } catch {
    // Best effort only. Do not fail upload if cleanup fails.
  }
}

function resolvePublicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) {
    return String(process.env.PUBLIC_BASE_URL).replace(/\/$/, "");
  }

  const forwardedProto = (req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const forwardedHost = (req.headers["x-forwarded-host"] || "")
    .split(",")[0]
    .trim();
  const originalHost = (req.headers["x-original-host"] || "")
    .split(",")[0]
    .trim();

  let originHost = "";
  let originProto = "";
  const origin = req.headers.origin;
  if (origin) {
    try {
      const u = new URL(origin);
      originHost = u.host;
      originProto = u.protocol.replace(":", "");
    } catch {
      // ignore invalid origin
    }
  }

  // x-arr-ssl is commonly present on IIS/ARR HTTPS requests
  const proto =
    forwardedProto ||
    originProto ||
    (req.headers["x-arr-ssl"] ? "https" : "") ||
    req.protocol ||
    "https";

  let host =
    forwardedHost ||
    originalHost ||
    (req.get("host") || "").split(",")[0].trim();

  // If proxy rewrote host to localhost, prefer browser origin host.
  if (
    (!host || host.includes("localhost") || host.startsWith("127.0.0.1")) &&
    originHost
  ) {
    host = originHost;
  }

  return `${proto}://${host}`.replace(/\/$/, "");
}

// CKEditor SimpleUploadAdapter sends file as field 'upload'
// HTML panel also uses field 'upload'
router.post(
  "/content-image",
  requireLogin,
  contentUpload.single("upload"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }
    const baseUrl = resolvePublicBaseUrl(req);
    const url = `${baseUrl}/uploads/content/${req.file.filename}`;

    // If replacing an existing content image, remove old file.
    cleanupOldSourceByPrefix(req.body?.oldSource, "/uploads/content/");

    res.json({ url });
  }
);

router.post(
  "/content-pdf",
  requireLogin,
  contentPdfUpload.single("upload"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: { message: "No file uploaded" } });
    }
    const baseUrl = resolvePublicBaseUrl(req);
    const url = `${baseUrl}/uploads/pdf/${req.file.filename}`;

    // If replacing an existing PDF link from content, remove old file.
    cleanupOldSourceByPrefix(req.body?.oldSource, "/uploads/pdf/");

    res.json({ url });
  }
);

module.exports = router;
