// models/orderModel.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    table_number: {
      type: Number,
      required: [true, "Please add table number"],
    },
    employee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // vì model User export là "users"
      required: true,
    },
    status: {
      type: Boolean, // true = đã xử lý, false = đang chờ
      default: false,
    },
    note: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
