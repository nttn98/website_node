const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
require("dotenv").config();

const app = express();

/* ===== DATABASE ===== */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(console.error);

/* ===== MIDDLEWARE ===== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const methodOverride = require("method-override");

app.use(methodOverride("_method"));

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

/* ===== GLOBAL LOCALS (FIX sidebar crash) ===== */
app.use((req, res, next) => {
  res.locals.currentMenuId = null;
  res.locals.menus = [];
  next();
});

/* ===== VIEW ===== */
app.use(expressLayouts);
app.set("layout", "layouts/dashboard");
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* ===== STATIC ===== */
app.use(express.static(path.join(__dirname, "public")));

/* ===== ROUTES ===== */
app.use("/admin", require("./modules/user/routes/admin.routes"));
app.use("/api/menus", require("./modules/menu/routes/menu.routes"));
app.use("/dashboard", require("./modules/dashboard/routes/dashboard.routes"));
app.use("/groups", require("./modules/group/routes/group.routes"));
app.use("/details", require("./modules/detail/routes/detail.routes"));

app.get("/", (req, res) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  res.redirect("/dashboard/menus");
});

/* ===== SERVER ===== */
app.listen(3000, () => console.log("🚀 http://localhost:3000"));
