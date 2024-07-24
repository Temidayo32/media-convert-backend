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
    origin: 'http://localhost:3000',
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});


const corsOptions = {
  origin: [
    'http://localhost:3000',
  ],
  credentials: true,
  exposedHeaders : ['set-cookie']
};


app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());



// Session middleware with Redis store
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret key', //process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: false,
    // secure: process.env.NODE_ENV === 'production', // Ensure secure cookies in production
    httpOnly: true,
    sameSite: 'strict',
  }
}));

app.use((req, res, next) => {
  const session = req.session;
  const sessionID  = req.cookies['connect.sid']
  const cookies = req.cookies;
  // console.log('Incoming Cookies:', cookies);
  // console.log('Incoming session:', session);
  // console.log('Incoming sessionID:', sessionID);
  next();
});


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



server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
