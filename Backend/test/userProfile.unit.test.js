const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Phải set trước khi require controller (verityService đọc tại load time)
process.env.SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

const userController = require('../controllers/userController');
const User = require('../models/User');
const Product = require('../models/Product');

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(express.json());
app.use('/user', userController);

const generateToken = (userId) => jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });

const baseUser = {
  email: 'profile@example.com',
  name: 'Nguyễn Văn Test',
  password: 'matkhau123',
  role: 'user',
};

const baseProduct = {
  imgSrc: 'test.jpg',
  title: 'Sách Test',
  author: 'Tác Giả Test',
  price: 100000,
  type: 'V',
};

describe('User Profile Unit Tests', () => {
  let mongoServer;
  let testUser;
  let testProduct;
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
    await User.deleteMany({});
    await Product.deleteMany({});
    testUser = await User.create(baseUser);
    testProduct = await Product.create(baseProduct);
    authToken = generateToken(testUser._id);
  });

  // =====================================================
  // POST /user/update-name — Cập nhật tên
  // (Không có auth middleware — BUG-08)
  // =====================================================
  describe('POST /user/update-name - Cập nhật tên', () => {
    it('UP-01: cập nhật tên thành công → HTTP 200, { status:"success" }, name đã đổi', async () => {
      const res = await request(app)
        .post('/user/update-name')
        .send({ email: baseUser.email, name: 'Tên Mới Đã Cập Nhật' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.user.name).toBe('Tên Mới Đã Cập Nhật');
    });

    it('UP-02: email không tồn tại → HTTP 200, { status:"fail" } [endpoint trả 200 dù fail — xem BUG-08]', async () => {
      const res = await request(app)
        .post('/user/update-name')
        .send({ email: 'khongtontai@example.com', name: 'Tên Mới' })
        .expect(200);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
    });
  });

  // =====================================================
  // POST /user/update-phone — Cập nhật số điện thoại
  // =====================================================
  describe('POST /user/update-phone - Cập nhật số điện thoại', () => {
    it('UP-03: cập nhật phone thành công → HTTP 200, { status:"success" }, sdt đã đổi', async () => {
      const res = await request(app)
        .post('/user/update-phone')
        .send({ email: baseUser.email, phone: '0901234567' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.user.sdt).toBe('0901234567');
    });

    it('UP-04: email không tồn tại → HTTP 200, { status:"fail" }', async () => {
      const res = await request(app)
        .post('/user/update-phone')
        .send({ email: 'khongtontai@example.com', phone: '0901234567' })
        .expect(200);

      expect(res.body.status).toBe('fail');
    });
  });

  // =====================================================
  // POST /user/update-password — Cập nhật mật khẩu
  // =====================================================
  describe('POST /user/update-password - Cập nhật mật khẩu', () => {
    it('UP-05: cập nhật password thành công → HTTP 200, { status:"success" }, password đã đổi', async () => {
      const res = await request(app)
        .post('/user/update-password')
        .send({ email: baseUser.email, password: 'matkhaumoi456' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.user.password).toBe('matkhaumoi456');
    });

    it('UP-06: email không tồn tại → HTTP 200, { status:"fail" }', async () => {
      const res = await request(app)
        .post('/user/update-password')
        .send({ email: 'khongtontai@example.com', password: 'pass' })
        .expect(200);

      expect(res.body.status).toBe('fail');
    });
  });

  // =====================================================
  // GET /user/favorite — Lấy danh sách yêu thích
  // =====================================================
  describe('GET /user/favorite - Lấy danh sách yêu thích', () => {
    it('UP-07: user có sản phẩm → 200, favorite là array có phần tử (product populated)', async () => {
      testUser.favorite = [{ product: testProduct._id }];
      await testUser.save();

      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.favorite)).toBe(true);
      expect(res.body.favorite.length).toBe(1);
      expect(res.body.favorite[0].product._id.toString()).toBe(testProduct._id.toString());
    });

    it('UP-08: user chưa có sản phẩm yêu thích → 200, favorite là []', async () => {
      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(res.body.favorite)).toBe(true);
      expect(res.body.favorite.length).toBe(0);
    });

    it('UP-09: product đã bị xóa khỏi DB → GET dọn null và trả về danh sách sạch, cập nhật DB', async () => {
      testUser.favorite = [{ product: testProduct._id }];
      await testUser.save();

      // Xóa product — sau đó populate sẽ trả null cho entry này
      await Product.deleteOne({ _id: testProduct._id });

      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(res.body.favorite.length).toBe(0);

      // Cleanup đã được lưu vào DB
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.favorite.length).toBe(0);
    });

    it('UP-10: valid token nhưng userId không tồn tại trong DB → 404', async () => {
      const ghostToken = generateToken(new mongoose.Types.ObjectId());

      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${ghostToken}`)
        .expect(404);

      expect(res.body.message).toBe('Người dùng không tồn tại.');
    });

    it('UP-11: không có Authorization header → 401', async () => {
      const res = await request(app).get('/user/favorite').expect(401);
      expect(res.body.status).toBe('error');
    });

    it('UP-12: token không hợp lệ → 401', async () => {
      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', 'Bearer invalid.token.xyz')
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('UP-13: DB lỗi khi populate → 500', async () => {
      jest.spyOn(User, 'findById').mockReturnValueOnce({
        populate: jest.fn().mockRejectedValueOnce(new Error('DB error')),
      });

      const res = await request(app)
        .get('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(res.body.message).toBe('Lỗi khi lấy danh sách yêu thích.');
    });
  });

  // =====================================================
  // POST /user/favorite — Toggle yêu thích (add/remove)
  // =====================================================
  describe('POST /user/favorite - Toggle yêu thích', () => {
    it('UP-14: thêm product mới vào favorites → 200, favorites.length = 1', async () => {
      const res = await request(app)
        .post('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(200);

      expect(res.body.favorite.length).toBe(1);
      expect(res.body.favorite[0].product.toString()).toBe(testProduct._id.toString());
    });

    it('UP-15: gọi lại cùng productId → toggle xóa → 200, favorites.length = 0', async () => {
      // Thêm lần 1
      await request(app)
        .post('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() });

      // Gọi lại cùng productId — toggle xóa
      const res = await request(app)
        .post('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(200);

      expect(res.body.favorite.length).toBe(0);
    });

    it('UP-16: userId không tồn tại trong DB → 404', async () => {
      const ghostToken = generateToken(new mongoose.Types.ObjectId());

      const res = await request(app)
        .post('/user/favorite')
        .set('Authorization', `Bearer ${ghostToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(404);

      expect(res.body.message).toBe('Người dùng không tồn tại.');
    });

    it('UP-17: không có Authorization header → 401', async () => {
      const res = await request(app)
        .post('/user/favorite')
        .send({ productId: testProduct._id.toString() })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('UP-18: DB lỗi → 500', async () => {
      jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(500);

      expect(res.body.message).toBe('Lỗi khi thêm sản phẩm vào danh sách yêu thích.');
    });
  });

  // =====================================================
  // DELETE /user/favorite — Xóa khỏi danh sách yêu thích
  // =====================================================
  describe('DELETE /user/favorite - Xóa khỏi danh sách yêu thích', () => {
    beforeEach(async () => {
      testUser.favorite = [{ product: testProduct._id }];
      await testUser.save();
    });

    it('UP-19: xóa product có trong danh sách → 200, product không còn trong favorites', async () => {
      const res = await request(app)
        .delete('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(200);

      expect(res.body.favorite.length).toBe(0);
    });

    it('UP-20: xóa productId KHÔNG có trong danh sách → 200, favorites giữ nguyên', async () => {
      const otherId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: otherId.toString() })
        .expect(200);

      // Product gốc vẫn còn trong favorites
      expect(res.body.favorite.length).toBe(1);
    });

    it('UP-21: userId không tồn tại trong DB → 404', async () => {
      const ghostToken = generateToken(new mongoose.Types.ObjectId());

      const res = await request(app)
        .delete('/user/favorite')
        .set('Authorization', `Bearer ${ghostToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(404);

      expect(res.body.message).toBe('Người dùng không tồn tại.');
    });

    it('UP-22: không có Authorization header → 401', async () => {
      const res = await request(app)
        .delete('/user/favorite')
        .send({ productId: testProduct._id.toString() })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('UP-23: DB lỗi → 500', async () => {
      jest.spyOn(User, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .delete('/user/favorite')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: testProduct._id.toString() })
        .expect(500);

      expect(res.body.message).toBe('Lỗi khi xóa sản phẩm khỏi danh sách yêu thích.');
    });
  });
});
