import { useState } from "react";
import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { useCurrency } from "./context/CurrencyContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SalesEntryPage from "./pages/SalesEntryPage";
import ExpensesPage from "./pages/ExpensesPage";
import BoxesPage from "./pages/BoxesPage";
import TransfersPage from "./pages/TransfersPage";
import ReportsPage from "./pages/ReportsPage";
import EmployeesPage from "./pages/EmployeesPage";
import UsersPage from "./pages/UsersPage";
import SettingsPage from "./pages/SettingsPage";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

export default function App() {
  const { isLoggedIn, user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isLoggedIn) return <LoginPage />;

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  return (
    <div className="min-h-screen bg-gray-50 rtl">
      <TopBar onToggleSidebar={toggleSidebar} />
      
      <div className="flex">
        <Sidebar 
          user={user} 
          onLogout={logout} 
          isOpen={sidebarOpen} 
          onClose={closeSidebar} 
        />
        
        <main className="flex-1 lg:mr-72">
          <div className="p-4 lg:p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sales" element={<SalesEntryPage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/boxes" element={<BoxesPage />} />
              <Route path="/transfers" element={<TransfersPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
