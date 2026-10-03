import type { ReactNode } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { NewReelPage } from '@/pages/NewReelPage';
import { ReelStudioPage } from '@/pages/ReelStudioPage';
import { RenderRoutePage } from '@/pages/RenderRoutePage';

export interface RouteConfig {
  name: string;
  path: string;
  element: ReactNode;
  visible?: boolean;
  public?: boolean;
}

export const routes: RouteConfig[] = [
  {
    name: 'Dashboard',
    path: '/',
    element: (
      <MainLayout>
        <DashboardPage />
      </MainLayout>
    ),
    public: true,
  },
  {
    name: 'Create Reel',
    path: '/new',
    element: (
      <MainLayout>
        <NewReelPage />
      </MainLayout>
    ),
    public: true,
  },
  {
    name: 'Reel Studio',
    path: '/reel/:id',
    element: (
      <MainLayout>
        <ReelStudioPage />
      </MainLayout>
    ),
    public: true,
  },
  {
    name: 'Playwright Render Route',
    path: '/render/:reelId/:sceneIndex',
    element: <RenderRoutePage />,
    public: true,
  },
];
