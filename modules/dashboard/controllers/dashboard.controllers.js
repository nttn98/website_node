const menuService = require("../../menu/services/menu.services");
const {
  getPaginationParams,
  paginateArray,
} = require("../../../utils/pagination");

exports.index = async (req, res) => {
  try {
    const params = getPaginationParams(req, {
      defaultLimit: 30,
      maxLimit: 300,
    });
    const menus = await menuService.getAllMenus();
    const paged = paginateArray(menus, params);
    res.json({
      success: true,
      menus: paged.items,
      pagination: paged.pagination,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Dashboard load failed" });
  }
};
