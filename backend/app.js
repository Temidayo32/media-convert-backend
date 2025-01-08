const express = require('express');
const path = require('path');
const cors = require('cors'); 
const http = require('http');
const { Server: SocketServer } = require("socket.io");
const videoRoutes = require('./routes/videoRoutes');
const imageRoutes = require('./routes/imageRoutes');
const emailRoutes = require('./routes/emailRoutes');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./Middleware/redisClient');
const cookieParser = require('cookie-parser');
const { startCleanupJob } = require('./services/google/storeGarbage');
const { cleanAnonymousSession } = require('./services/google/anonymousUser');
const { cleanupAWS } = require('./services/aws/awsGarbage');
const logger = require('./Middleware/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.BASE_URL
      : 'http://localhost:3000',
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.status(200).send('Application is healthy');
});

const corsMiddleware = async (req, res, next) => {
  try {
    // Check if origin is allowed
    const allowedOrigins = [
      "https://convertquickly.com",
      "https://mediaconvert.vercel.app",
      "http://localhost:3000",
    ];

    const origin = req.header('Origin');
    console.log("Received Origin:", origin);

    if (allowedOrigins.includes(origin)) {
      // Apply the CORS headers dynamically to the response
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Authorization, Is-Anonymous, User-Id, Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Expose-Headers', 'set-cookie');
      
      next();  // Proceed to the next middleware if origin is allowed
    } else {
      throw new Error(`Not allowed by CORS: ${origin}`);
    }
  } catch (error) {
    // Set CORS headers for the error response
    res.header('Access-Control-Allow-Origin', req.header('Origin'));
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Authorization, Is-Anonymous, User-Id, Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Expose-Headers', 'set-cookie');

    res.status(403).send(error.message);  // Block the request if not allowed
  }
};

// Apply the CORS middleware
app.use(corsMiddleware);

app.use((req, res, next) => {
  req.io = io;
  next();
});


// Session middleware with Redis store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production' ? true : false, // Ensure secure cookies in production
    httpOnly: true,
    sameSite: 'strict',
  }
}));


// Start multiple instances of workers
const numLocalWorkers = 3; 
const numCloudWorkers = 3; 
const numImageLocalWorkers = 3; 
const numImageCloudWorkers = 3;

for (let i = 0; i < numLocalWorkers; i++) {
    require('./workers/localworker')(io);
}

for (let i = 0; i < numCloudWorkers; i++) {
    require('./workers/cloudworker')(io);
}

for (let i = 0; i < numImageLocalWorkers; i++) {
  require('./workers/imageLocalWorker')(io);
}

for (let i = 0; i < numImageCloudWorkers; i++) {
  require('./workers/imageCloudWorker')(io);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

//scheduled tasks
startCleanupJob();
cleanupAWS();
cleanAnonymousSession();
// startStoreCleanup();

app.use('/video', videoRoutes);
app.use('/image', imageRoutes);
app.use('/email', emailRoutes);

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({ error: err.message });
});

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
