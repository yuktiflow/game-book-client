import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaReceipt, FaUserPlus, FaClipboardList } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Import Components
import SidebarNav from "./components/SidebarNav";
import MobileHeader from "./components/MobileHeader";
import DashboardOverview from "./components/DashboardOverview";
import ProfilePage from "./components/ProfilePage";
import LoadingSpinner from "./components/LoadingSpinner";
import CustomerTab from "./CustomerTab";
import Report from "./Report";
import ReceiptForm from "./ReceiptForm";
import ViewReceipts from "./ViewReceipts";
import ShortcutTab from "./ShortcutTab";

// Import Utils
import { API_BASE_URI } from "./utils/constants";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // UI State
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState("dashboard");
  
  // Data State
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalReceipts: 0,
    totalCustomers: 0,
    monthlyIncome: 0,
    monthlyProfit: 0,
    recentReceipts: [],
    topCustomers: []
  });

  // Detect current section from URL
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/createReceipt')) {
      setCurrentSection('createReceipt');
    } else if (path.includes('/viewReceipts')) {
      setCurrentSection('viewReceipts');
    } else if (path.includes('/customers')) {
      setCurrentSection('customers');
    } else if (path.includes('/reports')) {
      setCurrentSection('reports');
    } else if (path.includes('/shortcuts')) {
      setCurrentSection('shortcuts');
    } else if (path.includes('/profile')) {
      setCurrentSection('profile');
    } else if (path === '/vendor' || path.includes('/dashboard')) {
      setCurrentSection('dashboard');
    }
  }, [location.pathname]);

  // Toggle handlers
  const toggleSidebar = () => setCollapsed(!collapsed);
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    window.location.replace("/");
  };

  // Menu click handler
  const handleMenuClick = (key) => {
    if (key === "logout") {
      handleLogout();
    } else {
      const routes = {
        dashboard: '/vendor/dashboard',
        profile: '/vendor/profile',
        createReceipt: '/vendor/createReceipt',
        viewReceipts: '/vendor/viewReceipts',
        customers: '/vendor/customers',
        shortcuts: '/vendor/shortcuts',
        reports: '/vendor/reports'
      };
      
      if (routes[key]) {
        navigate(routes[key]);
      }
    }
    if (isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  // Profile update handler
  const handleProfileUpdate = (updatedVendor) => {
    setVendor(updatedVendor);
    localStorage.setItem("vendorProfile", JSON.stringify(updatedVendor));
  };

  // Activity icon helper
  const getActivityIcon = (type) => {
    switch (type) {
      case "NEW_RECEIPT": return <FaReceipt className="text-blue-500" />;
      case "NEW_CUSTOMER": return <FaUserPlus className="text-green-500" />;
      default: return <FaClipboardList className="text-gray-500" />;
    }
  };

  // Fetch data on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "vendor") {
      window.location.replace("/");
      return;
    }

    const fetchVendorProfile = async () => {
      try {
        const response = await fetch(`${API_BASE_URI}/api/vendors/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch profile.");
        const data = await response.json();
        setVendor(data.vendor);
        localStorage.setItem("vendorProfile", JSON.stringify(data.vendor));
      } catch (error) {
        toast.error(error.message);
      }
    };

    const fetchRecentActivities = async () => {
      try {
        const response = await fetch(`${API_BASE_URI}/api/activities/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to fetch activities.");
        const data = await response.json();
        setRecentActivities(data.activities); 
      } catch (error) {
        console.error(error);
        toast.error("Could not load recent activities.");
      }
    };

    const fetchDashboardStats = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };

        const [receiptsRes, customersRes, monthlyRes] = await Promise.all([
          fetch(`${API_BASE_URI}/api/receipts`, { headers }),
          fetch(`${API_BASE_URI}/api/customers`, { headers }),
          fetch(`${API_BASE_URI}/api/reports/summary/monthly`, { headers })
        ]);

        const receiptsData = await receiptsRes.json();
        const customersData = await customersRes.json();
        const monthlyData = await monthlyRes.json();

        const recentReceipts = receiptsData.receipts?.slice(0, 5) || [];

        const balancesRes = await fetch(`${API_BASE_URI}/api/reports/customers/all-balances`, { headers });
        const balancesData = await balancesRes.json();
        const topCustomers = balancesData.slice(0, 5);

        setDashboardStats({
          totalReceipts: receiptsData.receipts?.length || 0,
          totalCustomers: customersData.customers?.length || 0,
          monthlyIncome: monthlyData.totalIncome || 0,
          monthlyProfit: monthlyData.totalProfit || 0,
          recentReceipts,
          topCustomers
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error("Could not load dashboard statistics.");
      }
    };

    const loadDashboardData = async () => {
      setLoading(true);
      await Promise.all([
        fetchVendorProfile(),
        fetchRecentActivities(),
        fetchDashboardStats()
      ]);
      setLoading(false);
    };

    loadDashboardData();
  }, []);

  // Loading state
  if (loading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Sidebar Navigation */}
      <SidebarNav
        collapsed={collapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        currentSection={currentSection}
        vendor={vendor}
        onToggleSidebar={toggleSidebar}
        onToggleMobileMenu={toggleMobileMenu}
        onMenuClick={handleMenuClick}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader vendor={vendor} onToggleMobileMenu={toggleMobileMenu} />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {currentSection === "dashboard" && (
              <DashboardOverview
                vendor={vendor}
                dashboardStats={dashboardStats}
                recentActivities={recentActivities}
                getActivityIcon={getActivityIcon}
                onMenuClick={handleMenuClick}
              />
            )}

            {currentSection === "profile" && (
              <ProfilePage vendor={vendor} onProfileUpdate={handleProfileUpdate} />
            )}

            {currentSection === "customers" && <CustomerTab />}
            {currentSection === "createReceipt" && <ReceiptForm businessName={vendor?.businessName} />}
            {currentSection === "viewReceipts" && <ViewReceipts />}
            {currentSection === "shortcuts" && <ShortcutTab businessName={vendor?.businessName} />}
            {currentSection === "reports" && <Report />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;