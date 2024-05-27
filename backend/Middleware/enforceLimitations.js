const redisClient = require('./redisClient');
const { promisify } = require('util');

let limitExceeded = false; 

const enforceLimitations = async (req, res, next) => {
  const idToken = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;

  if (idToken) {
    // Skip limitations for signed users
    return next();
  }

  if (limitExceeded) {
    req.io.emit('limitExceeded', {
      message: 'Conversion limit reached. Please sign up for more conversions.',
    });
    return res.status(429).send('Conversion limit reached. Please sign up for more conversions.');
  }

  try {
    const sessionID =  req.cookies['connect.sid'] 
    console.log('session cookies sid:', req.cookies['connect.sid'])

    const incrAsync = promisify(redisClient.incr).bind(redisClient);
    const conversionCount = await incrAsync(`${sessionID}:conversionCount`);

    await redisClient.expire(`${sessionID}:conversionCount`, 86400);

    const MAX_CONVERSIONS = 5;

    if (conversionCount > MAX_CONVERSIONS) {
      limitExceeded = true;
      req.io.emit('limitExceeded', {
        message: 'Conversion limit reached. Please sign up for more conversions.',
      });
      return res.status(429).send('Conversion limit reached. Please sign up for more conversions.');
    }

    // // Update conversionTime
    // const setAsync = promisify(redisClient.set).bind(redisClient);
    // await setAsync(`${sessionID}:conversionTime`, Date.now());

    console.log('session:', { conversionCount });
    console.log('sessionID:', sessionID);

    next();
  } catch (error) {
    console.error('Error enforcing limitations:', error);
    res.status(500).send('Internal server error.');
  }
};

module.exports = enforceLimitations;
