import {
  httpDeleteLibOutput,
  httpGetFileUrl,
  httpGetLibOutputs,
  httpGetLibRunning,
  httpGetTask,
  httpNanobananaGenerate,
  httpUpload,
} from '../services/generate';

const getEnv = (key: 'VITE_API_URL' | 'VITE_IMAGE_THUMBNAIL' | 'VITE_IMAGE_FILE' | 'VITE_R2_URL') => {
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
  static r2Url = getEnv('VITE_R2_URL');

  static getLibOutputs = httpGetLibOutputs;
  static deleteLibOutput = httpDeleteLibOutput;
  static nanobananaGenerate = httpNanobananaGenerate;
  static getLibRunning = httpGetLibRunning;
  static httpGetTask = httpGetTask;
  static httpUploadImage = httpUpload;
  static httpGetFileUrl = httpGetFileUrl;
}

export default Fetch;
