const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const revenueController = require('../controllers/revenueController');
const Revenue = require('../models/Revenue');

const app = express();
app.use(express.json());
app.use('/revenue', revenueController);

describe('Revenue Controller Unit Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await Revenue.deleteMany({});
  });

  // =====================================================
  // GET /revenue — lấy dữ liệu doanh thu
  // =====================================================
  describe('GET /revenue - Lấy dữ liệu doanh thu', () => {
    it('RE-01: có dữ liệu → 200, array có phần tử, không có field _id (projection {_id: 0})', async () => {
      await Revenue.create({ year: 2024, revenue: [100000, 200000, 150000] });

      const res = await request(app).get('/revenue').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].year).toBe(2024);
      // Projection {_id: 0} loại _id khỏi response
      expect(res.body[0]._id).toBeUndefined();
    });

    it('RE-02: DB trống → 200, array rỗng', async () => {
      const res = await request(app).get('/revenue').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it.skip('RE-03: [BUG-11] GET không có .catch() → DB lỗi gây unhandled rejection → request treo mãi, không trả response (không thể test, sẽ timeout)', async () => {
      // Controller dùng .then() mà không có .catch() → unhandled rejection khi DB lỗi
    });

    it.skip('RE-04: [BUG-12] GET /revenue không yêu cầu xác thực → bất kỳ ai cũng có thể xem dữ liệu doanh thu (security gap)', async () => {
      // Endpoint admin-sensitive nhưng không có checkAdmin middleware
    });
  });
});
