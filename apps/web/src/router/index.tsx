import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../layouts/Layout';
import DrawingPage from '../pages/Drawing';

const LoginPage = lazy(() => import('../pages/Login'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const AuthPage = lazy(() => import('../pages/Login/AuchCallback'));
const ProjectPage = lazy(() => import('../pages/Project'));
const Flow = lazy(() => import('../pages/Flow'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="projects" replace /> },
      {
        path: 'projects',
        element: (
          <Suspense fallback={null}>
            <ProjectPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: 'flow',
    element: (
      <Suspense fallback={null}>
        <Flow />
      </Suspense>
    ),
  },
  {
    path: '/drawing',
    element: (
      <Suspense fallback={null}>
        <DrawingPage />
      </Suspense>
    ),
  },

  {
    path: 'login',
    element: (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    path: 'auth',
    element: (
      <Suspense fallback={null}>
        <AuthPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={null}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
