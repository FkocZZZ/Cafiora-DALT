const asyncHandler = require("express-async-handler");

const Order = require("../models/ortherModel");
const OrderDetail = require("../models/ortherDetailModel");

//@desc getAllOrders
//@route post /api/barista/getAllOrders
//@access private
const getAllOrdersBarista = asyncHandler(async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("employee_id", "username email")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách đơn hàng", error });
  }
});

//@desc update status
//@route put /api/barista/updateOrderStatus/:id
//@access private
const updateOrderStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    if (status !== undefined) order.status = status;

    await order.save();

    res.json({ message: "Cập nhật đơn hàng thành công", order });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật đơn hàng", error });
  }
});

module.exports = {
  getAllOrdersBarista,
  updateOrderStatus,
};
