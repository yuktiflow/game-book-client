import React from "react";
import {
  FaReceipt,
  FaUser,
  FaCoins,
  FaTachometerAlt,
} from "react-icons/fa";

const StatsCard = ({ icon, iconBgColor, title, value, subtitle, subtitleIcon, subtitleColor }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 ${iconBgColor} rounded-xl flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-gray-500 font-medium mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-800 mb-2">{value}</p>
      <p className={`text-xs ${subtitleColor} font-medium flex items-center gap-1`}>
        {subtitleIcon}
        {subtitle}
      </p>
    </div>
  );
};

const StatsCards = ({ dashboardStats, formatCurrency }) => {
  const stats = [
    {
      icon: <FaReceipt className="text-slate-600 text-2xl" />,
      iconBgColor: "bg-slate-100",
      title: "Total Receipts",
      value: dashboardStats.totalReceipts,
      subtitle: "All time",
      subtitleColor: "text-gray-400",
      subtitleIcon: <FaTachometerAlt />
    },
    {
      icon: <FaUser className="text-green-600 text-2xl" />,
      iconBgColor: "bg-green-100",
      title: "Total Customers",
      value: dashboardStats.totalCustomers,
      subtitle: "Active customers",
      subtitleColor: "text-gray-400",
      subtitleIcon: <FaUser className="text-xs" />
    },
    {
      icon: <FaCoins className="text-purple-600 text-2xl" />,
      iconBgColor: "bg-purple-100",
      title: "Monthly Income",
      value: formatCurrency(dashboardStats.monthlyIncome),
      subtitle: "This month",
      subtitleColor: "text-green-500",
      subtitleIcon: <FaTachometerAlt />
    },
    {
      icon: <FaTachometerAlt className="text-orange-600 text-2xl" />,
      iconBgColor: "bg-orange-100",
      title: "Monthly Profit",
      value: formatCurrency(dashboardStats.monthlyProfit),
      subtitle: "Net profit",
      subtitleColor: "text-blue-500",
      subtitleIcon: <FaCoins />
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <StatsCard key={index} {...stat} />
      ))}
    </div>
  );
};

export default StatsCards;
