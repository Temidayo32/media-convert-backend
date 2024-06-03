const express = require('express');
const authenticateWithGoogle = require('../auth/authenticateWithGoogle');
const authenticateWithDropbox = require('../auth/authenticateWithDropbox');

const router = express.Router();

router.post('/google', async (req, res) => {
    console.log('request received')
  const { code } = req.body;
  try {
    const tokens = await authenticateWithGoogle(code);
    res.json(tokens);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.post('/dropbox', async (req, res) => {
  const { code } = req.body;
  try {
    const data = await authenticateWithDropbox(code);
    res.json(data);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

module.exports = router;
