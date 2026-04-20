require("dotenv").config();

const mongoose = require("mongoose");
const { getEnvConfig } = require("../src/config/env");
const { connectDatabase } = require("../src/config/database");
const Product = require("../src/models/Product");
const { removeDebugProducts } = require("./debugProductCleanup");

const seedProducts = [
  // K (Kinh tế - Kinh doanh)
  {
    title: "Node.js in Practice",
    author: "Alex Young",
    price: 180000,
    discount: 10,
    soldCount: 125,
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
    title: "Think and Grow Rich",
    author: "Napoleon Hill",
    price: 150000,
    discount: 0,
    soldCount: 500,
    rating: 4.8,
    reviewsCount: 120,
    type: "K",
    imgSrc: "https://images.unsplash.com/photo-1592492159418-39f319320569",
    description: "The classic guide to success and wealth building.",
    publisher: "Victory Books",
    language: "none",
    stock: 50,
  },
  {
    title: "The Lean Startup",
    author: "Eric Ries",
    price: 250000,
    discount: 5,
    soldCount: 300,
    rating: 4.7,
    reviewsCount: 85,
    type: "K",
    imgSrc: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
    description: "How constant innovation creates radically successful businesses.",
    publisher: "Crown Business",
    language: "none",
    stock: 20,
  },

  // V (Văn học)
  {
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    price: 89000,
    discount: 10,
    soldCount: 1000,
    rating: 4.9,
    reviewsCount: 450,
    type: "V",
    imgSrc: "https://images.unsplash.com/photo-1544947950-fa07a98d237f",
    description: "Câu chuyện về sự theo đuổi giấc mơ của Santiago.",
    publisher: "NXB Hội Nhà Văn",
    language: "none",
    stock: 100,
  },
  {
    title: "Sherlock Holmes Toàn Tập",
    author: "Arthur Conan Doyle",
    price: 450000,
    discount: 20,
    soldCount: 150,
    rating: 4.8,
    reviewsCount: 60,
    type: "V",
    imgSrc: "https://images.unsplash.com/photo-1587876931567-564ce588bf37",
    description: "Tuyển tập những vụ án ly kỳ của thám tử lừng danh Sherlock Holmes.",
    publisher: "NXB Văn Học",
    language: "none",
    stock: 15,
  },
  {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    price: 120000,
    discount: 0,
    soldCount: 80,
    rating: 4.4,
    reviewsCount: 30,
    type: "V",
    imgSrc: "https://images.unsplash.com/photo-1543003919-a9957004bcc5",
    description: "A portrait of the Jazz Age in all its decadence and excess.",
    publisher: "Scribner",
    language: "none",
    stock: 25,
  },

  // G (Giáo dục - Học thuật)
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
    type: "G",
    imgSrc: "https://images.unsplash.com/photo-1519681393784-d120267933ba",
    description: "Distributed systems and data engineering foundations.",
    publisher: "Tech Core",
    language: "none",
    stock: 4,
  },

  // T (Thiếu nhi)
  {
    title: "Harry Potter and the Sorcerer's Stone",
    author: "J.K. Rowling",
    price: 280000,
    discount: 0,
    soldCount: 2000,
    rating: 5.0,
    reviewsCount: 1500,
    type: "T",
    imgSrc: "https://images.unsplash.com/photo-1544947950-fa07a98d237f", // Reuse related img
    description: "The boy who lived and his first year at Hogwarts.",
    publisher: "Scholastic",
    language: "none",
    stock: 40,
  },
  {
    title: "Dế Mèn Phiêu Lưu Ký",
    author: "Tô Hoài",
    price: 65000,
    discount: 5,
    soldCount: 5000,
    rating: 4.9,
    reviewsCount: 800,
    type: "T",
    imgSrc: "https://images.unsplash.com/photo-1532012197367-2836f9547ea2",
    description: "Cuộc phiêu lưu đầy thú vị và ý nghĩa của chú Dế Mèn.",
    publisher: "NXB Kim Đồng",
    language: "none",
    stock: 200,
  },

  // A (Kỹ năng sống)
  {
    title: "Clean Code in JavaScript",
    author: "Robert C. Martin",
    price: 195000,
    discount: 12,
    soldCount: 36,
    rating: 4.6,
    reviewsCount: 18,
    type: "G", // Fix type to G instead of A? No, the user might want tech books in life skills if they think so, but I'll stick to logic.
    imgSrc: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d",
    description: "Code quality habits tailored for JavaScript projects.",
    publisher: "Dev Mind",
    language: "none",
    stock: 2,
  },
  {
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    price: 110000,
    discount: 15,
    soldCount: 10000,
    rating: 4.9,
    reviewsCount: 2000,
    type: "A",
    imgSrc: "https://images.unsplash.com/photo-1544717297-fa95b3ee9bc6",
    description: "Nghệ thuật giao tiếp và thu phục lòng người.",
    publisher: "First News",
    language: "none",
    stock: 500,
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    price: 220000,
    discount: 10,
    soldCount: 4000,
    rating: 4.9,
    reviewsCount: 900,
    type: "A",
    imgSrc: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73",
    description: "An easy and proven way to build good habits and break bad ones.",
    publisher: "Avery",
    language: "none",
    stock: 60,
  },

  // C (Chính trị - Pháp luật)
  {
    title: "MongoDB Applied Patterns",
    author: "Kristina Chodorow",
    price: 175000,
    discount: 8,
    soldCount: 22,
    rating: 4.4,
    reviewsCount: 10,
    type: "G", // Fix to G
    imgSrc: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570",
    description: "Schema and query patterns for scalable MongoDB apps.",
    publisher: "Data Craft",
    language: "none",
    stock: 1,
  },
  {
    title: "Luật Tâm Thức",
    author: "Ngô Sa Thạch",
    price: 240000,
    discount: 5,
    soldCount: 120,
    rating: 4.6,
    reviewsCount: 40,
    type: "C",
    imgSrc: "https://images.unsplash.com/photo-1505664194779-8beaceb93744",
    description: "Giải mã mê cung cuộc đời thông qua luật tâm thức.",
    publisher: "NXB Dân Trí",
    language: "none",
    stock: 30,
  },

  // N (Nuôi dạy con)
  {
    title: "Vô cùng tàn nhẫn vô cùng yêu thương",
    author: "Sara Imas",
    price: 165000,
    discount: 10,
    soldCount: 800,
    rating: 4.7,
    reviewsCount: 150,
    type: "N",
    imgSrc: "https://images.unsplash.com/photo-1511895426328-dc8714191300",
    description: "Phương pháp dạy con của bà mẹ Do Thái.",
    publisher: "NXB Trẻ",
    language: "none",
    stock: 45,
  },

  // I (Nghệ thuật)
  {
    title: "The Story of Art",
    author: "E.H. Gombrich",
    price: 850000,
    discount: 0,
    soldCount: 45,
    rating: 4.9,
    reviewsCount: 20,
    type: "I",
    imgSrc: "https://images.unsplash.com/photo-1513364776144-60967b0f800f",
    description: "The most famous and popular book on art ever written.",
    publisher: "Phaidon Press",
    language: "none",
    stock: 5,
  },

  // Y (Sức khỏe)
  {
    title: "How Not to Die",
    author: "Michael Greger",
    price: 290000,
    discount: 10,
    soldCount: 500,
    rating: 4.8,
    reviewsCount: 100,
    type: "Y",
    imgSrc: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528",
    description: "Discover the foods scientifically proven to prevent and reverse disease.",
    publisher: "Flatiron Books",
    language: "none",
    stock: 12,
  },

  // D (Du lịch)
  {
    title: "Xách ba lô lên và đi",
    author: "Huyền Chip",
    price: 95000,
    discount: 0,
    soldCount: 3000,
    rating: 4.2,
    reviewsCount: 200,
    type: "D",
    imgSrc: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
    description: "Hành trình khám phá thế giới của một cô gái trẻ người Việt.",
    publisher: "NXB Văn Học",
    language: "none",
    stock: 80,
  },
];

const run = async () => {
  const config = getEnvConfig();
  await connectDatabase({ mongoUri: config.mongoUri, dbName: config.dbName });

  for (const item of seedProducts) {
    await Product.updateOne(
      { title: item.title, author: item.author },
      {
        $set: {
          ...item,
          tenantId: "public", // Explicitly include tenantId in $set
        },
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
