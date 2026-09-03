import express from 'express';
import authController from '../controllers/auth.controllers.js';
import protect  from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

const router = express.Router();

router.post('/register', registerLimiter, validate(registerSchema), authController.registerUser);
router.post('/login', authLimiter, validate(loginSchema), authController.loginUser);
router.get('/me', protect, authController.getMe);
router.post('/logout', protect, authController.logoutUser);

export default router;
