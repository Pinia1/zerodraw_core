import { axios, AxiosError, InternalAxiosRequestConfig } from '@monorepo/common';
import { message } from 'antd';
import { useUserStore } from '../store/useUserStore';

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
