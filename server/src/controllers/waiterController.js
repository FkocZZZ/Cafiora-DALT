const asyncHandler = require("express-async-handler");
const Product = require("../models/productModel");
const { cloudinary } = require("../configs/cloudinaryConfig");
const Order = require("../models/ortherModel");
const OrderDetail = require("../models/ortherDetailModel");

//@desc createOrder
//@route Post /api/waiter/createOrder
//@access private

// items truyen do la 1 mang vd:
/*{
    "table_number":5,
    "items":[
        {"product_id":"68e14896e33a5bfc6f12c8d0",
        "quantity":"5",
        "unit_price":30000}
    ],
     "note": "Không đá"
}*/
const createOrder = asyncHandler(async (req, res) => {
  try {
    const { table_number, items, note } = req.body;

    const order = await Order.create({
      table_number,
      employee_id: req.user._id,
      note,
      status: false,
    });

    const itemsWithSubtotal = items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      subtotal: item.unit_price * item.quantity,
    }));

    const orderDetail = await OrderDetail.create({
      order_id: order._id,
      items: itemsWithSubtotal,
    });

    res.status(201).json({
      message: "Tạo đơn hàng thành công!",
      order,
      orderDetail,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi tạo đơn hàng", error });
  }
});

//@desc getAllOrders
//@route post /api/waiter/getAllOrders
//@access private
const getAllOrdersWaiter = asyncHandler(async (req, res) => {
  try {
    // Lấy tất cả đơn hàng, sắp xếp mới nhất ở đầu
    const orders = await Order.find()
      .populate("employee_id", "username email")
      .sort({ createdAt: -1 });

    const fullOrders = await Promise.all(
      orders.map(async (order) => {
        // Lấy OrderDetail theo order_id
        const orderDetail = await OrderDetail.findOne({
          order_id: order._id,
        });

        return {
          order,
          orderDetail,
        };
      })
    );

    res.json({
      message: "Lấy dữ liệu thành công",
      data: fullOrders,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi lấy dữ liệu", error });
  }
});
//@desc updateOrder
//@route PUT /api/waiter/updateOrder/:id
//@access private
const updateOrder = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { note, items } = req.body; // items là mảng gồm các món ăn

    // 1. Tìm đơn hàng
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    // 2. Cập nhật ghi chú
    if (note) order.note = note;
    await order.save();

    // 3. Cập nhật món ăn trong OrderDetail
    if (items && Array.isArray(items)) {
      const updatedItems = items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: item.unit_price * item.quantity,
      }));

      // Tìm chi tiết món ăn theo order_id
      let orderDetail = await OrderDetail.findOne({ order_id: id });

      if (orderDetail) {
        // Nếu đã có thì cập nhật lại mảng items
        orderDetail.items = updatedItems;
        await orderDetail.save();
      } else {
        // Nếu chưa có thì tạo mới
        await OrderDetail.create({
          order_id: id,
          items: updatedItems,
        });
      }
    }

    res.json({
      message: "Cập nhật đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi khi cập nhật đơn hàng",
      error: error.message,
    });
  }
});

//@desc adminAuth
//@route delete /api/waiter/deleteProduct/:id
//@access private
const deleteOrder = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order)
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });

    // Xoá chi tiết trước
    await OrderDetail.deleteMany({ order_id: id });

    await order.deleteOne();
    res.json({ message: "Xoá đơn hàng thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xoá đơn hàng", error });
  }
});
module.exports = {
  createOrder,
  getAllOrdersWaiter,
  updateOrder,
  deleteOrder,
};
