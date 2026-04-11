require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Feedback = require("../src/models/Feedback");

const seedSubjects = [
  "[SEED] Cannot update shipping address",
  "[SEED] Payment pending too long",
];

const feedbackSeeds = [
  {
    userId: "seed_user_1",
    userEmail: "user@bookstore.local",
    subject: "[SEED] Cannot update shipping address",
    message: "Please support changing address after checkout.",
    category: "order",
    status: "open",
    priority: "normal",
    orderId: "",
    metadata: {
      source: "web",
      userAgent: "seed-script",
      ipAddress: "127.0.0.1",
    },
    messages: [
      {
        sender: "user",
        content: "Please support changing address after checkout.",
        createdAt: new Date(),
      },
    ],
  },
  {
    userId: "seed_user_2",
    userEmail: "user@bookstore.local",
    subject: "[SEED] Payment pending too long",
    message: "Online payment is pending for more than 1 hour.",
    category: "payment",
    status: "in_progress",
    priority: "high",
    orderId: "seed-order-2",
    metadata: {
      source: "web",
      userAgent: "seed-script",
      ipAddress: "127.0.0.1",
    },
    messages: [
      {
        sender: "user",
        content: "Online payment is pending for more than 1 hour.",
        createdAt: new Date(),
      },
    ],
  },
];

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  await Feedback.deleteMany({ subject: { $in: seedSubjects } });
  await Feedback.insertMany(feedbackSeeds);

  console.log(`[support-seed] inserted ${feedbackSeeds.length} sample feedback items`);
};

run()
  .catch((error) => {
    console.error("[support-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
