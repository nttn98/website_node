const menuService = require("../../menu/services/menu.service");

exports.index = async (req, res) => {
  try {
    const menus = await menuService.getAllMenus();

    res.locals.menus = menus;
    res.locals.currentMenuId = null;

    res.render("dashboard/index");
  } catch (err) {
    console.error(err);
    res.status(500).send("Dashboard load failed");
  }
};
