import express from 'express';
const { registerUser, loginUser, getMe } = require('../controllers/auth.controller');
import protect  from ('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

module.exports = router;