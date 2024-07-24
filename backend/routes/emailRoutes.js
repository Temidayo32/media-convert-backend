const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');

  
  // Define the route that uses the middleware
  router.post('/sendEmail', emailController.email);
  
  
  module.exports = router;