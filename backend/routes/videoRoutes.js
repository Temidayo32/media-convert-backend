const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Middleware to log the request object
router.use('/convert', (req, res, next) => {
    next();
});

// Route for rendering the index page
router.get('/', (req, res) => {
    res.render('index.ejs');
});

// Route for handling video conversion
router.post('/convert', upload.single('video'), videoController.convert);

module.exports = router;
