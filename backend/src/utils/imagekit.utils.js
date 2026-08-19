import imagekit from '../config/imagekit.js';
import { externalServiceError } from '../errors/AppError.js';

export const uploadImagesToImageKit = async (files) => {
  try {
    const uploads = files.map((file) =>
      imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: '/roomify/properties',
      })
    );

    const results = await Promise.all(uploads);

    return results.map((result) => ({
      url: result.url,
      publicId: result.fileId,
    }));
  } catch (error) {
    throw externalServiceError('We could not upload the images. Please try again.', error);
  }
};

export const deleteImagesFromImageKit = async (images) => {
  try {
    await Promise.all(images.map((img) => imagekit.deleteFile(img.publicId)));
  } catch (error) {
    throw externalServiceError('We could not remove the images. Please try again.', error);
  }
};
