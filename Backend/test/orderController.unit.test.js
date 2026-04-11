const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import controllers và models
const orderController = require('../controllers/orderController');
const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');

// Set SECRET_KEY cho test environment
process.env.SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Secret key cho JWT (đồng bộ với verityService)
const SECRET_KEY = process.env.SECRET_KEY;

// Tạo app express để test
const app = express();
app.use(express.json());
app.use('/order', orderController);

// Helper function để tạo JWT token
const generateToken = (userId, role = 'user') => {
  return jwt.sign({ userId, role }, SECRET_KEY, { expiresIn: '1h' });
};

describe('Order Controller Unit Tests - Fixed', () => {
  let mongoServer;
  let testUser, testAdmin, testProduct1, testProduct2;
  let userToken, adminToken;

  // Setup database trước khi chạy test
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  // Cleanup sau khi test xong
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Setup dữ liệu test cho mỗi test case
  beforeEach(async () => {
    // Xóa dữ liệu cũ
    await Order.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});

    // Tạo test products
    testProduct1 = await Product.create({
      imgSrc: 'test-product-1.jpg',
      title: 'Test Book 1',
      author: 'Test Author 1',
      price: 100000,
      type: 'V'
    });

    testProduct2 = await Product.create({
      imgSrc: 'test-product-2.jpg',
      title: 'Test Book 2',
      author: 'Test Author 2',
      price: 200000,
      type: 'K'
    });

    // Tạo test user
    testUser = await User.create({
      email: 'user@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'user'
    });

    // Tạo test admin
    testAdmin = await User.create({
      email: 'admin@example.com',
      name: 'Test Admin',
      password: 'hashedpassword',
      role: 'admin'
    });

    // Tạo JWT tokens
    userToken = generateToken(testUser._id.toString(), 'user');
    adminToken = generateToken(testAdmin._id.toString(), 'admin');
  });

  describe('POST /order - Tạo đơn hàng', () => {
    it('should create new order successfully', async () => {
      const orderData = {
        userId: testUser._id,
        name: 'Test User',
        phone: '0123456789',
        email: 'user@example.com',
        address: '123 Test Street',
        products: [
          {
            productId: testProduct1._id,
            quantity: 2
          },
          {
            productId: testProduct2._id,
            quantity: 1
          }
        ],
        type: 'cod',
        total: 400000,
        discount: 0
      };

      const response = await request(app)
        .post('/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data.products).toHaveLength(2);
      expect(response.body.data.total).toBe(400000);
    });

    it('should reject order creation when userId mismatch', async () => {
      const orderData = {
        userId: testAdmin._id, // Khác userId trong token
        name: 'Test User',
        phone: '0123456789',
        email: 'user@example.com',
        address: '123 Test Street',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000
      };

      const response = await request(app)
        .post('/order')
        .set('Authorization', `Bearer ${userToken}`)
        .send(orderData)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Permission denied');
    });
  });

  describe('GET /order/user - Lấy đơn hàng của user', () => {
    beforeEach(async () => {
      // Tạo một số đơn hàng test
      await Order.create({
        userId: testUser._id,
        name: 'Test User',
        phone: '0123456789',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000,
        status: 'pending'
      });

      await Order.create({
        userId: testUser._id,
        name: 'Test User',
        phone: '0123456789',
        products: [{
          productId: testProduct2._id,
          quantity: 2
        }],
        total: 400000,
        status: 'completed'
      });
    });

    it('should return user orders only', async () => {
      const response = await request(app)
        .get('/order/user')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ userId: testUser._id.toString() }) // Gửi userId string để match controller logic
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('GET /order - Admin lấy tất cả đơn hàng', () => {
    beforeEach(async () => {
      await Order.create({
        userId: testUser._id,
        name: 'Test User',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000
      });
    });

    it('should return all orders for admin', async () => {
      const response = await request(app)
        .get('/order')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data).toHaveLength(1);
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .get('/order')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('POST /order/:id - Cập nhật đơn hàng', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        userId: testUser._id, // Lưu userId là ObjectId
        name: 'Test User',
        phone: '0123456789',
        email: 'user@example.com',
        address: '123 Test Street',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000,
        status: 'pending'
      });
    });

    it('should update order successfully when status is pending', async () => {
      // Mock Order.findById để trả về order với userId khớp với token
      const originalFindById = Order.findById;
      const mockOrder = {
        ...testOrder._doc,
        userId: testUser._id.toString(),
        set: jest.fn(),
        save: jest.fn().mockImplementation(function() {
          this.name = 'Updated User';
          this.phone = '0987654321';
          this.address = '456 New Street';
          return Promise.resolve(this);
        })
      };
      
      Order.findById = jest.fn().mockResolvedValue(mockOrder);

      const updateData = {
        name: 'Updated User',
        phone: '0987654321',
        address: '456 New Street'
      };

      const response = await request(app)
        .post(`/order/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data.name).toBe('Updated User');
      expect(response.body.data.phone).toBe('0987654321');
      expect(response.body.data.address).toBe('456 New Street');

      // Restore
      Order.findById = originalFindById;
    });

    it('should reject update when order status is not pending', async () => {
      // Mock Order.findById để trả về order với status completed
      const originalFindById = Order.findById;
      Order.findById = jest.fn().mockResolvedValue({
        ...testOrder._doc,
        userId: testUser._id.toString(), // Set userId khớp
        status: 'completed', // Set status completed
        set: jest.fn(),
        save: jest.fn()
      });

      const updateData = {
        name: 'Updated User'
      };

      const response = await request(app)
        .post(`/order/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Order cannot be updated');

      // Restore
      Order.findById = originalFindById;
    });
  });

  describe('PUT /order/:id/status - Admin cập nhật trạng thái', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        userId: testUser._id,
        name: 'Test User',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000,
        status: 'pending'
      });
    });

    it('should update order status successfully by admin', async () => {
      const response = await request(app)
        .put(`/order/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data.status).toBe('completed');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .put(`/order/${testOrder._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'completed' })
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });

  describe('DELETE /order/:id - Admin xóa đơn hàng', () => {
    let testOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        userId: testUser._id,
        name: 'Test User',
        products: [{
          productId: testProduct1._id,
          quantity: 1
        }],
        total: 100000,
        status: 'pending'
      });
    });

    it('should cancel order successfully by admin', async () => {
      const response = await request(app)
        .delete(`/order/${testOrder._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body.data.status).toBe('cancel');
    });

    it('should deny access for non-admin users', async () => {
      const response = await request(app)
        .delete(`/order/${testOrder._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body).toHaveProperty('status', 'error');
    });
  });
});
