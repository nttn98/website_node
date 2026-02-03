const menuService = require("../../menu/services/menu.service");

exports.index = async (req, res) => {
  try {
    const menus = await menuService.getAllMenus();
    res.json({ success: true, menus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Dashboard load failed" });
  }
};
