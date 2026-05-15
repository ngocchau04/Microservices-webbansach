const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const feedbackController = require('../controllers/feedbackController');
const Feedback = require('../models/Feedback');

const app = express();
app.use(express.json());
app.use('/feedback', feedbackController);

// ObjectId cố định dùng làm bookId xuyên suốt tất cả tests
const bookId = new mongoose.Types.ObjectId();

describe('Feedback Controller Unit Tests', () => {
  let mongoServer;
  let testFeedback;

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
    await Feedback.deleteMany({});
    testFeedback = await Feedback.create({
      bookId,
      content: 'Feedback mẫu',
      stars: 4,
    });
  });

  // =====================================================
  // POST /feedback/:bookId — tạo feedback mới
  // =====================================================
  describe('POST /feedback/:bookId - Tạo feedback mới', () => {
    it('FB-01: feedback hợp lệ → 201, response có { feedback } với _id', async () => {
      const res = await request(app)
        .post(`/feedback/${bookId}`)
        .send({ content: 'Sách rất hay!', stars: 5 })
        .expect(201);

      expect(res.body.feedback).toBeDefined();
      expect(res.body.feedback._id).toBeDefined();
      expect(res.body.feedback.content).toBe('Sách rất hay!');
      expect(res.body.feedback.stars).toBe(5);
    });

    it('FB-02: không có content → 400, { error: "Invalid input data" }', async () => {
      const res = await request(app)
        .post(`/feedback/${bookId}`)
        .send({ stars: 4 })
        .expect(400);

      expect(res.body.error).toBe('Invalid input data');
    });

    it('FB-03: stars = 0 (nhỏ hơn 1) → 400, { error: "Invalid input data" }', async () => {
      const res = await request(app)
        .post(`/feedback/${bookId}`)
        .send({ content: 'Sách tệ', stars: 0 })
        .expect(400);

      expect(res.body.error).toBe('Invalid input data');
    });

    it('FB-04: stars = 6 (lớn hơn 5) → 400, { error: "Invalid input data" }', async () => {
      const res = await request(app)
        .post(`/feedback/${bookId}`)
        .send({ content: 'Sách hay', stars: 6 })
        .expect(400);

      expect(res.body.error).toBe('Invalid input data');
    });

    it('FB-05: DB lỗi khi save → 500, { error: "Failed to create feedback" }', async () => {
      jest.spyOn(Feedback.prototype, 'save').mockRejectedValueOnce(new Error('DB write error'));

      const res = await request(app)
        .post(`/feedback/${bookId}`)
        .send({ content: 'Sách hay', stars: 4 })
        .expect(500);

      expect(res.body.error).toBe('Failed to create feedback');
    });
  });

  // =====================================================
  // GET /feedback/:bookId — lấy feedback của sách
  // =====================================================
  describe('GET /feedback/:bookId - Lấy feedback của sách', () => {
    it('FB-06: có feedback → 200, array sắp xếp giảm dần theo timestamp', async () => {
      await Feedback.deleteMany({});
      const older = new Date('2024-01-01T10:00:00Z');
      const newer = new Date('2024-06-01T10:00:00Z');
      await Feedback.create({ bookId, content: 'Cũ hơn', stars: 3, timestamp: older });
      await Feedback.create({ bookId, content: 'Mới hơn', stars: 5, timestamp: newer });

      const res = await request(app)
        .get(`/feedback/${bookId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      // Sort giảm dần → mới nhất đầu tiên
      expect(res.body[0].content).toBe('Mới hơn');
      expect(res.body[1].content).toBe('Cũ hơn');
    });

    it('FB-07: không có feedback → 200, array rỗng', async () => {
      await Feedback.deleteMany({});

      const res = await request(app)
        .get(`/feedback/${bookId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('FB-08: DB lỗi khi find → 500, { error: "Failed to fetch feedbacks" }', async () => {
      jest.spyOn(Feedback, 'find').mockReturnValueOnce({
        sort: jest.fn().mockRejectedValueOnce(new Error('DB error')),
      });

      const res = await request(app)
        .get(`/feedback/${bookId}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to fetch feedbacks');
    });
  });

  // =====================================================
  // DELETE /feedback/:feedbackId — xóa feedback
  // =====================================================
  describe('DELETE /feedback/:feedbackId - Xóa feedback', () => {
    it('FB-09: xóa feedback hợp lệ → 200, { message: "Feedback deleted successfully" }, không còn trong DB', async () => {
      const res = await request(app)
        .delete(`/feedback/${testFeedback._id}`)
        .expect(200);

      expect(res.body.message).toBe('Feedback deleted successfully');

      const inDb = await Feedback.findById(testFeedback._id);
      expect(inDb).toBeNull();
    });

    it('FB-10: ID không tồn tại → 404, { error: "Feedback not found" }', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/feedback/${ghostId}`)
        .expect(404);

      expect(res.body.error).toBe('Feedback not found');
    });

    it('FB-11: DB lỗi khi findByIdAndDelete → 500, { error: "Failed to delete feedback" }', async () => {
      jest.spyOn(Feedback, 'findByIdAndDelete').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .delete(`/feedback/${testFeedback._id}`)
        .expect(500);

      expect(res.body.error).toBe('Failed to delete feedback');
    });
  });
});
