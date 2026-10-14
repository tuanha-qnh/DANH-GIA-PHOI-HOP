/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar, NavTab } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';
import { ForcedPasswordChangeModal } from './components/ForcedPasswordChangeModal';
import { DashboardOverview } from './components/DashboardOverview';
import { UnitManagement } from './components/UnitManagement';
import { UserManagement } from './components/UserManagement';
import { CampaignManagement } from './components/CampaignManagement';
import { EvaluationForm } from './components/EvaluationForm';
import { ReportStatistics } from './components/ReportStatistics';
import { SettingsModule } from './components/SettingsModule';
import { D1ConfigModule } from './components/D1ConfigModule';

const MainLayout: React.FC = () => {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'ADMIN';
  const isReportViewer = currentUser?.role === 'REPORT_VIEWER';

  // Default starting tab: Dashboard for admin & report viewer, Evaluate for regular user
  const [currentTab, setCurrentTab] = useState<NavTab>(
    isAdmin || isReportViewer ? 'dashboard' : 'evaluate'
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Auto redirect REPORT_VIEWER if on unauthorized tab (allow dashboard, reports, settings)
  React.useEffect(() => {
    if (isReportViewer && currentTab !== 'dashboard' && currentTab !== 'reports' && currentTab !== 'settings') {
      setCurrentTab('dashboard');
    }
  }, [isReportViewer, currentTab]);

  // If user is not logged in, show mandatory login screen
  if (!currentUser) {
    return <LoginModal />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Forced Password Change Modal for first-time login */}
      <ForcedPasswordChangeModal />

      {/* Top Navigation Bar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        onNavigateToSettings={() => setCurrentTab('settings')}
        onNavigateToD1={() => {
          if (isAdmin) setCurrentTab('d1-config');
        }}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Workspace Body */}
        <main className="flex-1 lg:pl-64 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {currentTab === 'dashboard' && (isAdmin || isReportViewer || currentUser?.canViewReports) && (
            <DashboardOverview onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}

          {currentTab === 'units' && isAdmin && <UnitManagement />}

          {currentTab === 'users' && isAdmin && <UserManagement />}

          {currentTab === 'campaigns' && isAdmin && (
            <CampaignManagement initialStep="step1_campaigns" />
          )}

          {currentTab === 'campaign-units' && isAdmin && (
            <CampaignManagement initialStep="step2_units" />
          )}

          {currentTab === 'campaign-criteria' && isAdmin && (
            <CampaignManagement initialStep="step3_criteria" />
          )}

          {currentTab === 'evaluate' && !isReportViewer && <EvaluationForm />}

          {currentTab === 'reports' && (
            (isAdmin || currentUser.canViewReports || isReportViewer) ? (
              <ReportStatistics />
            ) : (
              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                <p className="font-bold text-slate-800">Không có quyền truy cập</p>
                <p className="text-xs mt-1">Đồng chí chưa được cấp quyền xem Báo cáo Thống kê.</p>
              </div>
            )
          )}

          {currentTab === 'd1-config' && isAdmin && <D1ConfigModule />}

          {currentTab === 'settings' && <SettingsModule />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
