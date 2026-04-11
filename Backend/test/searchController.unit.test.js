const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Import controller và model
const searchController = require('../controllers/searchController');
const Product = require('../models/Product');

// Tạo app express để test
const app = express();
app.use(express.json());
app.use('/search', searchController);

describe('SearchController Unit Tests', () => {
  let mongoServer;
  let originalMongooseConnection;

  // Setup database trước khi chạy test
  beforeAll(async () => {
    // Lưu kết nối hiện tại (để đảm bảo không ảnh hưởng DB thực)
    originalMongooseConnection = mongoose.connection;
    
    // Tạo MongoDB test server in-memory (không ảnh hưởng DB thực)
    mongoServer = await MongoMemoryServer.create();
    const mongoTestUri = mongoServer.getUri();
    
    // Disconnect khỏi DB thực và connect đến DB test
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoTestUri);
    
    console.log('🧪 Test đang sử dụng MongoDB In-Memory:', mongoTestUri);
    console.log('✅ Dữ liệu thực của bạn hoàn toàn an toàn!');
  });

  // Cleanup sau khi test xong
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('🧹 Đã dọn dẹp MongoDB test server');
  });

  // Xóa dữ liệu test trước mỗi test case (chỉ trong DB test in-memory)
  beforeEach(async () => {
    await Product.deleteMany({}); // Chỉ xóa dữ liệu test, không ảnh hưởng DB thực
  });

  describe('GET /', () => {
    it('should return all products', async () => {
      // Tạo dữ liệu test
      const testProducts = [
        {
          imgSrc: 'test-image-a.jpg',
          title: 'Sách A',
          author: 'Tác giả A',
          price: 100000,
          type: 'V', // Văn học
          soldCount: 10,
          rating: 4.5,
          discount: 10
        },
        {
          imgSrc: 'test-image-b.jpg',
          title: 'Sách B',
          author: 'Tác giả B',
          price: 200000,
          type: 'K', // Kinh tế
          soldCount: 5,
          rating: 4.0,
          discount: 0
        }
      ];

      await Product.insertMany(testProducts);

      // Thực hiện request
      const response = await request(app)
        .get('/search/')
        .expect(200);

      // Kiểm tra kết quả
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('author');
      expect(response.body[0]).toHaveProperty('price');
    });

    it('should return empty array when no products exist', async () => {
      const response = await request(app)
        .get('/search/')
        .expect(200);

      expect(response.body).toHaveLength(0);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle database error', async () => {
      // Mock lỗi database
      const originalFind = Product.find;
      Product.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/search/')
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Server error');

      // Restore original method
      Product.find = originalFind;
    });
  });

  describe('GET /top24', () => {
    it('should return top 24 products', async () => {
      // Tạo 30 sản phẩm test
      const testProducts = [];
      for (let i = 1; i <= 30; i++) {
        testProducts.push({
          imgSrc: `test-image-${i}.jpg`,
          title: `Sách ${i}`,
          author: `Tác giả ${i}`,
          price: i * 10000,
          type: 'V', // Văn học
          soldCount: i,
          rating: 4.0,
          discount: 0
        });
      }

      await Product.insertMany(testProducts);

      const response = await request(app)
        .get('/search/top24')
        .expect(200);

      // Kiểm tra chỉ trả về tối đa 24 sản phẩm
      expect(response.body).toHaveLength(24);
      expect(response.body[0]).toHaveProperty('title');
    });
  });

  describe('GET /top10', () => {
    it('should return top 10 products by sold count', async () => {
      const testProducts = [
        { imgSrc: 'test-a.jpg', title: 'Sách A', author: 'A', price: 100000, soldCount: 50, type: 'V' },
        { imgSrc: 'test-b.jpg', title: 'Sách B', author: 'B', price: 100000, soldCount: 30, type: 'V' },
        { imgSrc: 'test-c.jpg', title: 'Sách C', author: 'C', price: 100000, soldCount: 80, type: 'V' },
        { imgSrc: 'test-d.jpg', title: 'Sách D', author: 'D', price: 100000, soldCount: 20, type: 'V' },
        { imgSrc: 'test-e.jpg', title: 'Sách E', author: 'E', price: 100000, soldCount: 90, type: 'V' }
      ];

      await Product.insertMany(testProducts);

      const response = await request(app)
        .get('/search/top10')
        .expect(200);

      // Kiểm tra kết quả được sắp xếp theo soldCount giảm dần
      expect(response.body).toHaveLength(5);
      expect(response.body[0].soldCount).toBe(90); // Sách E
      expect(response.body[1].soldCount).toBe(80); // Sách C
      expect(response.body[2].soldCount).toBe(50); // Sách A
    });

    it('should only return products with soldCount field', async () => {
      const testProducts = [
        { imgSrc: 'test-a.jpg', title: 'Sách A', author: 'A', price: 100000, soldCount: 50, type: 'V' },
        { imgSrc: 'test-b.jpg', title: 'Sách B', author: 'B', price: 100000, type: 'V' } // Không có soldCount
      ];

      await Product.insertMany(testProducts);

      const response = await request(app)
        .get('/search/top10')
        .expect(200);

      // Chỉ trả về sản phẩm có soldCount
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Sách A');
    });
  });

  describe('GET /sale10', () => {
    it('should return top 10 products with highest discount', async () => {
      const testProducts = [
        { imgSrc: 'test-a.jpg', title: 'Sách A', author: 'A', price: 100000, discount: 30, type: 'V' },
        { imgSrc: 'test-b.jpg', title: 'Sách B', author: 'B', price: 100000, discount: 50, type: 'V' },
        { imgSrc: 'test-c.jpg', title: 'Sách C', author: 'C', price: 100000, discount: 20, type: 'V' },
        { imgSrc: 'test-d.jpg', title: 'Sách D', author: 'D', price: 100000, type: 'V' } // Không có discount
      ];

      await Product.insertMany(testProducts);

      const response = await request(app)
        .get('/search/sale10')
        .expect(200);

      // Kiểm tra sắp xếp theo discount giảm dần
      expect(response.body).toHaveLength(3); // Chỉ sản phẩm có discount
      expect(response.body[0].discount).toBe(50); // Sách B
      expect(response.body[1].discount).toBe(30); // Sách A
      expect(response.body[2].discount).toBe(20); // Sách C
    });
  });

  describe('POST /filter', () => {
    beforeEach(async () => {
      // Tạo dữ liệu test cho filter
      const testProducts = [
        {
          imgSrc: 'js-book.jpg',
          title: 'Lập trình JavaScript',
          author: 'Nguyễn Văn A',
          price: 150000,
          type: 'G', // Giáo dục
          rating: 4.5,
          discount: 20
        },
        {
          imgSrc: 'python-book.jpg',
          title: 'Học Python cơ bản',
          author: 'Trần Thị B',
          price: 200000,
          type: 'G', // Giáo dục
          rating: 4.0,
          discount: 10
        },
        {
          imgSrc: 'literature-book.jpg',
          title: 'Văn học Việt Nam',
          author: 'Nguyễn Văn A',
          price: 120000,
          type: 'V', // Văn học
          rating: 4.8,
          discount: 0
        },
        {
          imgSrc: 'economic-book.jpg',
          title: 'Kinh tế vĩ mô',
          author: 'Lê Văn C',
          price: 300000,
          type: 'K', // Kinh tế
          rating: 4.2,
          discount: 15
        }
      ];

      await Product.insertMany(testProducts);
    });

    it('should filter products by type', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ type: 'G' }) // Giáo dục
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.products.every(p => p.type === 'G')).toBe(true);
    });

    it('should filter products by title (case insensitive)', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ title: 'javascript' })
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].title).toContain('JavaScript');
    });

    it('should filter products by author', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ author: 'Nguyễn Văn A' })
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.products.every(p => p.author === 'Nguyễn Văn A')).toBe(true);
    });

    it('should filter products by price range', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ 
          minPrice: 150000, 
          maxPrice: 250000 
        })
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.products.every(p => p.price >= 150000 && p.price <= 250000)).toBe(true);
    });

    it('should sort products by price descending when isSortByPrice is true', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ isSortByPrice: true })
        .expect(200);

      const prices = response.body.products.map(p => p.price);
      const sortedPrices = [...prices].sort((a, b) => b - a);
      expect(prices).toEqual(sortedPrices);
    });

    it('should sort products by rating descending when isSortByRating is true', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ isSortByRating: true })
        .expect(200);

      const ratings = response.body.products.map(p => p.rating);
      const sortedRatings = [...ratings].sort((a, b) => b - a);
      expect(ratings).toEqual(sortedRatings);
    });

    it('should sort products by discount descending when isSortByDiscount is true', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({ isSortByDiscount: true })
        .expect(200);

      const discounts = response.body.products.map(p => p.discount);
      const sortedDiscounts = [...discounts].sort((a, b) => b - a);
      expect(discounts).toEqual(sortedDiscounts);
    });

    it('should handle pagination correctly', async () => {
      const response = await request(app)
        .post('/search/filter?page=1&limit=2')
        .send({})
        .expect(200);

      expect(response.body.products).toHaveLength(2);
      expect(response.body.total).toBe(4);
    });

    it('should combine multiple filters', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({
          type: 'G', // Giáo dục
          minPrice: 180000,
          maxPrice: 250000,
          isSortByPrice: true
        })
        .expect(200);

      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].title).toBe('Học Python cơ bản');
      expect(response.body.products[0].type).toBe('G');
      expect(response.body.products[0].price).toBe(200000);
    });

    it('should return empty result when no products match filter', async () => {
      const response = await request(app)
        .post('/search/filter')
        .send({
          type: 'Z', // Type không tồn tại
          title: 'Sách không có'
        })
        .expect(200);

      expect(response.body.products).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should handle filter error', async () => {
      // Mock lỗi database
      const originalFind = Product.find;
      Product.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            skip: jest.fn().mockRejectedValue(new Error('Database error'))
          })
        })
      });

      const response = await request(app)
        .post('/search/filter')
        .send({ type: 'G' }) // Giáo dục
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Server error');

      // Restore
      Product.find = originalFind;
    });
  });

  describe('GET /topAuthors', () => {
    beforeEach(async () => {
      const testProducts = [
        { imgSrc: 'book1.jpg', title: 'Sách 1', author: 'Nguyễn Văn A', price: 100000, type: 'V' },
        { imgSrc: 'book2.jpg', title: 'Sách 2', author: 'Nguyễn Văn A', price: 150000, type: 'V' },
        { imgSrc: 'book3.jpg', title: 'Sách 3', author: 'Nguyễn Văn A', price: 120000, type: 'V' },
        { imgSrc: 'book4.jpg', title: 'Sách 4', author: 'Trần Thị B', price: 200000, type: 'K' },
        { imgSrc: 'book5.jpg', title: 'Sách 5', author: 'Trần Thị B', price: 180000, type: 'K' },
        { imgSrc: 'book6.jpg', title: 'Sách 6', author: 'Lê Văn C', price: 250000, type: 'G' }
      ];

      await Product.insertMany(testProducts);
    });

    it('should return top 5 authors with book count and titles', async () => {
      const response = await request(app)
        .get('/search/topAuthors')
        .expect(200);

      expect(response.body).toHaveLength(3); // Có 3 tác giả
      
      // Kiểm tra tác giả có nhiều sách nhất
      const topAuthor = response.body[0];
      expect(topAuthor._id).toBe('Nguyễn Văn A');
      expect(topAuthor.count).toBe(3);
      expect(topAuthor.books).toHaveLength(3);
      expect(topAuthor.books).toContain('Sách 1');
      expect(topAuthor.books).toContain('Sách 2');
      expect(topAuthor.books).toContain('Sách 3');
    });

    it('should sort authors by book count in descending order', async () => {
      const response = await request(app)
        .get('/search/topAuthors')
        .expect(200);

      expect(response.body[0].count).toBe(3); // Nguyễn Văn A
      expect(response.body[1].count).toBe(2); // Trần Thị B  
      expect(response.body[2].count).toBe(1); // Lê Văn C
    });

    it('should handle database error in topAuthors', async () => {
      // Mock lỗi database
      const originalAggregate = Product.aggregate;
      Product.aggregate = jest.fn().mockRejectedValue(new Error('Aggregation error'));

      const response = await request(app)
        .get('/search/topAuthors')
        .expect(500);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message', 'Server error');

      // Restore
      Product.aggregate = originalAggregate;
    });
  });
});
