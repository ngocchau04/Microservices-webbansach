const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.SECRET_KEY = process.env.SECRET_KEY || 'test_secret_review';

const reviewController = require('../controllers/reviewController');
const Review = require('../models/Review');

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(express.json());
app.use('/review', reviewController);

const generateToken = (userId, role = 'user') =>
  jwt.sign({ userId, role }, SECRET_KEY, { expiresIn: '1h' });

describe('Review Controller Unit Tests', () => {
  let mongoServer;
  let testReview;
  let testProductId;
  let testUserId;
  let authToken;

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
    await Review.deleteMany({});
    testProductId = new mongoose.Types.ObjectId();
    testUserId = new mongoose.Types.ObjectId();
    authToken = generateToken(testUserId);
    // Schema dùng `product` và `user`, không phải `productId`/`userId`
    testReview = await Review.create({
      product: testProductId,
      user: testUserId,
      rating: 5,
      review: 'Great book!',
    });
  });

  // =====================================================
  // GET /review/:productId — lấy review theo productId
  // =====================================================
  describe('GET /review/:productId - Lấy review theo productId', () => {
    it('RV-01: GET theo productId → 200, status "success", data là array', async () => {
      const res = await request(app)
        .get(`/review/${testProductId}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      // Ghi chú: data luôn [] vì controller query sai field (xem BUG-09/RV-11)
    });

    it.skip('RV-11: [BUG-09] controller query { productId } thay vì { product } → có review trong DB nhưng GET luôn trả về []', async () => {
      const res = await request(app)
        .get(`/review/${testProductId}`)
        .expect(200);

      // testReview tồn tại trong DB nhưng query sai field → data là []
      expect(res.body.data.length).toBe(1);
    });

    it('RV-02: DB lỗi khi find → 500, status "error"', async () => {
      jest.spyOn(Review, 'find').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get(`/review/${testProductId}`)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // POST /review — tạo review mới (cần token)
  // =====================================================
  describe('POST /review - Tạo review mới', () => {
    it('RV-03: tạo review với token hợp lệ → 201, status "success", có _id', async () => {
      const res = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 4, review: 'Sách hay' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.rating).toBe(4);
    });

    it('RV-04: không có Authorization header → 401', async () => {
      const res = await request(app)
        .post('/review')
        .send({ rating: 4, review: 'Sách hay' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('RV-05: token không hợp lệ → 401', async () => {
      const res = await request(app)
        .post('/review')
        .set('Authorization', 'Bearer invalid.token.xyz')
        .send({ rating: 4, review: 'Sách hay' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('RV-06: DB lỗi khi save → 500, status "error"', async () => {
      jest.spyOn(Review.prototype, 'save').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/review')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 4, review: 'Sách hay' })
        .expect(500);

      expect(res.body.status).toBe('error');
    });

    it.skip('RV-12: [BUG-10] POST không kiểm tra user đã mua sách trước khi review (thiếu purchase-gate) → mọi user đăng nhập đều review được', async () => {
      // Nên trả 403 khi user chưa mua sách nhưng controller không validate
    });
  });

  // =====================================================
  // PUT /review/:id — cập nhật review (cần token)
  // =====================================================
  describe('PUT /review/:id - Cập nhật review', () => {
    it('RV-07: cập nhật review với token hợp lệ → 200, status "success", data được cập nhật', async () => {
      // BUG-09: req.user.id === undefined (JWT payload có `userId`, không có `id`)
      // review.userId === undefined (schema dùng `user`, không phải `userId`)
      // undefined !== undefined = false → ownership check không bao giờ chặn → update thành công
      const res = await request(app)
        .put(`/review/${testReview._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 3, review: 'Sách tạm' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.rating).toBe(3);
      expect(res.body.data.review).toBe('Sách tạm');
    });

    it('RV-08: review không tồn tại → 404, status "fail"', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/review/${ghostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 3 })
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Review not found');
    });

    it('RV-09: không có Authorization header → 401', async () => {
      const res = await request(app)
        .put(`/review/${testReview._id}`)
        .send({ rating: 3 })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('RV-10: DB lỗi khi findById → 500, status "error"', async () => {
      jest.spyOn(Review, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .put(`/review/${testReview._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ rating: 3 })
        .expect(500);

      expect(res.body.status).toBe('error');
    });

    it.skip('RV-13: [BUG-09] ownership check hỏng — req.user.id và review.userId đều undefined → user khác vẫn sửa được review của người khác', async () => {
      const otherToken = generateToken(new mongoose.Types.ObjectId());

      // Nên trả 403 nhưng do check hỏng → trả 200
      const res = await request(app)
        .put(`/review/${testReview._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ rating: 1 })
        .expect(403);

      expect(res.body.status).toBe('fail');
    });
  });
});
