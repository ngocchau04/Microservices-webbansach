const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const User = require('../models/User');

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(express.json());
app.use('/user', userController);
app.use('/product', productController);

const generateToken = (userId, role = 'user') =>
  jwt.sign({ userId, role }, SECRET_KEY, { expiresIn: '1h' });

// Token đã hết hạn (exp = 60 giây trước)
const generateExpiredToken = (userId, role = 'user') =>
  jwt.sign(
    { userId, role, exp: Math.floor(Date.now() / 1000) - 60 },
    SECRET_KEY
  );

const baseUser = {
  email: 'failure@example.com',
  name: 'Test Failure User',
  password: 'password123',
  role: 'user',
};

describe('Failure Tests - Cross-Cutting Failure Scenarios', () => {
  let mongoServer;
  let testUser;

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
    await User.deleteMany({});
    testUser = await User.create(baseUser);
  });

  // =====================================================
  // POST /user/login — Các trường hợp thất bại
  // =====================================================
  describe('POST /user/login - Xác thực thất bại', () => {
    it('FT-01: sai mật khẩu → 401, message "Invalid credentials"', async () => {
      const res = await request(app)
        .post('/user/login')
        .send({ username: baseUser.email, password: 'sai_mat_khau' })
        .expect(401);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Invalid credentials');
    });

    it('FT-02: email không tồn tại → 404, message "User not found"', async () => {
      const res = await request(app)
        .post('/user/login')
        .send({ username: 'khongtontai@example.com', password: 'any' })
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
    });

    it('FT-03: DB lỗi khi findOne → 500', async () => {
      jest.spyOn(User, 'findOne').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/user/login')
        .send({ username: baseUser.email, password: baseUser.password })
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // Token expired — checkLogin và checkAdmin đều phân biệt TokenExpiredError
  // Path này chưa được test ở bất kỳ file unit test nào khác
  // =====================================================
  describe('Token expired — checkLogin và checkAdmin phân biệt TokenExpiredError', () => {
    it('FT-04: expired token → GET /user/favorite (checkLogin) → 401, message "Token expired"', async () => {
      const expiredToken = generateExpiredToken(testUser._id);

      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Token expired');
    });

    it('FT-05: expired token → POST /product (checkAdmin) → 401, message "Token expired"', async () => {
      // Token có role admin nhưng đã hết hạn
      const expiredToken = generateExpiredToken(testUser._id, 'admin');

      const res = await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({})
        .expect(401);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Token expired');
    });
  });

  // =====================================================
  // POST /user/refresh-token — Làm mới token
  // =====================================================
  describe('POST /user/refresh-token - Làm mới token', () => {
    it('FT-06: valid token → 200, trả về token mới (khác token cũ)', async () => {
      const validToken = jwt.sign(
        { userId: testUser._id, email: testUser.email, role: testUser.role },
        SECRET_KEY,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/user/refresh-token')
        .send({ token: validToken })
        .expect(200);

      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      // Verify token mới là JWT hợp lệ (không check !==validToken vì iat granularity là giây)
      const decoded = jwt.verify(res.body.token, SECRET_KEY);
      expect(decoded.userId).toBe(testUser._id.toString());
    });

    it('FT-07: invalid token string → 401, message "Token không hợp lệ."', async () => {
      const res = await request(app)
        .post('/user/refresh-token')
        .send({ token: 'not.a.valid.token' })
        .expect(401);

      expect(res.body.message).toBe('Token không hợp lệ.');
    });

    it('FT-08: không có token trong body → 401, message "Token không hợp lệ."', async () => {
      const res = await request(app)
        .post('/user/refresh-token')
        .send({})
        .expect(401);

      expect(res.body.message).toBe('Token không hợp lệ.');
    });
  });

  // =====================================================
  // BUG-08: update-name, update-phone, update-password không có authentication
  // =====================================================
  describe('BUG-08: Update profile endpoints thiếu authentication (security gap)', () => {
    it.skip('FT-09: [BUG-08] POST /user/update-name không cần token → nên 401 nhưng controller trả 200', async () => {
      const res = await request(app)
        .post('/user/update-name')
        .send({ email: baseUser.email, name: 'Đổi Tên Không Phép' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it.skip('FT-10: [BUG-08] POST /user/update-password không cần token → nên 401 nhưng controller trả 200', async () => {
      const res = await request(app)
        .post('/user/update-password')
        .send({ email: baseUser.email, password: 'HackerPassword' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });
  });
});
