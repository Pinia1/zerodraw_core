import { axios, AxiosError, InternalAxiosRequestConfig } from '@monorepo/common';
import { message } from 'antd';

const request = axios.create({
  baseURL: 'http://localhost:3008',
  timeout: 10000,
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
    const { code, data, message } = response.data;
    if (code === 200) {
      return data;
    } else {
      return Promise.reject(new Error(message || '请求失败'));
    }
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          message.error('登录失败');
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;

        default:
          console.error(`❌ 请求失败: ${status}`, data);
      }
    }
    message.error('请求失败');
    return Promise.reject(error);
  }
);

export default request;
