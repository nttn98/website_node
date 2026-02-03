const multer = require("multer");
const path = require("path");

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../public/uploads/details"));
  },
  filename: function (req, file, cb) {
    // Use title_en and id for filename if available
    let ext = path.extname(file.originalname);
    let title = (req.body.title_en || "detail")
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
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
}

const upload = multer({ storage, fileFilter });

module.exports = upload;
