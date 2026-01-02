import React from "react";
import {
  FaTachometerAlt,
  FaUserCircle,
  FaSignOutAlt,
  FaFileInvoiceDollar,
  FaClipboardList,
  FaBars,
  FaUser,
  FaCoins,
  FaTimes,
  FaBuilding,
  FaBolt,
} from "react-icons/fa";

const SidebarNav = ({
  collapsed,
  isMobileMenuOpen,
  currentSection,
  vendor,
  onToggleSidebar,
  onToggleMobileMenu,
  onMenuClick,
  onLogout,
}) => {
  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
    { key: "profile", label: "Profile", icon: <FaUserCircle /> },
    { key: "createReceipt", label: "Create Receipt", icon: <FaFileInvoiceDollar /> },
    { key: "viewReceipts", label: "View Receipts", icon: <FaClipboardList /> },
    { key: "customers", label: "Customers", icon: <FaUser /> },
    { key: "shortcuts", label: "Shortcuts", icon: <FaBolt /> },
    { key: "reports", label: "Reports", icon: <FaCoins /> },
  ];

  return (
    <>
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={onToggleMobileMenu}
        ></div>
      )}

      {/* Sidebar */}
      <div
        className={`flex flex-col bg-white shadow-xl border-r border-gray-200 transition-all duration-300
          fixed inset-y-0 left-0 z-30 transform ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          md:relative md:translate-x-0 
          ${collapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-slate-700 to-slate-800">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <FaBuilding className="text-slate-700 text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-white text-sm truncate max-w-[140px]">
                  {vendor?.businessName || "Vendor"}
                </h2>
                <p className="text-xs text-blue-100 truncate">
                  {vendor?.name || "Dashboard"}
                </p>
              </div>
            </div>
          )}
          {/* Desktop Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-900 text-white transition hidden md:block"
          >
            <FaBars />
          </button>
          {/* Mobile Close Button */}
          <button
            onClick={onToggleMobileMenu}
            className="p-2 rounded-lg hover:bg-slate-900 text-white transition md:hidden"
          >
            <FaTimes />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => onMenuClick(item.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                currentSection === item.key
                  ? "bg-slate-600 text-white shadow-lg scale-105"
                  : "hover:bg-gray-100 text-gray-700 hover:scale-102"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <span className="text-lg">{item.icon}</span>
              <span className={`text-sm ${collapsed ? "md:hidden" : ""}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-all ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <FaSignOutAlt className="text-lg" />
            <span className={`text-sm ${collapsed ? "md:hidden" : ""}`}>Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default SidebarNav;
