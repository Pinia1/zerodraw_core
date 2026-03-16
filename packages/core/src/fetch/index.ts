import {
  httpDeleteLibOutput,
  httpGetLibOutputs,
  httpNanobananaGenerate,
} from '../services/generate';

const getEnv = (key: 'VITE_API_URL' | 'VITE_IMAGE_THUMBNAIL' | 'VITE_IMAGE_FILE') => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return process.env[key];
  }
  return '';
};

class Fetch {
  static apiUrl = getEnv('VITE_API_URL');
  static thumbnailUrl = getEnv('VITE_IMAGE_THUMBNAIL');
  static fileUrl = getEnv('VITE_IMAGE_FILE');

  static getLibOutputs = httpGetLibOutputs;
  static deleteLibOutput = httpDeleteLibOutput;
  static nanobananaGenerate = httpNanobananaGenerate;
}

export default Fetch;
