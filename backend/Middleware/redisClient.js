const redis = require('redis');
const redisClient = redis.createClient({
  url: 'redis://localhost:6379', 
  legacyMode: true
});

redisClient.connect().catch(console.error);

redisClient.on('connect', () => {
    console.log('Connected to Redis');
  });
  
redisClient.on('error', (err) => {
console.error('Redis error:', err);
});

module.exports = redisClient;
