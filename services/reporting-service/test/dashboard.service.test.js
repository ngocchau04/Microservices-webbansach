const sampleOrders = [
  {
    _id: "o1",
    createdAt: "2026-01-10T09:00:00.000Z",
    orderStatus: "pending",
    totals: { total: 100000 },
    items: [
      { productId: "p1", title: "Book A", quantity: 2, price: 30000, image: "a.jpg" },
      { productId: "p2", title: "Book B", quantity: 1, price: 40000, image: "b.jpg" },
    ],
  },
  {
    _id: "o2",
    createdAt: "2026-02-12T09:00:00.000Z",
    orderStatus: "Hoan tat",
    totals: { total: 200000 },
    items: [{ productId: "p1", title: "Book A", quantity: 4, price: 50000, image: "a.jpg" }],
  },
];

jest.mock("../src/models/ReportCache", () => ({
  findOne: jest.fn(async () => null),
  deleteOne: jest.fn(async () => null),
  findOneAndUpdate: jest.fn(async () => null),
}));

jest.mock("../src/services/internalServiceClient", () => ({
  fetchAllOrders: jest.fn(async () => sampleOrders),
  fetchUsersCount: jest.fn(async () => 12),
}));

const reportingService = require("../src/services/reportingService");

describe("reportingService aggregations", () => {
  const config = {
    dashboardCacheTtlSeconds: 60,
  };

  test("getDashboardSummary returns summary metrics", async () => {
    const result = await reportingService.getDashboardSummary({ config });

    expect(result.ok).toBe(true);
    expect(result.data.totalOrders).toBe(2);
    expect(result.data.totalUsers).toBe(12);
    expect(result.data.totalRevenue).toBe(300000);
    expect(Array.isArray(result.data.topProducts)).toBe(true);
  });

  test("getDashboardRevenue returns grouped points", async () => {
    const result = await reportingService.getDashboardRevenue({
      period: "month",
      config,
    });

    expect(result.ok).toBe(true);
    expect(result.data.period).toBe("month");
    expect(Array.isArray(result.data.points)).toBe(true);
    expect(result.data.points.length).toBeGreaterThan(0);
    expect(Array.isArray(result.data.legacySeries)).toBe(true);
  });

  test("getDashboardTopProducts and order status return arrays", async () => {
    const topProducts = await reportingService.getDashboardTopProducts({
      config,
      limit: 5,
      sortBy: "quantity",
    });
    const orderStatus = await reportingService.getDashboardOrderStatus({ config });

    expect(topProducts.ok).toBe(true);
    expect(topProducts.data.items[0].soldQuantity).toBeGreaterThan(0);
    expect(orderStatus.ok).toBe(true);
    expect(orderStatus.data.totalOrders).toBe(2);
  });
});
