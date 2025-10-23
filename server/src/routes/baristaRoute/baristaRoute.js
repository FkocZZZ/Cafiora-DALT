const express = require("express");

const router = express.Router();
const { auth } = require("../../middlewares/auth");
const {
  validateAccessToken,
} = require("../../middlewares/validateAccessToken");
const {
  getAllOrdersBarista,
  updateOrderStatus,
} = require("../../controllers/baristaController");

// lấy tất cả other
router.get(
  "/barista/getAllOrders",
  validateAccessToken,
  auth(["barista"]),
  getAllOrdersBarista
);

//sửa other
router.put(
  "/barista/updateOrderStatus/:id",
  validateAccessToken,
  auth(["barista"]),
  updateOrderStatus
);

module.exports = router;
