const express = require('express');
const path = require('path');
const cors = require('cors'); 
const http = require('http');
const { Server: SocketServer } = require("socket.io");
const videoRoutes = require('./routes/videoRoutes');

const app = express();
const PORT = process.env.PORT || 8000;
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: '*',
  }
});



app.use(cors()); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
