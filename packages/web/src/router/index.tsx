import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../layouts/Layout';
import Drawing from '../pages/Drawing';
import Login from '../pages/Login';
import AuthCallback from '../pages/Login/AuchCallback';
import NotFound from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Navigate to="/drawing" replace />,
      },
      {
        path: 'drawing',
        element: <Drawing />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth',
    element: <AuthCallback />,
  },
]);
