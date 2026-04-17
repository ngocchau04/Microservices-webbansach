require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");
const { removeDebugProducts } = require("./debugProductCleanup");

const seedProducts = [
  {
    title: "Node.js in Practice",
    author: "Alex Young",
    price: 180000,
    discount: 10,
    soldCount: 25,
    rating: 4.5,
    reviewsCount: 12,
    type: "K",
    imgSrc: "https://images.unsplash.com/photo-1544717305-2782549b5136",
    description: "Practical Node.js patterns for production services.",
    publisher: "Bookstore Press",
    language: "none",
    stock: 14,
  },
  {
    title: "React Architecture Handbook",
    author: "Sarah Drasner",
    price: 210000,
    discount: 15,
    soldCount: 41,
    rating: 4.7,
    reviewsCount: 20,
    type: "G",
    imgSrc: "https://images.unsplash.com/photo-1512820790803-83ca734da794",
    description: "Modern React architecture and scalable UI patterns.",
    publisher: "Frontend Books",
    language: "none",
    stock: 9,
  },
  {
    title: "Designing Data-Intensive Systems",
    author: "Martin Kleppmann",
    price: 320000,
    discount: 5,
    soldCount: 58,
    rating: 4.9,
    reviewsCount: 33,
    type: "T",
    imgSrc: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
    description: "Distributed systems and data engineering foundations.",
    publisher: "Tech Core",
    language: "none",
    stock: 4,
  },
  {
    title: "Clean Code in JavaScript",
    author: "Robert C. Martin",
    price: 195000,
    discount: 12,
    soldCount: 36,
    rating: 4.6,
    reviewsCount: 18,
    type: "A",
    imgSrc: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
    description: "Code quality habits tailored for JavaScript projects.",
    publisher: "Dev Mind",
    language: "none",
    stock: 2,
  },
  {
    title: "MongoDB Applied Patterns",
    author: "Kristina Chodorow",
    price: 175000,
    discount: 8,
    soldCount: 22,
    rating: 4.4,
    reviewsCount: 10,
    type: "C",
    imgSrc: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
    description: "Schema and query patterns for scalable MongoDB apps.",
    publisher: "Data Craft",
    language: "none",
    stock: 0,
  },
];

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  for (const item of seedProducts) {
    await Product.updateOne(
      { title: item.title, author: item.author },
      {
        $set: item,
        $setOnInsert: {
          originalPrice: item.price,
          translator: "",
          sku: "",
          ageGroup: "",
          supplier: "",
          publicationYear: 2025,
          weight: "",
          dimensions: "",
          pages: 250,
          binding: "paperback",
          features: [],
          similarBooks: [],
        },
      },
      { upsert: true }
    );
    console.log(`[catalog-seed] upserted ${item.title}`);
  }

  const removedDebug = await removeDebugProducts(Product);
  if (removedDebug > 0) {
    console.log(`[catalog-seed] removed ${removedDebug} debug/test product(s) not in the official dataset`);
  }

  const total = await Product.countDocuments({});
  console.log(`[catalog-seed] done. total products=${total}`);
};

run()
  .catch((error) => {
    console.error("[catalog-seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
