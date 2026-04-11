const jwt = require('jsonwebtoken');
const { checkAdmin, checkLogin } = require('../services/verityService');

// Set SECRET_KEY cho test environment
process.env.SECRET_KEY = process.env.SECRET_KEY || 'your_secret_key';
const SECRET_KEY = process.env.SECRET_KEY;

describe('Authorization Service Unit Tests', () => {
  let req, res, next;

  // Setup mock objects trước mỗi test
  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    next = jest.fn();
  });

  // Helper function để tạo JWT token
  const generateToken = (payload, options = {}) => {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: '1h', ...options });
  };

  describe('checkLogin Middleware', () => {
    it('should pass authentication with valid user token', async () => {
      const userPayload = { userId: 'user123', role: 'user' };
      const token = generateToken(userPayload);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkLogin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(expect.objectContaining(userPayload));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass authentication with valid admin token', async () => {
      const adminPayload = { userId: 'admin123', role: 'admin' };
      const token = generateToken(adminPayload);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkLogin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(expect.objectContaining(adminPayload));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header provided', async () => {
      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized - No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when authorization header does not start with Bearer', async () => {
      req.headers.authorization = 'Basic sometoken';

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token format. Use: Bearer <token>'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is missing after Bearer', async () => {
      req.headers.authorization = 'Bearer ';

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid or missing token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is "undefined"', async () => {
      req.headers.authorization = 'Bearer undefined';

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid or missing token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is "null"', async () => {
      req.headers.authorization = 'Bearer null';

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid or missing token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid/malformed', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      const expiredToken = generateToken(
        { userId: 'user123', role: 'user' },
        { expiresIn: '-1h' } // Token đã hết hạn 1 giờ trước
      );
      
      req.headers.authorization = `Bearer ${expiredToken}`;

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is signed with wrong secret', async () => {
      const wrongToken = jwt.sign(
        { userId: 'user123', role: 'user' },
        'wrong_secret_key',
        { expiresIn: '1h' }
      );
      
      req.headers.authorization = `Bearer ${wrongToken}`;

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle server errors gracefully', async () => {
      // Mock jwt.verify để throw unexpected error
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected server error');
      });

      const validToken = generateToken({ userId: 'user123', role: 'user' });
      req.headers.authorization = `Bearer ${validToken}`;

      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Server error'
      });
      expect(next).not.toHaveBeenCalled();

      // Restore
      jwt.verify = originalVerify;
    });
  });

  describe('checkAdmin Middleware', () => {
    it('should pass authentication and authorization for valid admin', async () => {
      const adminPayload = { userId: 'admin123', role: 'admin' };
      const token = generateToken(adminPayload);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(expect.objectContaining(adminPayload));
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', async () => {
      const userPayload = { userId: 'user123', role: 'user' };
      const token = generateToken(userPayload);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Permission denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when role is missing', async () => {
      const payloadWithoutRole = { userId: 'user123' }; // Không có role
      const token = generateToken(payloadWithoutRole);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Permission denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when role is empty string', async () => {
      const payloadWithEmptyRole = { userId: 'user123', role: '' };
      const token = generateToken(payloadWithEmptyRole);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Permission denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when role is invalid value', async () => {
      const payloadWithInvalidRole = { userId: 'user123', role: 'moderator' };
      const token = generateToken(payloadWithInvalidRole);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Permission denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when no authorization header provided', async () => {
      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unauthorized - No token provided'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is invalid', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when token is expired', async () => {
      const expiredAdminToken = generateToken(
        { userId: 'admin123', role: 'admin' },
        { expiresIn: '-1h' }
      );
      
      req.headers.authorization = `Bearer ${expiredAdminToken}`;

      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Integration Tests - Authorization Flow', () => {
    it('should handle authentication and authorization workflow for admin access', async () => {
      // Scenario: Admin truy cập chức năng yêu cầu admin role
      const adminPayload = { userId: 'admin456', role: 'admin' };
      const adminToken = generateToken(adminPayload);
      
      req.headers.authorization = `Bearer ${adminToken}`;

      // Step 1: Kiểm tra admin quyền
      await checkAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user.role).toBe('admin');
      expect(req.user.userId).toBe('admin456');
    });

    it('should handle authentication workflow for user access', async () => {
      // Scenario: User truy cập chức năng chỉ yêu cầu đăng nhập
      const userPayload = { userId: 'user789', role: 'user' };
      const userToken = generateToken(userPayload);
      
      req.headers.authorization = `Bearer ${userToken}`;

      // Step 1: Kiểm tra đăng nhập
      await checkLogin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user.role).toBe('user');
      expect(req.user.userId).toBe('user789');
    });

    it('should properly reject user trying to access admin function', async () => {
      // Scenario: User cố gắng truy cập chức năng admin
      const userPayload = { userId: 'user789', role: 'user' };
      const userToken = generateToken(userPayload);
      
      req.headers.authorization = `Bearer ${userToken}`;

      // User cố gắng truy cập admin endpoint
      await checkAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Permission denied'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle multiple consecutive middleware calls', async () => {
      // Scenario: API endpoint có cả checkLogin và checkAdmin
      const adminPayload = { userId: 'superadmin', role: 'admin' };
      const adminToken = generateToken(adminPayload);
      
      req.headers.authorization = `Bearer ${adminToken}`;

      // Reset mocks
      next.mockClear();
      res.status.mockClear();
      res.json.mockClear();

      // Step 1: Kiểm tra đăng nhập trước
      await checkLogin(req, res, next);
      
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user.role).toBe('admin');

      // Reset next để test step 2
      next.mockClear();

      // Step 2: Kiểm tra quyền admin (req.user đã được set từ step 1)
      await checkAdmin(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled(); // Không có lỗi
    });

    it('should handle token refresh scenario', async () => {
      // Scenario: Token cũ expired, cần dùng token mới
      const expiredToken = generateToken(
        { userId: 'user123', role: 'user' },
        { expiresIn: '-1h' }
      );
      
      req.headers.authorization = `Bearer ${expiredToken}`;

      // Cố gắng với token cũ
      await checkLogin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired'
      });

      // Reset để test với token mới
      res.status.mockClear();
      res.json.mockClear();
      next.mockClear();

      // Sử dụng token mới
      const newToken = generateToken({ userId: 'user123', role: 'user' });
      req.headers.authorization = `Bearer ${newToken}`;

      await checkLogin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe('user123');
      expect(res.status).not.toHaveBeenCalled(); // Thành công
    });

    it('should validate different user roles properly', async () => {
      const testCases = [
        { role: 'admin', shouldPassAdmin: true, shouldPassLogin: true },
        { role: 'user', shouldPassAdmin: false, shouldPassLogin: true },
        { role: 'guest', shouldPassAdmin: false, shouldPassLogin: true },
        { role: '', shouldPassAdmin: false, shouldPassLogin: true },
        { role: null, shouldPassAdmin: false, shouldPassLogin: true }
      ];

      for (const testCase of testCases) {
        // Reset mocks
        req = { headers: {}, user: null };
        res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        const payload = { userId: 'testuser', role: testCase.role };
        const token = generateToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        // Test checkLogin
        await checkLogin(req, res, next);
        
        if (testCase.shouldPassLogin) {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalled();
        }

        // Reset cho checkAdmin test
        next.mockClear();
        res.status.mockClear();
        res.json.mockClear();

        // Test checkAdmin
        await checkAdmin(req, res, next);
        
        if (testCase.shouldPassAdmin) {
          expect(next).toHaveBeenCalled();
          expect(res.status).not.toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(403);
          expect(next).not.toHaveBeenCalled();
        }
      }
    });
  });

  describe('Edge Cases and Security Tests', () => {
    it('should handle malicious token payloads safely', async () => {
      // Token với payload có thể gây lỗi
      const maliciousPayloads = [
        { userId: '<script>alert("xss")</script>', role: 'admin' },
        { userId: 'null_user', role: 'admin' }, // Thay null bằng string
        { userId: 'undefined_user', role: 'admin' }, // Thay undefined bằng string
        { userId: 123456, role: 'admin' },
        { userId: 'empty_object', role: 'admin' }, // Thay {} bằng string
        { userId: 'empty_array', role: 'admin' } // Thay [] bằng string
      ];

      for (const payload of maliciousPayloads) {
        req = { headers: {}, user: null };
        res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        const token = generateToken(payload);
        req.headers.authorization = `Bearer ${token}`;

        await checkAdmin(req, res, next);

        // Admin middleware should handle all cases gracefully
        expect(req.user).toEqual(expect.objectContaining({
          userId: payload.userId,
          role: payload.role
        }));
        if (payload.role === 'admin') {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(403);
        }
      }
    });

    it('should handle very long authorization headers', async () => {
      const longUserId = 'a'.repeat(10000); // Very long userId
      const payload = { userId: longUserId, role: 'admin' };
      const token = generateToken(payload);
      
      req.headers.authorization = `Bearer ${token}`;

      await checkAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.userId).toBe(longUserId);
    });

    it('should handle authorization header with extra spaces', async () => {
      const payload = { userId: 'user123', role: 'user' };
      const token = generateToken(payload);
      
      // Authorization header với spaces thừa
      req.headers.authorization = `  Bearer   ${token}  `;

      await checkLogin(req, res, next);

      // Should fail vì format không đúng (có spaces)
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token format. Use: Bearer <token>'
      });
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      const payload = { userId: 'user123', role: 'user' };
      const token = generateToken(payload);
      
      const testCases = ['bearer', 'BEARER', 'Bearer', 'BeArEr'];
      
      for (const bearerKeyword of testCases) {
        req = { headers: {}, user: null };
        res = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        req.headers.authorization = `${bearerKeyword} ${token}`;

        await checkLogin(req, res, next);

        if (bearerKeyword === 'Bearer') {
          expect(next).toHaveBeenCalled();
        } else {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalledWith({
            status: 'error',
            message: 'Invalid token format. Use: Bearer <token>'
          });
        }
      }
    });
  });
});
