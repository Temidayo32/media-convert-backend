const express = require('express');
const path = require('path');
const cors = require('cors'); 
const http = require('http');
const { Server: SocketServer } = require("socket.io");
const videoRoutes = require('./routes/videoRoutes');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redisClient = require('./Middleware/redisClient');
const cookieParser = require('cookie-parser');
const logger = require('./Middleware/logger');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
  }
});

app.use((req, res, next) => {
  req.io = io;
  next();
});

const corsOptions = {
  origin: [
    'http://localhost:3000',
    // 'https://9d34-102-215-57-153.ngrok-free.app'
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
    // genid: (req) => {
    //   const newId = require('crypto').randomBytes(16).toString('hex');
    //   logger.info(`Generated new session ID: ${newId}`);
    //   return newId;
    // }
  }
}));

app.use((req, res, next) => {
  const session = req.session;
  const sessionID  = req.cookies['connect.sid']
  // const cookies = req.cookies;
  console.log('Incoming Cookies:', cookies);
  console.log('Incoming session:', session);
  console.log('Incoming sessionID:', sessionID);
  next();
});



// app.use((req, res, next) => {
//   if (!req.session.isNew) {
//     logger.info(`Existing session ID: ${req.sessionID}`);
//   }
//   next();
// });


// Start multiple instances of workers
const numLocalWorkers = 3; 
const numCloudWorkers = 3; 

for (let i = 0; i < numLocalWorkers; i++) {
    require('./workers/localworker')(io);
}

for (let i = 0; i < numCloudWorkers; i++) {
    require('./workers/cloudworker')(io);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Use video routes
app.use('/', videoRoutes);

server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
