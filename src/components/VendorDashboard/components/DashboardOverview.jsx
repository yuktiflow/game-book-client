import React from "react";
import { FaBuilding } from "react-icons/fa";
import StatsCards from "./StatsCards";
import QuickActions from "./QuickActions";
import { RecentReceipts, TopCustomers, RecentActivities } from "./DashboardWidgets";
import { formatCurrency } from "../utils/formatters";

const DashboardOverview = ({
  vendor,
  dashboardStats,
  recentActivities,
  getActivityIcon,
  onMenuClick,
}) => {
  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              Welcome back, {vendor?.name}
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <FaBuilding className="text-slate-600" />
              {vendor?.businessName}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview Cards */}
      <StatsCards dashboardStats={dashboardStats} formatCurrency={formatCurrency} />

      {/* Quick Actions */}
      <QuickActions onMenuClick={onMenuClick} />

      {/* Recent Receipts & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReceipts 
          receipts={dashboardStats.recentReceipts} 
          onViewAll={() => onMenuClick('viewReceipts')}
        />
        <TopCustomers 
          customers={dashboardStats.topCustomers} 
          onViewAll={() => onMenuClick('customers')}
        />
      </div>

      {/* Recent Activities */}
      <RecentActivities 
        activities={recentActivities} 
        getActivityIcon={getActivityIcon}
      />
    </div>
  );
};

export default DashboardOverview;
