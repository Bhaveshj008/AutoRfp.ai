import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import RfpListPage from './pages/RfpListPage';
import RfpCreatePage from './pages/RfpCreatePage';
import RfpDetailPage from './pages/RfpDetailPage';
import RfpProposalsPage from './pages/RfpProposalsPage';
import RfpComparePage from './pages/RfpComparePage';
import VendorsPage from './pages/VendorsPage';
import NotFound from './pages/NotFound';

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardPage />,
  },
  {
    path: '/rfps',
    element: <RfpListPage />,
  },
  {
    path: '/rfps/new',
    element: <RfpCreatePage />,
  },
  {
    path: '/rfps/:id',
    element: <RfpDetailPage />,
  },
  {
    path: '/rfps/:id/proposals',
    element: <RfpProposalsPage />,
  },
  {
    path: '/rfps/:id/compare',
    element: <RfpComparePage />,
  },
  {
    path: '/vendors',
    element: <VendorsPage />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
