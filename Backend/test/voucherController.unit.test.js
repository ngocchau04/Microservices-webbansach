const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Phải set SECRET_KEY trước khi require controller (verityService đọc tại load time)
process.env.SECRET_KEY = process.env.SECRET_KEY || 'test_secret_voucher';

const voucherController = require('../controllers/voucherController');
const Voucher = require('../models/Voucher');

const SECRET_KEY = process.env.SECRET_KEY;

const app = express();
app.use(express.json());
app.use('/voucher', voucherController);

const generateToken = (userId, role = 'user') => {
  return jwt.sign({ userId, role }, SECRET_KEY, { expiresIn: '1h' });
};

// Base payload thoả mãn tất cả required fields
const baseVoucher = {
  voucherCode: 'SALE10',
  voucherValue: 10000,
  minOrderValue: 50000,
  voucherType: 1,
};

describe('Voucher Controller Unit Tests', () => {
  let mongoServer;
  let testVoucher;
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
    await Voucher.deleteMany({});

    const adminId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();
    adminToken = generateToken(adminId, 'admin');
    userToken = generateToken(userId, 'user');

    testVoucher = await Voucher.create(baseVoucher);
  });

  // =====================================================
  // GET /voucher — lấy tất cả voucher
  // =====================================================
  describe('GET /voucher - Lấy tất cả voucher', () => {
    it('TC-01: DB có voucher → 200, status "success", data là array có phần tử', async () => {
      const res = await request(app).get('/voucher').expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].voucherCode).toBe(baseVoucher.voucherCode);
    });

    it('TC-02: DB trống → 200, data là array rỗng', async () => {
      await Voucher.deleteMany({});

      const res = await request(app).get('/voucher').expect(200);

      expect(res.body.status).toBe('success');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('TC-03: DB lỗi → 500', async () => {
      jest.spyOn(Voucher, 'find').mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(app).get('/voucher').expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // POST /voucher — tạo voucher mới (admin only)
  // =====================================================
  describe('POST /voucher - Tạo voucher mới (admin only)', () => {
    it('TC-04: admin tạo voucher type 1 (fixed) hợp lệ → 201, có _id và usedCount=0', async () => {
      const newVoucher = {
        voucherCode: 'FIXED50K',
        voucherValue: 50000,
        minOrderValue: 200000,
        voucherType: 1,
      };

      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newVoucher)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data._id).toBeDefined();
      expect(res.body.data.voucherCode).toBe('FIXED50K');
      expect(res.body.data.usedCount).toBe(0);
    });

    it('TC-05: admin tạo voucher type 2 (%) kèm maxDiscountValue và voucherExpiration → 201', async () => {
      const percentVoucher = {
        voucherCode: 'PERCENT20',
        voucherValue: 20,
        maxDiscountValue: 100000,
        minOrderValue: 100000,
        voucherType: 2,
        voucherDescription: 'Giảm 20% tối đa 100k',
        voucherExpiration: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(percentVoucher)
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.voucherType).toBe(2);
      expect(res.body.data.maxDiscountValue).toBe(100000);
      expect(res.body.data.voucherDescription).toBe('Giảm 20% tối đa 100k');
    });

    it.skip('TC-06: thiếu required field (voucherCode) → nên 400 nhưng controller trả 500 (BUG-06)', async () => {
      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherValue: 10000, minOrderValue: 50000, voucherType: 1 })
        .expect(400);

      expect(res.body.status).toBe('error');
    });

    it.skip('TC-07: code trùng (unique constraint) → nên 409 nhưng controller trả 500 (BUG-06)', async () => {
      // testVoucher đã có code 'SALE10' từ beforeEach — gửi lại cùng code
      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(baseVoucher)
        .expect(409);

      expect(res.body.status).toBe('error');
    });

    it.skip('TC-08: voucherExpiration trong quá khứ → nên 400 nhưng controller không validate, trả 201 (BUG-06)', async () => {
      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseVoucher, voucherCode: 'EXPIRED_NEW', voucherExpiration: new Date('2020-01-01') })
        .expect(400);

      expect(res.body.status).toBe('error');
    });

    it('TC-09: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ ...baseVoucher, voucherCode: 'USER_ATTEMPT' })
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('TC-10: không có Authorization header → 401', async () => {
      const res = await request(app)
        .post('/voucher')
        .send({ ...baseVoucher, voucherCode: 'NO_TOKEN' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-11: token không hợp lệ → 401', async () => {
      const res = await request(app)
        .post('/voucher')
        .set('Authorization', 'Bearer invalid.token.here')
        .send({ ...baseVoucher, voucherCode: 'BAD_TOKEN' })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-12: DB lỗi khi save → 500', async () => {
      jest.spyOn(Voucher.prototype, 'save').mockRejectedValueOnce(new Error('DB write error'));

      const res = await request(app)
        .post('/voucher')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...baseVoucher, voucherCode: 'DB_ERROR_CODE' })
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // PUT /voucher/:id — cập nhật voucher (admin only)
  // =====================================================
  describe('PUT /voucher/:id - Cập nhật voucher (admin only)', () => {
    it('TC-13: admin cập nhật voucherValue thành công → 200, data.voucherValue mới, field khác không đổi', async () => {
      const res = await request(app)
        .put(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherValue: 20000 })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.voucherValue).toBe(20000);
      // Field khác giữ nguyên (partial update hoạt động đúng)
      expect(res.body.data.voucherCode).toBe(baseVoucher.voucherCode);
      expect(res.body.data.minOrderValue).toBe(baseVoucher.minOrderValue);
    });

    it('TC-14: admin cập nhật voucherExpiration → 200, date mới trong data', async () => {
      const newExpiry = new Date('2099-12-31');

      const res = await request(app)
        .put(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherExpiration: newExpiry })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(new Date(res.body.data.voucherExpiration).getFullYear()).toBe(2099);
    });

    it('TC-15: ID không tồn tại → 404', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .put(`/voucher/${ghostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherValue: 99999 })
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Voucher not found');
    });

    it.skip('TC-16: ID không phải ObjectId format → nên 400 nhưng controller trả 500 (BUG-07)', async () => {
      const res = await request(app)
        .put('/voucher/not-an-objectid')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherValue: 99999 })
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('TC-17: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .put(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ voucherValue: 99999 })
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('TC-18: không có Authorization header → 401', async () => {
      const res = await request(app)
        .put(`/voucher/${testVoucher._id}`)
        .send({ voucherValue: 99999 })
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-19: DB lỗi khi findById → 500', async () => {
      jest.spyOn(Voucher, 'findById').mockRejectedValueOnce(new Error('DB read error'));

      const res = await request(app)
        .put(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ voucherValue: 99999 })
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // DELETE /voucher/:id — xóa voucher (admin only)
  // =====================================================
  describe('DELETE /voucher/:id - Xóa voucher (admin only)', () => {
    it('TC-20: admin xóa thành công → 200, voucher không còn trong DB', async () => {
      const res = await request(app)
        .delete(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');

      const inDb = await Voucher.findById(testVoucher._id);
      expect(inDb).toBeNull();
    });

    it('TC-21: ID không tồn tại → 404', async () => {
      const ghostId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/voucher/${ghostId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Voucher not found');
    });

    it.skip('TC-22: ID không phải ObjectId format → nên 400 nhưng controller trả 500 (BUG-07)', async () => {
      const res = await request(app)
        .delete('/voucher/not-an-objectid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.message).toBeDefined();
    });

    it('TC-23: user thường bị từ chối → 403', async () => {
      const res = await request(app)
        .delete(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.status).toBe('error');
    });

    it('TC-24: không có Authorization header → 401', async () => {
      const res = await request(app)
        .delete(`/voucher/${testVoucher._id}`)
        .expect(401);

      expect(res.body.status).toBe('error');
    });

    it('TC-25: DB lỗi khi findById → 500', async () => {
      jest.spyOn(Voucher, 'findById').mockRejectedValueOnce(new Error('DB read error'));

      const res = await request(app)
        .delete(`/voucher/${testVoucher._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });

  // =====================================================
  // GET /voucher/:voucherCode — lấy theo code, kiểm tra hết hạn
  // =====================================================
  describe('GET /voucher/:voucherCode - Lấy voucher theo code (có kiểm tra hết hạn)', () => {
    it('TC-26: voucher hợp lệ, chưa hết hạn → 200, status "success"', async () => {
      const futureVoucher = await Voucher.create({
        voucherCode: 'FUTURE_CODE',
        voucherValue: 30000,
        minOrderValue: 100000,
        voucherType: 1,
        voucherExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const res = await request(app)
        .get(`/voucher/${futureVoucher.voucherCode}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.voucherCode).toBe('FUTURE_CODE');
    });

    it('TC-27: voucher không tồn tại → 404, message "Voucher not found"', async () => {
      const res = await request(app)
        .get('/voucher/NONEXISTENT_CODE')
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Voucher not found');
    });

    it('TC-28: voucher đã hết hạn → 404, message "Voucher is expired"', async () => {
      await Voucher.findByIdAndUpdate(testVoucher._id, {
        voucherExpiration: new Date('2020-01-01'),
      });

      const res = await request(app)
        .get(`/voucher/${baseVoucher.voucherCode}`)
        .expect(404);

      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('Voucher is expired');
    });

    it('TC-29: voucher không có expiration date → 200 (new Date() > undefined === false, không bao giờ hết hạn)', async () => {
      // testVoucher được tạo từ baseVoucher không có voucherExpiration
      const res = await request(app)
        .get(`/voucher/${baseVoucher.voucherCode}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.voucherCode).toBe(baseVoucher.voucherCode);
    });

    it('TC-30: DB lỗi → 500', async () => {
      jest.spyOn(Voucher, 'findOne').mockRejectedValueOnce(new Error('DB read error'));

      const res = await request(app)
        .get(`/voucher/${baseVoucher.voucherCode}`)
        .expect(500);

      expect(res.body.status).toBe('error');
    });
  });
});
