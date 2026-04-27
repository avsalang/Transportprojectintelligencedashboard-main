import { createHashRouter, Navigate } from 'react-router';
import { CRSLayout } from './components/CRSLayout';
import { CRSOverview } from './pages/CRSOverview';
import { CRSDonorProfile } from './pages/CRSDonorProfile';
import { CRSRecipientProfile } from './pages/CRSRecipientProfile';
import { CRSDecade } from './pages/CRSDecade';

// Hash routing keeps the static build portable across hosts like GitHub Pages.
export const router = createHashRouter([
  {
    path: '/',
    Component: CRSLayout,
    children: [
      { index: true, Component: CRSOverview },
      { path: 'donor-profile', Component: CRSDonorProfile },
      { path: 'recipient-profile', Component: CRSRecipientProfile },
      { path: 'un-decade', Component: CRSDecade },
    ],
  },
  {
    path: '/crs/*',
    Component: () => <Navigate to="/" replace />,
  },
  {
    path: '*',
    Component: () => <Navigate to="/" replace />,
  },
]);
