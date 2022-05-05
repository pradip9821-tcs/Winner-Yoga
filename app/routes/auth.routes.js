const express = require('express');
const cors = require('cors');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.Register);

router.post('/login', authController.Login);

router.post('/refresh-token', authController.refreshToken);

router.post('/forgot-password', authController.forgotPassword);

module.exports = router;