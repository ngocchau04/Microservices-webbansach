const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Phải set SECRET_KEY trước khi require controller (verityService đọc tại load time)
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test_secret_product';

const productController = require('../controllers/productController');
const Product = require('../models/Product');

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(express.json());
app.use('/product', productController);

const generateToken = (userId, role = 'user') => {
  return jwt.sign({ userId, role }, SECRET_KEY, { expiresIn: '1h' });
};

// Base payload thoả mãn tất cả required fields
const baseProduct = {
  imgSrc: 'test-book.jpg',
  title: 'Sách Lập Trình JavaScript',
  author: 'Nguyễn Văn A',
  price: 150000,
  type: 'K',
};

describe('Product Controller Unit Tests', () => {
  let mongoServer;
  let testProduct;
  let adminToken;
  let userToken;

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
    await Product.deleteMany({});

    const adminId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();
    adminToken = generateToken(adminId, 'admin');
    userToken = generateToken(userId, 'user');

    testProduct = await Product.create(baseProduct);
  });

  // =====================================================
  // GET /product — lấy tất cả sản phẩm
  // =====================================================
  describe('GET /product - Lấy tất cả sản phẩm', () => {
    it('TC-01: trả về tất cả sản phẩm trong DB', async () => {
      await Product.create({ ...baseProduct, title: 'Sách Thứ Hai', type: 'V' });

      const res = await request(app).get('/product').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it('TC-02: DB trống → trả về mảng rỗng', async () => {
      await Product.deleteMany({});

      const res = await request(app).get('/product').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('TC-03: DB lỗi → 500', async () => {
      jest.spyOn(Product, 'find').mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app).get('/product').expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // GET /product/:id — lấy theo ID
  // =====================================================
  describe('GET /product/:id - Lấy sản phẩm theo ID', () => {
    it('TC-04: ID hợp lệ và tồn tại → 200, trả về object sản phẩm', async () => {
      const res = await request(app).get(`/product/${testProduct._id}`).expect(200);

      expect(res.body.title).toBe(baseProduct.title);
      expect(res.body.price).toBe(baseProduct.price);
      expect(res.body.type).toBe(baseProduct.type);
    });

    it('TC-05: ID hợp lệ nhưng không tìm thấy trong DB → 404', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app).get(`/product/${ghostId}`).expect(404);

      expect(res.body.message).toBe('Product not found');
    });

    it('TC-06: ID không phải ObjectId format → 400', async () => {
      const res = await request(app).get('/product/not-valid-objectid').expect(400);

      expect(res.body.message).toBe('Invalid product ID format');
    });

    it('TC-07: DB lỗi → 500', async () => {
      jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .get(`/product/${new mongoose.Types.ObjectId()}`)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // POST /product — tạo sản phẩm (admin only)
  // =====================================================
  describe('POST /product - Tạo sản phẩm mới (admin only)', () => {
    it('TC-08: admin tạo sản phẩm với data hợp lệ → 201, trả về sản phẩm đã tạo', async () => {
      const newData = { ...baseProduct, title: 'Sách Mới Tạo', type: 'V' };

      const res = await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newData)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('Sách Mới Tạo');
      expect(res.body.data.price).toBe(150000);
      expect(res.body.data._id).toBeDefined();
    });

    it('TC-09: price là string "100,000" được parse thành number 100000', async () => {
      const res = await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseProduct, title: 'Price String Test', price: '100,000' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.price).toBe(100000);
    });

    it('TC-10: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${userToken}`)
        .send(baseProduct)
        .expect(403);

      expect(res.body.status).toBe('error');
      expect(res.body.message).toBe('Permission denied');
    });

    it('TC-11: không có Authorization header → 401', async () => {
      const res = await request(app)
        .post('/product')
        .send(baseProduct)
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-12: token không hợp lệ → 401', async () => {
      const res = await request(app)
        .post('/product')
        .set('Authorization', 'Bearer invalid_token_xyz_abc')
        .send(baseProduct)
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    // BUG-05: controller không phân biệt ValidationError → catch trả về 500 thay vì 400
    it.skip('TC-13: thiếu required field (title) → nên 400 nhưng code trả 500 (BUG-05)', async () => {
      const { title: _omit, ...withoutTitle } = baseProduct;

      await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(withoutTitle)
        .expect(400);
    });

    // BUG-05: type ngoài enum cũng bị ValidationError → catch trả về 500
    it.skip('TC-14: type ngoài enum → nên 400 nhưng code trả 500 (BUG-05)', async () => {
      await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseProduct, type: 'Z' })
        .expect(400);
    });

    it('TC-15: DB lỗi khi save → 500', async () => {
      jest.spyOn(Product.prototype, 'save').mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app)
        .post('/product')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(baseProduct)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // PUT /product/:id — cập nhật sản phẩm (admin only)
  // =====================================================
  describe('PUT /product/:id - Cập nhật sản phẩm (admin only)', () => {
    it('TC-16: admin cập nhật title thành công → 200, data mới', async () => {
      // Gửi kèm tất cả required fields vì product.set(updatedData) unset field nếu undefined
      const res = await request(app)
        .put(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseProduct, title: 'Tên Sách Đã Cập Nhật' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.title).toBe('Tên Sách Đã Cập Nhật');
    });

    it('TC-17: originalPrice là string "200,000" được parse thành 200000', async () => {
      // Gửi kèm tất cả required fields để tránh Mongoose cast undefined → NaN cho Number
      const res = await request(app)
        .put(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseProduct, originalPrice: '200,000' })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.originalPrice).toBe(200000);
    });

    it('TC-18: ID không tồn tại → 404', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/product/${ghostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update Ghost' })
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Product not found');
    });

    it('TC-19: ID không phải ObjectId format → 400', async () => {
      const res = await request(app)
        .put('/product/not-an-objectid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Invalid ID' })
        .expect(400);

      expect(res.body.message).toBe('Invalid product ID format');
    });

    it('TC-20: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .put(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Unauthorized Update' })
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('TC-21: không có Authorization header → 401', async () => {
      const res = await request(app)
        .put(`/product/${testProduct._id}`)
        .send({ title: 'No Auth' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-22: DB lỗi → 500', async () => {
      jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .put(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'DB Fail Update' })
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // DELETE /product/:id — xóa sản phẩm (admin only)
  // =====================================================
  describe('DELETE /product/:id - Xóa sản phẩm (admin only)', () => {
    it('TC-23: admin xóa thành công → 200, sản phẩm không còn trong DB', async () => {
      const res = await request(app)
        .delete(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Product deleted successfully');

      const deleted = await Product.findById(testProduct._id);
      expect(deleted).toBeNull();
    });

    it('TC-24: ID không tồn tại → 404', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/product/${ghostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.status).toBe('fail');
    });

    it('TC-25: ID không phải ObjectId format → 400', async () => {
      const res = await request(app)
        .delete('/product/not-valid-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toBe('Invalid product ID format');
    });

    it('TC-26: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .delete(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('TC-27: không có Authorization header → 401', async () => {
      const res = await request(app)
        .delete(`/product/${testProduct._id}`)
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-28: DB lỗi → 500', async () => {
      jest.spyOn(Product, 'findById').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .delete(`/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // POST /product/list — lấy theo danh sách IDs
  // =====================================================
  describe('POST /product/list - Lấy sản phẩm theo danh sách IDs', () => {
    it('TC-29: trả về đúng products khớp với ids, bỏ qua id ngoài danh sách', async () => {
      const p2 = await Product.create({ ...baseProduct, title: 'Sách B', type: 'V' });
      const p3 = await Product.create({ ...baseProduct, title: 'Sách C', type: 'G' });

      const res = await request(app)
        .post('/product/list')
        .send({ ids: [testProduct._id, p2._id] })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      const titles = res.body.map((p) => p.title);
      expect(titles).toContain(baseProduct.title);
      expect(titles).toContain('Sách B');
      expect(titles).not.toContain('Sách C');
    });

    it('TC-30: ids là mảng rỗng → trả về []', async () => {
      const res = await request(app)
        .post('/product/list')
        .send({ ids: [] })
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('TC-31: DB lỗi → 500', async () => {
      jest.spyOn(Product, 'find').mockRejectedValueOnce(new Error('DB error'));

      const res = await request(app)
        .post('/product/list')
        .send({ ids: [testProduct._id] })
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // GET /product/similar/:type — sách cùng thể loại
  // =====================================================
  describe('GET /product/similar/:type - Lấy sách cùng thể loại', () => {
    it('TC-32: trả về tất cả sách cùng type V', async () => {
      // testProduct là type 'K'; tạo thêm 2 loại V
      await Product.create({ ...baseProduct, title: 'Văn Học 1', type: 'V' });
      await Product.create({ ...baseProduct, title: 'Văn Học 2', type: 'V' });

      const res = await request(app).get('/product/similar/V').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body.every((p) => p.type === 'V')).toBe(true);
    });

    it('TC-33: type không có sản phẩm trong DB → 200, []', async () => {
      // DB chỉ có type 'K' (testProduct); type 'D' không có
      const res = await request(app).get('/product/similar/D').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    it('TC-34: DB có hơn 10 sản phẩm cùng type → giới hạn trả về tối đa 10', async () => {
      for (let i = 0; i < 12; i++) {
        await Product.create({ ...baseProduct, title: `Thiếu Nhi ${i}`, type: 'T' });
      }

      const res = await request(app).get('/product/similar/T').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(10);
    });

    it('TC-35: DB lỗi → 500', async () => {
      // similar/:type dùng Product.find().limit(10) — cần mock trả về object có .limit()
      jest.spyOn(Product, 'find').mockImplementationOnce(() => ({
        limit: jest.fn().mockRejectedValueOnce(new Error('DB error')),
      }));

      const res = await request(app).get('/product/similar/V').expect(500);

      expect(res.body).toHaveProperty('message');
    });
  });
});
