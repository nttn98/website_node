const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;

function getUploadSubdir(req) {
  const parts = (req.originalUrl || "").split("/").filter(Boolean);
  let subdir = parts[0] || "others";
  if (subdir === "api" && parts[1]) {
    subdir = parts[1];
  }
  return String(subdir || "others").toLowerCase();
}

function normalizePublicImagePath(value) {
  let input = String(value || "")
    .trim()
    .replace(/\\/g, "/");

  // Accept full URL values and keep only the pathname part.
  if (/^https?:\/\//i.test(input)) {
    try {
      input = new URL(input).pathname || "";
    } catch {
      input = "";
    }
  }

  // Drop query/hash if present.
  input = input.split("?")[0].split("#")[0];

  if (!input) return "";
  if (input.startsWith("/")) return input;
  return `/${input}`;
}

function resolvePublicFilePath(publicRelativePath) {
  const publicRoot = path.resolve(__dirname, "../public");
  const relative = String(publicRelativePath || "").replace(/^\/+/, "");
  const absolute = path.resolve(publicRoot, relative);

  // Prevent deleting outside public root.
  if (absolute !== publicRoot && !absolute.startsWith(publicRoot + path.sep)) {
    return null;
  }

  return absolute;
}

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Base uploads dir
    const baseUploads = path.join(__dirname, "../public/uploads");
    // Derive subdir from request path (e.g., 'groups' from '/groups/create')
    const subdir = getUploadSubdir(req);
    const uploadDir = path.join(baseUploads, subdir);

    fsp
      .mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch((err) => cb(err));
  },
  filename: function (req, file, cb) {
    // Use title if available; otherwise fallback to current module name.
    let ext = path.extname(file.originalname);
    const subdir = getUploadSubdir(req);
    let title = (req.body.title_en || req.body.title || subdir)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let id = req.body._id || req.params.id || Date.now();
    let parentName = (req.body.parentName || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    let filename = `${
      (parentName && parentName + "-") || ""
    }${title}-${id}${ext}`;
    const newRelativePath = `/uploads/${subdir}/${filename}`;
    const oldImage = normalizePublicImagePath(req.body.oldImage);

    // Remove old image only when a replacement file is being uploaded.
    if (
      oldImage &&
      oldImage !== newRelativePath &&
      oldImage.startsWith("/uploads/")
    ) {
      const oldPath = resolvePublicFilePath(oldImage);
      if (!oldPath) {
        return cb(null, filename);
      }

      return fsp.unlink(oldPath).then(
        () => cb(null, filename),
        () => cb(null, filename)
      );
    }

    cb(null, filename);
  },
});

// File filter (optional, only images)
function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  // Allow typical image mime types and SVG (image/svg+xml or .svg)
  if (file.mimetype && file.mimetype.startsWith("image/"))
    return cb(null, true);
  if (ext === ".svg") return cb(null, true);
  return cb(new Error("Only image files (including SVG) are allowed!"), false);
}

const upload = multer({ storage, fileFilter });

module.exports = upload;
