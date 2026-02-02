const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

router.get("/login", (req, res) => {
  if (req.session.admin) {
    return res.redirect("/dashboard/menus");
  }
  res.render("admin/login", { layout: false });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });

  // user không tồn tại
  if (!user) {
    return res.render("admin/login", {
      layout: false,
      error: "Invalid username or password",
    });
  }

  // check password bằng bcrypt
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.render("admin/login", {
      layout: false,
      error: "Invalid username or password",
    });
  }

  // login success
  req.session.admin = {
    _id: user._id,
    username: user.username,
  };

  res.redirect("/dashboard/menus");
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/admin/login");
  });
});

module.exports = router;
