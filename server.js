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
app.use("/buttons", require("./modules/button/routes/button.routes"));
app.use("/forms", require("./modules/form/routes/form.routes"));
app.use("/api/forms", require("./modules/form/routes/submission.routes"));
app.use("/api/socials", require("./modules/social/routes/social.routes"));

// View routes (EJS render)
app.use("/", require("./routes/view.routes"));

/* ===== SERVER ===== */
app.listen(3000, () => console.log("🚀 http://localhost:3000"));
