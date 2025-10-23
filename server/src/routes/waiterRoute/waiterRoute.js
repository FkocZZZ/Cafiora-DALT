const express = require("express");
const {
  createOrder,
  getAllOrdersWaiter,
  updateOrder,
  deleteOrder,
} = require("../../controllers/waiterController");
const router = express.Router();
const { auth } = require("../../middlewares/auth");
const {
  validateAccessToken,
} = require("../../middlewares/validateAccessToken");

//tạo đơn orther mới
router.post(
  "/waiter/createOrder",
  validateAccessToken,
  auth(["waiter"]),
  createOrder
);
// lấy tất cả other
router.get("/waiter/getAllOrders", validateAccessToken, getAllOrdersWaiter);

//sửa other
router.put(
  "/waiter/updateOrder/:id",
  validateAccessToken,
  auth(["waiter"]),
  updateOrder
);

//xóa orther
router.delete(
  "/waiter/deleteOrder/:id",
  validateAccessToken,
  auth(["waiter"]),
  deleteOrder
);
module.exports = router;
