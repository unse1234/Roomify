import multer from 'multer';

const storage = multer.memoryStorage(); // file disk pe nahi, RAM mein

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only jpg, png, webp images are allowed'));
    }
    cb(null, true);
  },
});

export default upload;