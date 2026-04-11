const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import controllers và models
const userController = require('../controllers/userController');
const User = require('../models/User');
const Product = require('../models/Product');

// Set SECRET_KEY cho test environment
process.env.SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';

// Secret key cho JWT (đồng bộ với verityService)
const SECRET_KEY = process.env.SECRET_KEY;

// Tạo app express để test
const app = express();
app.use(express.json());
app.use('/user', userController);

// Helper function để tạo JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, SECRET_KEY, { expiresIn: '1h' });
};

describe('Cart Controller Unit Tests', () => {
  let mongoServer;
  let testUser;
  let testProduct;
  let authToken;

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
    await User.deleteMany({});
    await Product.deleteMany({});

    // Tạo test product
    testProduct = await Product.create({
      imgSrc: 'test-product.jpg',
      title: 'Test Book',
      author: 'Test Author',
      price: 100000,
      type: 'V'
    });

    // Tạo test user với giỏ hàng trống
    testUser = await User.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashedpassword',
      role: 'user',
      cart: []
    });

    // Tạo JWT token cho authentication
    authToken = generateToken(testUser._id);
  });

  describe('POST /user/cart - Thêm sản phẩm vào giỏ hàng', () => {
    it('should add new product to empty cart', async () => {
      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sản phẩm đã được thêm vào giỏ hàng.');
      expect(response.body.cart).toHaveLength(1);
      expect(response.body.cart[0].product.toString()).toBe(testProduct._id.toString());
      expect(response.body.cart[0].quantity).toBe(2);
    });

    it('should update quantity when product already exists in cart', async () => {
      // Thêm sản phẩm lần đầu
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });

      // Update quantity
      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 5
        })
        .expect(200);

      expect(response.body.cart).toHaveLength(1);
      expect(response.body.cart[0].quantity).toBe(5);
    });

    it('should add multiple different products to cart', async () => {
      // Tạo sản phẩm thứ 2
      const testProduct2 = await Product.create({
        imgSrc: 'test-product-2.jpg',
        title: 'Test Book 2',
        author: 'Test Author 2',
        price: 150000,
        type: 'K'
      });

      // Thêm sản phẩm đầu tiên
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });

      // Thêm sản phẩm thứ 2
      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 3
        })
        .expect(200);

      expect(response.body.cart).toHaveLength(2);
      expect(response.body.cart.find(item => 
        item.product.toString() === testProduct._id.toString()
      ).quantity).toBe(2);
      expect(response.body.cart.find(item => 
        item.product.toString() === testProduct2._id.toString()
      ).quantity).toBe(3);
    });

    it('should return 401 when no token provided', async () => {
      const response = await request(app)
        .post('/user/cart')
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Unauthorized - No token provided');
    });

    it('should return 401 when invalid token provided', async () => {
      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Invalid token');
    });

    it('should return 404 when user not found', async () => {
      // Tạo token với user ID không tồn tại
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = generateToken(fakeUserId);

      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Người dùng không tồn tại.');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Lỗi khi thêm sản phẩm vào giỏ hàng.');

      // Restore original method
      User.findById = originalFindById;
    });
  });

  describe('GET /user/cart - Lấy danh sách giỏ hàng', () => {
    beforeEach(async () => {
      // Thêm sản phẩm vào giỏ hàng cho test
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 3
        });
    });

    it('should return user cart with populated products', async () => {
      const response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cart');
      expect(response.body.cart).toHaveLength(1);
      expect(response.body.cart[0]).toHaveProperty('product');
      expect(response.body.cart[0]).toHaveProperty('quantity', 3);
      
      // Kiểm tra product được populate
      expect(response.body.cart[0].product).toHaveProperty('title', 'Test Book');
      expect(response.body.cart[0].product).toHaveProperty('author', 'Test Author');
      expect(response.body.cart[0].product).toHaveProperty('price', 100000);
    });

    it('should return empty cart for user with no items', async () => {
      // Tạo user mới với giỏ hàng trống
      const emptyUser = await User.create({
        email: 'empty@example.com',
        name: 'Empty User',
        password: 'hashedpassword',
        cart: []
      });
      const emptyUserToken = generateToken(emptyUser._id);

      const response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${emptyUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('cart');
      expect(response.body.cart).toHaveLength(0);
    });

    it('should return 401 when no authentication', async () => {
      const response = await request(app)
        .get('/user/cart')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should return 404 when user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = generateToken(fakeUserId);

      const response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Người dùng không tồn tại.');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error - cần mock cả populate method
      const originalFindById = User.findById;
      User.findById = jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('Database error'))
      });

      const response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Lỗi khi lấy giỏ hàng.');

      // Restore
      User.findById = originalFindById;
    });
  });

  describe('DELETE /user/cart - Xóa sản phẩm khỏi giỏ hàng', () => {
    let testProduct2;

    beforeEach(async () => {
      // Tạo sản phẩm thứ 2
      testProduct2 = await Product.create({
        imgSrc: 'test-product-2.jpg',
        title: 'Test Book 2',
        author: 'Test Author 2',
        price: 200000,
        type: 'K'
      });

      // Thêm 2 sản phẩm vào giỏ hàng
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });

      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 3
        });
    });

    it('should remove specific product from cart', async () => {
      const response = await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString()
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sản phẩm đã được xóa khỏi giỏ hàng.');
      expect(response.body.cart).toHaveLength(1);
      expect(response.body.cart[0].product.toString()).toBe(testProduct2._id.toString());
    });

    it('should remove all items when removing the only product', async () => {
      // Xóa sản phẩm đầu tiên
      await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString()
        });

      // Xóa sản phẩm thứ 2 (cuối cùng)
      const response = await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct2._id.toString()
        })
        .expect(200);

      expect(response.body.cart).toHaveLength(0);
    });

    it('should handle removing non-existent product gracefully', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: fakeProductId.toString()
        })
        .expect(200);

      // Giỏ hàng không thay đổi
      expect(response.body.cart).toHaveLength(2);
    });

    it('should return 401 when no authentication', async () => {
      const response = await request(app)
        .delete('/user/cart')
        .send({
          productId: testProduct._id.toString()
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString()
        })
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Lỗi khi xóa sản phẩm khỏi giỏ hàng.');

      // Restore
      User.findById = originalFindById;
    });
  });

  describe('DELETE /user/cart/list - Xóa nhiều sản phẩm khỏi giỏ hàng', () => {
    let testProduct2, testProduct3;

    beforeEach(async () => {
      // Tạo sản phẩm thứ 2 và 3
      testProduct2 = await Product.create({
        imgSrc: 'test-product-2.jpg',
        title: 'Test Book 2',
        author: 'Test Author 2',
        price: 200000,
        type: 'K'
      });

      testProduct3 = await Product.create({
        imgSrc: 'test-product-3.jpg',
        title: 'Test Book 3',
        author: 'Test Author 3',
        price: 300000,
        type: 'G'
      });

      // Thêm 3 sản phẩm vào giỏ hàng
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 1
        });

      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 2
        });

      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct3._id.toString(),
          quantity: 3
        });
    });

    it('should remove multiple products from cart', async () => {
      const idsToRemove = [testProduct._id.toString(), testProduct2._id.toString()];

      const response = await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: idsToRemove
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Sản phẩm đã được xóa khỏi giỏ hàng.');
      expect(response.body.cart).toHaveLength(1);
      expect(response.body.cart[0].product.toString()).toBe(testProduct3._id.toString());
    });

    it('should remove all products when all IDs provided', async () => {
      const idsToRemove = [
        testProduct._id.toString(), 
        testProduct2._id.toString(), 
        testProduct3._id.toString()
      ];

      const response = await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: idsToRemove
        })
        .expect(200);

      expect(response.body.cart).toHaveLength(0);
    });

    it('should handle partial matches when some IDs do not exist', async () => {
      const fakeProductId = new mongoose.Types.ObjectId();
      const idsToRemove = [testProduct._id.toString(), fakeProductId.toString()];

      const response = await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: idsToRemove
        })
        .expect(200);

      // Chỉ xóa testProduct, còn lại testProduct2 và testProduct3
      expect(response.body.cart).toHaveLength(2);
      expect(response.body.cart.find(item => 
        item.product.toString() === testProduct2._id.toString()
      )).toBeDefined();
      expect(response.body.cart.find(item => 
        item.product.toString() === testProduct3._id.toString()
      )).toBeDefined();
    });

    it('should return 404 when user not found', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      const fakeToken = generateToken(fakeUserId);

      const response = await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          ids: [testProduct._id.toString()]
        })
        .expect(404);

      expect(response.body).toHaveProperty('message', 'Người dùng không tồn tại.');
    });

    it('should return 401 when no authentication', async () => {
      const response = await request(app)
        .delete('/user/cart/list')
        .send({
          ids: [testProduct._id.toString()]
        })
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ids: [testProduct._id.toString()]
        })
        .expect(500);

      expect(response.body).toHaveProperty('message', 'Lỗi khi xóa sản phẩm khỏi giỏ hàng.');

      // Restore
      User.findById = originalFindById;
    });
  });

  describe('Cart Integration Tests', () => {
    it('should handle complete cart workflow: add -> get -> update -> remove', async () => {
      // 1. Thêm sản phẩm vào giỏ hàng
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        })
        .expect(200);

      // 2. Lấy giỏ hàng
      let cartResponse = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.cart).toHaveLength(1);
      expect(cartResponse.body.cart[0].quantity).toBe(2);

      // 3. Cập nhật số lượng
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 5
        })
        .expect(200);

      // 4. Kiểm tra cập nhật
      cartResponse = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.cart[0].quantity).toBe(5);

      // 5. Xóa sản phẩm
      await request(app)
        .delete('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString()
        })
        .expect(200);

      // 6. Kiểm tra giỏ hàng trống
      cartResponse = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.cart).toHaveLength(0);
    });

    it('should handle multiple users with separate carts', async () => {
      // Tạo user thứ 2
      const testUser2 = await User.create({
        email: 'test2@example.com',
        name: 'Test User 2',
        password: 'hashedpassword',
        cart: []
      });
      const authToken2 = generateToken(testUser2._id);

      // Tạo sản phẩm thứ 2
      const testProduct2 = await Product.create({
        imgSrc: 'test-product-2.jpg',
        title: 'Test Book 2',
        author: 'Test Author 2',
        price: 200000,
        type: 'K'
      });

      // User 1 thêm product 1
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 2
        });

      // User 2 thêm product 2
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken2}`)
        .send({
          productId: testProduct2._id.toString(),
          quantity: 3
        });

      // Kiểm tra giỏ hàng user 1
      const cart1Response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cart1Response.body.cart).toHaveLength(1);
      expect(cart1Response.body.cart[0].product.title).toBe('Test Book');

      // Kiểm tra giỏ hàng user 2
      const cart2Response = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(cart2Response.body.cart).toHaveLength(1);
      expect(cart2Response.body.cart[0].product.title).toBe('Test Book 2');
      expect(cart2Response.body.cart[0].quantity).toBe(3);
    });

    it('should handle bulk remove operations correctly', async () => {
      // Tạo nhiều sản phẩm
      const products = [];
      for (let i = 0; i < 5; i++) {
        const product = await Product.create({
          imgSrc: `test-product-${i}.jpg`,
          title: `Test Book ${i}`,
          author: `Test Author ${i}`,
          price: (i + 1) * 100000,
          type: 'V'
        });
        products.push(product);
      }

      // Thêm testProduct ban đầu vào giỏ hàng
      await request(app)
        .post('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: testProduct._id.toString(),
          quantity: 1
        });

      // Thêm tất cả sản phẩm mới vào giỏ hàng
      for (let i = 0; i < products.length; i++) {
        await request(app)
          .post('/user/cart')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            productId: products[i]._id.toString(),
            quantity: i + 1
          });
      }

      // Kiểm tra có 6 sản phẩm (5 + testProduct ban đầu)
      let cartResponse = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.cart).toHaveLength(6);

      // Xóa 3 sản phẩm cùng lúc (bao gồm testProduct ban đầu)
      const idsToRemove = [
        testProduct._id.toString(),
        products[1]._id.toString(),
        products[3]._id.toString()
      ];

      await request(app)
        .delete('/user/cart/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ids: idsToRemove })
        .expect(200);

      // Kiểm tra còn 3 sản phẩm
      cartResponse = await request(app)
        .get('/user/cart')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cartResponse.body.cart).toHaveLength(3);
      
      // Kiểm tra đúng sản phẩm còn lại (products[0], products[2], products[4])
      const remainingProductIds = cartResponse.body.cart.map(item => item.product._id);
      expect(remainingProductIds).toContain(products[0]._id.toString());
      expect(remainingProductIds).toContain(products[2]._id.toString());
      expect(remainingProductIds).toContain(products[4]._id.toString());
    });
  });
});
