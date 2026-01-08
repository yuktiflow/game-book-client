import React from "react";
import {
  FaTachometerAlt,
  FaFileInvoiceDollar,
  FaClipboardList,
  FaUser,
  FaCoins,
  FaUserCircle,
} from "react-icons/fa";
import { useLanguage } from "../../../contexts/LanguageContext";

const QuickActions = ({ onMenuClick }) => {
  const { t } = useLanguage();

  const actions = [
    {
      key: "createReceipt",
      title: t('navigation.createReceipt'),
      description: t('dashboard.quickActions.createReceiptDesc'),
      icon: <FaFileInvoiceDollar className="text-3xl text-slate-600" />,
      bgColor: "bg-slate-50",
      hoverColor: "hover:border-slate-600 hover:shadow-slate-100"
    },
    {
      key: "viewReceipts",
      title: t('navigation.viewReceipts'),
      description: t('dashboard.quickActions.viewReceiptsDesc'),
      icon: <FaClipboardList className="text-3xl text-slate-600" />,
      bgColor: "bg-slate-50",
      hoverColor: "hover:border-slate-600 hover:shadow-slate-100"
    },
    {
      key: "customers",
      title: t('navigation.customers'),
      description: t('dashboard.quickActions.customersDesc'),
      icon: <FaUser className="text-3xl text-green-600" />,
      bgColor: "bg-green-50",
      hoverColor: "hover:border-green-600 hover:shadow-green-100"
    },
    {
      key: "reports",
      title: t('navigation.reports'),
      description: t('dashboard.quickActions.reportsDesc'),
      icon: <FaCoins className="text-3xl text-purple-600" />,
      bgColor: "bg-purple-50",
      hoverColor: "hover:border-purple-600 hover:shadow-purple-100"
    },
    {
      key: "profile",
      title: t('navigation.profile'),
      description: t('dashboard.quickActions.profileDesc'),
      icon: <FaUserCircle className="text-3xl text-orange-600" />,
      bgColor: "bg-orange-50",
      hoverColor: "hover:border-orange-600 hover:shadow-orange-100"
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl flex items-center justify-center shadow-md">
          <FaTachometerAlt className="text-white text-lg" />
        </div>
        {t('dashboard.quickActions.title')}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => (
          <button
            key={action.key}
            onClick={() => onMenuClick(action.key)}
            className={`group relative bg-white hover:bg-gray-50 border-2 border-gray-200 ${action.hoverColor} rounded-xl p-6 text-left shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-14 h-14 ${action.bgColor} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                {action.icon}
              </div>
            </div>
            <h4 className="text-lg font-bold mb-1 text-gray-800 group-hover:text-slate-600 transition-colors">
              {action.title}
            </h4>
            <p className="text-sm text-gray-600">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
