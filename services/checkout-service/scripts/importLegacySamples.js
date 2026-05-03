const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mongoose = require("mongoose");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const BACKEND_DIR = path.join(ROOT_DIR, "Backend");

const PRODUCT_FILES = [
  "sampleProduct_A.js",
  "sampleProduct_C.js",
  "sampleProduct_D.js",
  "sampleProduct_G.js",
  "sampleProduct_I.js",
  "sampleProduct_K.js",
  "sampleProduct_N.js",
  "sampleProduct_T.js",
  "sampleProduct_V.js",
  "sampleProduct_Y.js",
];

const VOUCHER_FILE = "sampleVoucher.js";

const productSchema = new mongoose.Schema(
  {
    tenantId: { type: String, default: "public", index: true },
    imgSrc: { type: String, required: true },
    title: { type: String, required: true, index: true },
    author: { type: String, required: true, index: true },
    translator: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, default: 0, min: 0 },
    discount: { type: Number, min: 0, max: 100, default: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    soldCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    features: [{ type: String }],
    similarBooks: [{ title: { type: String }, imgSrc: { type: String } }],
    sku: { type: String, default: "" },
    ageGroup: { type: String, default: "" },
    supplier: { type: String, default: "" },
    publisher: { type: String, default: "" },
    publicationYear: { type: Number },
    language: { type: String, default: "" },
    weight: { type: String, default: "" },
    dimensions: { type: String, default: "" },
    pages: { type: Number },
    binding: { type: String, default: "" },
    description: { type: String, default: "" },
    type: {
      type: String,
      enum: ["V", "K", "G", "T", "A", "N", "C", "I", "Y", "D"],
      required: true,
      index: true,
    },
    isHidden: { type: Boolean, default: false, index: true },
  },
  { versionKey: false, timestamps: true }
);

const voucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["fixed", "percent"], required: true },
    value: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, required: true, min: 0, default: 0 },
    maxDiscount: { type: Number, default: null, min: 0 },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { versionKey: false, timestamps: true }
);

const toArrayFromVar = (fileContent, varName, extraContext = {}) => {
  const marker = `const ${varName} = [`;
  const start = fileContent.indexOf(marker);
  if (start < 0) {
    throw new Error(`Cannot find variable ${varName}`);
  }

  const openIndex = fileContent.indexOf("[", start);
  let depth = 0;
  let endIndex = -1;
  for (let i = openIndex; i < fileContent.length; i += 1) {
    const ch = fileContent[i];
    if (ch === "[") depth += 1;
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex < 0) {
    throw new Error(`Cannot parse array for ${varName}`);
  }

  const literal = fileContent.slice(openIndex, endIndex + 1);
  return vm.runInNewContext(`(${literal})`, { Date, ...extraContext });
};

const buildVoucherCodeSet = (count = 20) => {
  const out = [];
  const prefix = "BOOKIE";
  for (let i = 0; i < count; i += 1) {
    out.push(`${prefix}${String(i + 1).padStart(6, "0")}`);
  }
  return out;
};

const normalizeProduct = (item = {}) => ({
  tenantId: "public",
  imgSrc: String(item.imgSrc || "").trim(),
  title: String(item.title || "").trim(),
  author: String(item.author || "").trim(),
  translator: String(item.translator || "").trim(),
  price: Number(item.price || 0),
  originalPrice: Number(item.originalPrice || 0),
  discount: Number(item.discount || 0),
  rating: Number(item.rating || 0),
  reviewsCount: Number(item.reviewsCount || 0),
  soldCount: Number(item.soldCount || 0),
  stock: Number(item.stock || 10),
  features: Array.isArray(item.features) ? item.features : [],
  similarBooks: Array.isArray(item.similarBooks) ? item.similarBooks : [],
  sku: String(item.sku || "").trim(),
  ageGroup: String(item.ageGroup || "").trim(),
  supplier: String(item.supplier || "").trim(),
  publisher: String(item.publisher || "").trim(),
  publicationYear: Number(item.publicationYear || 0) || undefined,
  language: "none",
  weight: String(item.weight || "").trim(),
  dimensions: String(item.dimensions || "").trim(),
  pages: Number(item.pages || 0) || undefined,
  binding: String(item.binding || "").trim(),
  description: String(item.description || "").trim(),
  type: String(item.type || "").trim().toUpperCase(),
  isHidden: false,
});

const normalizeVoucher = (item = {}) => {
  const rawType = Number(item.voucherType);
  const type = rawType === 2 ? "percent" : "fixed";
  const parsedExpire = item.voucherExpiration ? new Date(item.voucherExpiration) : new Date();
  const expiresAt =
    Number.isNaN(parsedExpire.getTime()) || parsedExpire.getTime() < Date.now()
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : parsedExpire;

  return {
    code: String(item.voucherCode || "").trim().toUpperCase(),
    type,
    value: Number(item.voucherValue || 0),
    minOrderValue: Number(item.minOrderValue || 0),
    maxDiscount:
      item.maxDiscountValue === undefined || item.maxDiscountValue === null
        ? null
        : Number(item.maxDiscountValue || 0),
    usageLimit: null,
    usedCount: Number(item.usedCount || 0),
    expiresAt,
    status: "active",
  };
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27018";
  const catalogConn = await mongoose.createConnection(mongoUri, {
    dbName: process.env.CATALOG_DB_NAME || "book_catalog",
  }).asPromise();
  const checkoutConn = await mongoose.createConnection(mongoUri, {
    dbName: process.env.CHECKOUT_DB_NAME || "book_checkout",
  }).asPromise();

  const CatalogProduct = catalogConn.model("catalog_products", productSchema, "catalog_products");
  const CheckoutVoucher = checkoutConn.model("checkout_vouchers", voucherSchema, "checkout_vouchers");

  let productCount = 0;
  for (const file of PRODUCT_FILES) {
    const fullPath = path.join(BACKEND_DIR, file);
    const content = fs.readFileSync(fullPath, "utf8");
    const books = toArrayFromVar(content, "sampleBooks").map(normalizeProduct);
    for (const book of books) {
      if (!book.title || !book.author || !book.imgSrc || !book.type) {
        continue;
      }
      await CatalogProduct.updateOne(
        { tenantId: "public", title: book.title, author: book.author, type: book.type },
        { $set: book },
        { upsert: true }
      );
      productCount += 1;
    }
    console.log(`[import] ${file}: ${books.length} products processed`);
  }

  const voucherContent = fs.readFileSync(path.join(BACKEND_DIR, VOUCHER_FILE), "utf8");
  const vouchers = toArrayFromVar(voucherContent, "sampleVouchers", {
    voucherCodeSet: buildVoucherCodeSet(30),
  }).map(normalizeVoucher);
  let voucherCount = 0;
  for (const voucher of vouchers) {
    if (!voucher.code || !voucher.type) {
      continue;
    }
    await CheckoutVoucher.updateOne({ code: voucher.code }, { $set: voucher }, { upsert: true });
    voucherCount += 1;
  }

  console.log(`[import] vouchers: ${voucherCount} processed`);
  console.log(`[import] products total processed: ${productCount}`);

  await catalogConn.close();
  await checkoutConn.close();
};

run()
  .then(() => {
    console.log("[import] done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("[import] failed", error);
    process.exit(1);
  });
