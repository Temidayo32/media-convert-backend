const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController')
const enforceLimitations = require('../Middleware/enforceLimitations')
const verifyToken = require('../Middleware/verifyToken')

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

router.use('/convertcloud', (req, res, next) => {
    next();
});

// Route for rendering the index page
router.get('/', (req, res) => {
    res.render('index.ejs');
});

// Routes for unsigned users
router.post('/convert',  enforceLimitations, upload.array('video'), videoController.convert);
router.post('/convertcloud', enforceLimitations, upload.single('video'), videoController.convertCloud);

// Routes for signed-up users
router.post('/signed/convert', verifyToken, upload.array('video'), videoController.convert);
router.post('/signed/convertcloud', verifyToken, upload.single('video'), videoController.convertCloud);



module.exports = router;
