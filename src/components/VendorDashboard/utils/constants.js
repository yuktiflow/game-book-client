// Define the base API URL
export const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

// Menu items configuration
export const MENU_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "FaTachometerAlt" },
  { key: "profile", label: "Profile", icon: "FaUserCircle" },
  { key: "createReceipt", label: "Create Receipt", icon: "FaFileInvoiceDollar" },
  { key: "viewReceipts", label: "View Receipts", icon: "FaClipboardList" },
  { key: "customers", label: "Customers", icon: "FaUser" },
  { key: "reports", label: "Reports", icon: "FaCoins" },
  { key: "logout", label: "Logout", icon: "FaSignOutAlt" },
];

// Route mappings
export const ROUTES = {
  dashboard: '/vendor/dashboard',
  profile: '/vendor/profile',
  createReceipt: '/vendor/createReceipt',
  viewReceipts: '/vendor/viewReceipts',
  customers: '/vendor/customers',
  reports: '/vendor/reports'
};
