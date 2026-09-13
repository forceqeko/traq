import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { PeriodFilterProvider } from '@/contexts/PeriodFilterContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';

export default function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ErrorBoundary>
      <PeriodFilterProvider>
        <div className="dashboard-container">
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />
          <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
            <Header pageTitle="MONITORING DATA KARANTINA" />
            <main className="page-body">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </PeriodFilterProvider>
    </ErrorBoundary>
  );
}

