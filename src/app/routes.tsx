import { createHashRouter, Navigate } from 'react-router';
import { CRSLayout } from './components/CRSLayout';
import { CRSOverview } from './pages/CRSOverview';
import { CRSGeography } from './pages/CRSGeography';
import { CRSFlows } from './pages/CRSFlows';
import { CRSProfiles } from './pages/CRSProfiles';
import { CRSInsights } from './pages/CRSInsights';
import { CRSFullList } from './pages/CRSFullList';

// Hash routing keeps the static build portable across hosts like GitHub Pages.
export const router = createHashRouter([
  {
    path: '/',
    Component: CRSLayout,
    children: [
      { index: true, Component: CRSOverview },
      { path: 'geography', Component: CRSGeography },
      { path: 'flows', Component: CRSFlows },
      { path: 'profiles', Component: CRSProfiles },
      { path: 'insights', Component: CRSInsights },
      { path: 'list', Component: CRSFullList },
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
