import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

const HomePage = lazy(() => import('../pages/Home'));
const LoginPage = lazy(() => import('../pages/Login'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const StudioPage = lazy(() => import('../pages/Studio'));
const AdminAgentLayout = lazy(() => import('../pages/Admin/Agent/layout'));
const AdminAgentOverview = lazy(() => import('../pages/Admin/Agent/Overview'));
const AdminAgentRuntime = lazy(() => import('../pages/Admin/Agent/Runtime'));
const AdminAgentSessions = lazy(() => import('../pages/Admin/Agent/Sessions'));
const AdminAgentSessionDetail = lazy(() => import('../pages/Admin/Agent/SessionDetail'));
const AdminAgentUsage = lazy(() => import('../pages/Admin/Agent/Usage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={null}>
        <HomePage />
      </Suspense>
    ),
  },
  {
    path: '/studio',
    element: (
      <Suspense fallback={null}>
        <StudioPage />
      </Suspense>
    ),
  },
  {
    path: '/admin/agent',
    element: (
      <Suspense fallback={null}>
        <AdminAgentLayout />
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      {
        path: 'overview',
        element: (
          <Suspense fallback={null}>
            <AdminAgentOverview />
          </Suspense>
        ),
      },
      {
        path: 'runtime',
        element: (
          <Suspense fallback={null}>
            <AdminAgentRuntime />
          </Suspense>
        ),
      },
      {
        path: 'sessions',
        element: (
          <Suspense fallback={null}>
            <AdminAgentSessions />
          </Suspense>
        ),
      },
      {
        path: 'sessions/:id',
        element: (
          <Suspense fallback={null}>
            <AdminAgentSessionDetail />
          </Suspense>
        ),
      },
      {
        path: 'usage',
        element: (
          <Suspense fallback={null}>
            <AdminAgentUsage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={null}>
        <LoginPage />
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
