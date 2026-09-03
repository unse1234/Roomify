import ImageKit from 'imagekit';
import { config } from './config.js';

const imagekit = new ImageKit({
  publicKey: config.IMAGEKIT.publicKey,
  privateKey: config.IMAGEKIT.privateKey,
  urlEndpoint: config.IMAGEKIT.urlEndpoint,
});

export default imagekit;
