const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
require("dotenv").config();

const app = express();
require("./swagger")(app);

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
// API routes (JSON only)
app.use("/user", require("./modules/user/routes/user.routes"));
app.use("/api/menus", require("./modules/menu/routes/menu.routes"));
app.use("/dashboard", require("./modules/dashboard/routes/dashboard.routes"));
app.use("/groups", require("./modules/group/routes/group.routes"));
app.use("/details", require("./modules/detail/routes/detail.routes"));

// View routes (EJS render, data fetch qua API)
function requireLoginView(req, res, next) {
  if (!req.session.user) return res.redirect("/user/login");
  next();
}

app.get("/", requireLoginView, (req, res) => {
  res.redirect("/dashboard/menus");
});
const menuService = require("./modules/menu/services/menu.service");
app.get("/dashboard/menus", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/menus/index");
});
app.get("/dashboard/groups", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/groups/index");
});
app.get("/dashboard/details", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/details/index");
});
// Thêm các route create/edit nếu cần:
app.get("/dashboard/menus/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/menus/create");
});
app.get("/dashboard/menus/:id/edit", requireLoginView, async (req, res) => {
  const [menus, menu] = await Promise.all([
    menuService.getAllMenus(),
    menuService.getMenuById(req.params.id),
  ]);
  res.render("dashboard/menus/edit", { menus, menu });
});
app.get("/dashboard/groups/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/groups/create");
});
app.get("/dashboard/groups/:id/edit", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/groups/edit", { id: req.params.id });
});
app.get("/dashboard/details/create", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/details/create");
});
app.get("/dashboard/details/:id/edit", requireLoginView, async (req, res) => {
  res.locals.menus = await menuService.getAllMenus();
  res.render("dashboard/details/edit", { id: req.params.id });
});

/* ===== SERVER ===== */
app.listen(3000, () => console.log("🚀 http://localhost:3000"));
