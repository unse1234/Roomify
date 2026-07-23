import imagekit from '../config/imagekit.js';

export const uploadImagesToImageKit = async (files) => {
  const uploads = files.map((file) =>
    imagekit.upload({
      file:     file.buffer,           // buffer from multer memory storage
      fileName: file.originalname,
      folder:   '/roomify/properties',
    })
  );

  const results = await Promise.all(uploads);

  return results.map((result) => ({
    url:      result.url,
    publicId: result.fileId, // imagekit ka fileId — delete ke liye zaroor store karo
  }));
};

export const deleteImagesFromImageKit = async (images) => {
  await Promise.all(
    images.map((img) => imagekit.deleteFile(img.publicId))
  );
};