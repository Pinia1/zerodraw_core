import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from '../layouts/Layout';
import DrawingPage from '../pages/Drawing';

const LoginPage = lazy(() => import('../pages/Login'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));
const AuthPage = lazy(() => import('../pages/Login/AuchCallback'));
const ProjectPage = lazy(() => import('../pages/Project'));
const Flow = lazy(() => import('../pages/Flow'));
const StudioPage = lazy(() => import('../pages/Studio'));
const LandingPage = lazy(() => import('../pages/Landing'));
const AdminAgentLayout = lazy(() => import('../pages/Admin/Agent/layout'));
const AdminAgentOverview = lazy(() => import('../pages/Admin/Agent/Overview'));
const AdminAgentRuntime = lazy(() => import('../pages/Admin/Agent/Runtime'));
const AdminAgentSessions = lazy(() => import('../pages/Admin/Agent/Sessions'));
const AdminAgentSessionDetail = lazy(() => import('../pages/Admin/Agent/SessionDetail'));
const AdminAgentUsage = lazy(() => import('../pages/Admin/Agent/Usage'));

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
    path: '/studio',
    element: (
      <Suspense fallback={null}>
        <StudioPage />
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
    path: 'landing',
    element: (
      <Suspense fallback={null}>
        <LandingPage />
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
