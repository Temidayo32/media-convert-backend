const admin = require('../config/firestore_config');

const verifyToken = async (req, res, next) => {
    try {
      const idToken = req.headers.authorization && req.headers.authorization.split('Bearer ')[1];
      
      if (!idToken) {
        return res.status(401).send('Unauthorized: No token provided');
      }
  
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      
      if (decodedToken) {
        next();
      } else {
        return res.status(401).send('Unauthorized: Invalid token');
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(401).send('Unauthorized: Token verification failed');
    }
  };
  

module.exports = verifyToken;
