const verifyToken = require('../../Middleware/verifyToken');
const admin = require('../../config/firestore_config');

console.error = jest.fn();
console.log = jest.fn();

jest.mock('../../config/firestore_config', () => ({
  auth: jest.fn().mockReturnValue({
    verifyIdToken: jest.fn(),
  }),
}));

describe('verifyToken Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      headers: {
        authorization: null,
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
  });

  test('should pass with valid token', async () => {
    const mockDecodedToken = { uid: 'user123' };
    admin.auth().verifyIdToken.mockResolvedValue(mockDecodedToken);

    req.headers.authorization = 'Bearer validToken';

    await verifyToken(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('validToken');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });

  test('should fail with missing token', async () => {
    await verifyToken(req, res, next);

    expect(admin.auth().verifyIdToken).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized: No token provided');
  });

  test('should fail with invalid token', async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));
    req.headers.authorization = 'Bearer invalidToken';

    await verifyToken(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('invalidToken');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized: Token verification failed');
  });

  test('should fail with token verification error', async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error('Token verification failed'));
    req.headers.authorization = 'Bearer validToken';

    await verifyToken(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('validToken');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized: Token verification failed');
  });

  test('should handle internal server error', async () => {
    admin.auth().verifyIdToken.mockRejectedValue(new Error('Firebase Admin initialization failed'));
    req.headers.authorization = 'Bearer validToken';

    await verifyToken(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('validToken');
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith('Unauthorized: Token verification failed');
  });
});
