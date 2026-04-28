import { axios, AxiosError, InternalAxiosRequestConfig } from '@zeroDraw/common';
import { message } from 'antd';
import { useUserStore } from '../store/useUserStore';

const request = axios.create({
  //@ts-ignore
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 1000 * 60 * 5,
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
      const { status } = error.response;

      switch (status) {
        case 429:
          message.error('请求过于频繁，请稍后再试');
          break;
        case 401:
          message.error('登录失败');
          setTimeout(() => {
            useUserStore.getState().setUser(null);
            window.location.href = '/login';
          }, 1000);
          break;
      }
    }
    return Promise.reject(error);
  }
);

export default request;
