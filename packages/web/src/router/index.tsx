import { createBrowserRouter } from 'react-router-dom';
import Layout from '../layouts/Layout';
import Drawing from '../pages/Drawing';
import NotFound from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Drawing />,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
