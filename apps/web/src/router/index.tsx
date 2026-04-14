import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../layouts/Layout';

const DrawingPage = lazy(() => import('../pages/Drawing'));
const LoginPage = lazy(() => import('../pages/Login'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const AuthPage = lazy(() => import('../pages/Login/AuchCallback'));
const ProjectPage = lazy(() => import('../pages/Project'));
const ListPage = lazy(() => import('../pages/List'));
const PlanPage = lazy(() => import('../pages/Plan'));
const PaymentResultPage = lazy(() => import('../pages/PaymentResult'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        element: (
          <Suspense fallback={null}>
            <ProjectPage />
          </Suspense>
        ),
        children: [
          { index: true, element: <Navigate to="list" replace /> },
          {
            path: 'list',
            element: (
              <Suspense fallback={null}>
                <ListPage />
              </Suspense>
            ),
          },
          {
            path: 'plan',
            element: (
              <Suspense fallback={null}>
                <PlanPage />
              </Suspense>
            ),
          },
          {
            path: 'payment/result',
            element: (
              <Suspense fallback={null}>
                <PaymentResultPage />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/drawing',
    element: <Layout />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={null}>
            <DrawingPage />
          </Suspense>
        ),
      },
    ],
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
