require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Voucher = require("../src/models/Voucher");
const Order = require("../src/models/Order");

const voucherSeeds = [
  {
    code: "SALE10",
    type: "percent",
    value: 10,
    minOrderValue: 100000,
    maxDiscount: 50000,
    usageLimit: 500,
    expiresAt: "2030-12-31T23:59:59.000Z",
    status: "active",
  },
  {
    code: "WELCOME50K",
    type: "fixed",
    value: 50000,
    minOrderValue: 300000,
    maxDiscount: null,
    usageLimit: 300,
    expiresAt: "2030-12-31T23:59:59.000Z",
    status: "active",
  },
];

const seedOrderEmails = [
  "seed-order-1@bookstore.local",
  "seed-order-2@bookstore.local",
  "seed-order-3@bookstore.local",
];

const orderSeeds = [
  {
    userId: "seed_user_1",
    shippingInfo: {
      name: "Seed Customer 1",
      phone: "0900000101",
      email: "seed-order-1@bookstore.local",
      address: "1 Nguyen Hue, Ho Chi Minh City",
    },
    paymentMethod: "cod",
    paymentStatus: "paid",
    orderStatus: "completed",
    voucherInfo: {
      code: "SALE10",
      type: "percent",
      value: 10,
      discountAmount: 30000,
    },
    items: [
      {
        productId: "seed-book-node",
        title: "Node.js in Practice",
        price: 180000,
        image: "https://images.unsplash.com/photo-1544717305-2782549b5136",
        quantity: 1,
        stockSnapshot: 20,
      },
      {
        productId: "seed-book-react",
        title: "React Architecture Handbook",
        price: 210000,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794",
        quantity: 1,
        stockSnapshot: 25,
      },
    ],
    totals: {
      subtotal: 390000,
      discount: 30000,
      total: 360000,
    },
  },
  {
    userId: "seed_user_2",
    shippingInfo: {
      name: "Seed Customer 2",
      phone: "0900000102",
      email: "seed-order-2@bookstore.local",
      address: "2 Le Loi, Ho Chi Minh City",
    },
    paymentMethod: "online",
    paymentStatus: "pending",
    orderStatus: "shipping",
    voucherInfo: {
      code: null,
      type: null,
      value: 0,
      discountAmount: 0,
    },
    items: [
      {
        productId: "seed-book-ddia",
        title: "Designing Data-Intensive Systems",
        price: 320000,
        image: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
        quantity: 1,
        stockSnapshot: 10,
      },
    ],
    totals: {
      subtotal: 320000,
      discount: 0,
      total: 320000,
    },
  },
  {
    userId: "seed_user_3",
    shippingInfo: {
      name: "Seed Customer 3",
      phone: "0900000103",
      email: "seed-order-3@bookstore.local",
      address: "3 Tran Hung Dao, Ho Chi Minh City",
    },
    paymentMethod: "cod",
    paymentStatus: "cancelled",
    orderStatus: "cancelled",
    voucherInfo: {
      code: "WELCOME50K",
      type: "fixed",
      value: 50000,
      discountAmount: 50000,
    },
    items: [
      {
        productId: "seed-book-clean",
        title: "Clean Code in JavaScript",
        price: 195000,
        image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
        quantity: 2,
        stockSnapshot: 15,
      },
    ],
    totals: {
      subtotal: 390000,
      discount: 50000,
      total: 340000,
    },
  },
];

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  for (const voucher of voucherSeeds) {
    await Voucher.updateOne(
      { code: voucher.code },
      {
        $set: voucher,
      },
      { upsert: true }
    );
    console.log(`[checkout-seed] upserted voucher ${voucher.code}`);
  }

  await Order.deleteMany({
    "shippingInfo.email": { $in: seedOrderEmails },
  });

  await Order.insertMany(orderSeeds);
  console.log(`[checkout-seed] inserted ${orderSeeds.length} sample orders`);
};

run()
  .catch((error) => {
    console.error("[checkout-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
