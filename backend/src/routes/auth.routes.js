import express from 'express';
import authController from '../controllers/auth.controllers.js';
import protect  from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logoutUser);

export default router;