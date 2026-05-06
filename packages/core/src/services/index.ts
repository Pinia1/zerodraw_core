import { axios, AxiosError, InternalAxiosRequestConfig } from '@zeroDraw/common';
import { message } from 'antd';

const request = axios.create({
  //@ts-ignore
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 1000 * 60 * 20,
  headers: {
    'Content-Type': 'application/json',
  },
});

request.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

request.interceptors.response.use(
  (response) => {
    const { data, code, message: msg } = response.data;
    if (code !== 1000) {
      message.error(msg);
    }
    return data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 429:
          message.error((data as { message: string }).message);
          break;
        case 401:
          message.error('登录失败');
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default request;
