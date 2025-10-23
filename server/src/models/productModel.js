const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    nameProduct: {
      type: String,
      required: [true, 'please add the product name'],
    },
    price: {
      type: Number,
      required: true,
    },
    status: {
      type: Boolean, // true = còn hàng, false = hết hàng
      default: true,
    },
    urlImage: {
      type: String,
      required: [true, 'please add the product image'],
    },
  },
  {
    timestamps: true, // <-- tự thêm createdAt và updatedAt
  }
);

module.exports = mongoose.model('products', schema);
