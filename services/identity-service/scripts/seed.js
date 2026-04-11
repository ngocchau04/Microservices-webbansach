require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const User = require("../src/models/User");

const seedUsers = [
  {
    email: "admin@bookstore.local",
    name: "Bookstore Admin",
    password: "Admin@123",
    sdt: "0900000001",
    role: "admin",
    status: "active",
    isActive: true,
    authProvider: "local",
  },
  {
    email: "user@bookstore.local",
    name: "Bookstore User",
    password: "User@123",
    sdt: "0900000002",
    role: "user",
    status: "active",
    isActive: true,
    authProvider: "local",
  },
];

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  for (const account of seedUsers) {
    await User.updateOne(
      { email: account.email },
      {
        $set: account,
        $setOnInsert: {
          favorite: [],
          cart: [],
        },
      },
      { upsert: true }
    );
    console.log(`[identity-seed] upserted ${account.email}`);
  }

  const total = await User.countDocuments({});
  console.log(`[identity-seed] done. total users=${total}`);
};

run()
  .catch((error) => {
    console.error("[identity-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
