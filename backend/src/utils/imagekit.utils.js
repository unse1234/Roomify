import imagekit from '../config/imagekit.js';
import { externalServiceError } from '../errors/AppError.js';

export const uploadImagesToImageKit = async (files) => {
  const uploads = await Promise.allSettled(
    files.map((file) => imagekit.upload({
      file: file.buffer,
      fileName: file.originalname,
      folder: '/roomify/properties',
    }))
  );

  const failedUpload = uploads.find((result) => result.status === 'rejected');
  const successfulImages = uploads
    .filter((result) => result.status === 'fulfilled')
    .map(({ value }) => ({
      url: value.url,
      publicId: value.fileId,
    }));

  if (failedUpload) {
    await deleteImagesFromImageKit(successfulImages).catch(() => undefined);
    throw externalServiceError(
      'We could not upload the images. Please try again.',
      failedUpload.reason,
    );
  }

  return successfulImages;
};

export const deleteImagesFromImageKit = async (images) => {
  try {
    await Promise.all(images.map((img) => imagekit.deleteFile(img.publicId)));
  } catch (error) {
    throw externalServiceError('We could not remove the images. Please try again.', error);
  }
};
