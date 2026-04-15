const mongoose = require("mongoose");

const reviews = [];
const products = new Map();

const attachReviewDoc = (item) => ({
  ...item,
  toObject() {
    return { ...this };
  },
  async deleteOne() {
    const idx = reviews.findIndex((r) => String(r._id) === String(this._id));
    if (idx >= 0) reviews.splice(idx, 1);
  },
});

const mockProductModel = {
  findById: jest.fn(async (id) => products.get(String(id)) || null),
  findByIdAndUpdate: jest.fn(async () => null),
};

const mockReviewModel = {
  find: jest.fn((query = {}) => ({
    sort: async () =>
      reviews
        .filter((item) => String(item.productId) === String(query.productId))
        .map((item) => attachReviewDoc(item)),
  })),
  findOne: jest.fn(async (query = {}) => {
    const found = reviews.find(
      (item) =>
        String(item.productId) === String(query.productId) &&
        String(item.userId) === String(query.userId) &&
        String(item.orderId) === String(query.orderId)
    );
    return found ? attachReviewDoc(found) : null;
  }),
  create: jest.fn(async (payload = {}) => {
    const created = {
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date().toISOString(),
      ...payload,
    };
    reviews.push(created);
    return attachReviewDoc(created);
  }),
};

const mockCheckoutClient = {
  checkReviewEligibility: jest.fn(),
  completeOrderAfterReview: jest.fn(),
};

jest.mock("../src/models/Product", () => mockProductModel);
jest.mock("../src/models/Review", () => mockReviewModel);
jest.mock("../src/services/checkoutClient", () => mockCheckoutClient);

const reviewService = require("../src/services/reviewService");

describe("reviewService purchase-gated review flow", () => {
  const productId = new mongoose.Types.ObjectId().toString();
  const actor = { userId: "user_1", email: "user@example.com", role: "user" };
  const config = { checkoutServiceUrl: "http://mock-checkout", checkoutRequestTimeoutMs: 1000 };

  beforeEach(() => {
    reviews.length = 0;
    products.clear();
    products.set(productId, { _id: productId });
    jest.clearAllMocks();
  });

  test("non-buyers cannot create review", async () => {
    mockCheckoutClient.checkReviewEligibility.mockResolvedValueOnce({
      data: {
        eligible: false,
        reasonCode: "NOT_PURCHASED",
        message: "Bạn chỉ có thể đánh giá sản phẩm đã mua.",
      },
    });

    const result = await reviewService.createReview({
      productId,
      payload: { content: "test", stars: 5 },
      actor,
      authHeader: "Bearer token",
      config,
    });

    expect(result.ok).toBe(false);
    expect(result.code).toBe("NOT_PURCHASED");
  });

  test("eligible buyer can review and review appears in product review list", async () => {
    mockCheckoutClient.checkReviewEligibility.mockResolvedValueOnce({
      data: {
        eligible: true,
        orderId: "order_123",
        message: "Đủ điều kiện đánh giá.",
      },
    });
    mockCheckoutClient.completeOrderAfterReview.mockResolvedValueOnce({
      data: { item: { _id: "order_123", orderStatus: "completed" } },
    });

    const createResult = await reviewService.createReview({
      productId,
      payload: { content: "Sách rất hay", stars: 5, orderId: "order_123" },
      actor,
      authHeader: "Bearer token",
      config,
    });

    expect(createResult.ok).toBe(true);
    expect(createResult.data.item.content).toBe("Sách rất hay");
    expect(mockCheckoutClient.completeOrderAfterReview).toHaveBeenCalled();

    const listResult = await reviewService.listReviewsByProduct({ productId });
    expect(listResult.ok).toBe(true);
    expect(listResult.data.items.length).toBe(1);
    expect(listResult.data.items[0].content).toBe("Sách rất hay");
  });
});
