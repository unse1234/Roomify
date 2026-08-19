import multer from 'multer';
import { validationError } from '../errors/AppError.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(validationError({ images: 'Only jpg, png, webp images are allowed.' }));
    }
    cb(null, true);
  },
});

export default upload;
