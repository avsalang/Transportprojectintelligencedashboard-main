import { lazy } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { CRSLayout } from './components/CRSLayout';
import { CRSOverview } from './pages/CRSOverview';

const CRSDonorProfile = lazy(() => import('./pages/CRSDonorProfile').then((module) => ({ default: module.CRSDonorProfile })));
const CRSRecipientProfile = lazy(() => import('./pages/CRSRecipientProfile').then((module) => ({ default: module.CRSRecipientProfile })));
const CRSDecade = lazy(() => import('./pages/CRSDecade').then((module) => ({ default: module.CRSDecade })));
const ThemeExplorer = lazy(() => import('./pages/ThemeExplorer').then((module) => ({ default: module.ThemeExplorer })));
const About = lazy(() => import('./pages/About').then((module) => ({ default: module.About })));

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
      { path: 'themes', Component: ThemeExplorer },
      { path: 'about', Component: About },
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
