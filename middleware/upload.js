const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Base uploads dir
    const baseUploads = path.join(__dirname, "../public/uploads");
    // Derive subdir from request path (e.g., 'groups' from '/groups/create')
    const parts = (req.originalUrl || "").split("/").filter(Boolean);
    // If URL starts with 'api', use second part (e.g., '/api/menus' -> 'menus')
    let subdir = parts[0] || "others";
    if (subdir === "api" && parts[1]) {
      subdir = parts[1];
    }
    const uploadDir = path.join(baseUploads, subdir);

    try {
      if (!fs.existsSync(baseUploads))
        fs.mkdirSync(baseUploads, { recursive: true });
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  filename: function (req, file, cb) {
    // Use title_en and id for filename if available
    let ext = path.extname(file.originalname);
    let title = (req.body.title_en || "group")
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
    // If editing, remove old file if exists
    if (
      req.method === "POST" &&
      req.originalUrl.includes("update") &&
      req.body.oldImage
    ) {
      const oldPath = path.join(__dirname, "../public", req.body.oldImage);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
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
