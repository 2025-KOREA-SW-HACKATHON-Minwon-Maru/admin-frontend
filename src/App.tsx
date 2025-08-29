import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { ResultsManagement } from './components/dashboard/ResultsManagement';
import { CBTManagement } from './components/dashboard/CBTManagement';
import { ResourceManagement } from './components/dashboard/ResourceManagement';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';

interface User {
  id: string;
  name: string;
  email: string;
}

type ActiveTab = 'home' | 'results' | 'tests' | 'resources' | 'payment';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  
  // Default authenticated user - no login required
  const user: User = {
    id: '1',
    name: 'John Adebayo',
    email: 'john.adebayo@school.edu.ng'
  };

  const handleLogout = () => {
    toast.success('Logged out successfully.');
    // In a real app, this would redirect to login
    // For now, just show a toast message
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as ActiveTab);
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'home':
        return <DashboardHome teacherName={user.name} />;
      case 'results':
        return <ResultsManagement />;
      case 'tests':
        return <CBTManagement />;
      case 'resources':
        return <ResourceManagement />;
      case 'payment':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-gray-900">Payment Management</h1>
            <p className="text-gray-600 mt-1">Monitor student payments and Remita integration</p>
            <div className="mt-8 p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Payment management features coming soon...</p>
            </div>
          </div>
        );
      default:
        return <DashboardHome teacherName={user.name} />;
    }
  };

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onLogout={handleLogout}
        teacherName={user.name}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {renderMainContent()}
      </div>

      {/* Toast Notifications */}
      <Toaster position="top-right" />
    </div>
  );
}