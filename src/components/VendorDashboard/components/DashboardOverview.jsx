import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaBuilding } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import StatsCards from "./StatsCards";
import QuickActions from "./QuickActions";
import { RecentReceipts, TopCustomers, RecentActivities } from "./DashboardWidgets";
import { formatCurrency } from "../utils/formatters";
import { useLanguage } from "../../../contexts/LanguageContext";
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const DashboardOverview = ({
  vendor,
  dashboardStats,
  recentActivities,
  getActivityIcon,
  onMenuClick,
}) => {
  const { t } = useLanguage();
  const [dailyTotals, setDailyTotals] = useState(null);
  const [dailyTotalsLoading, setDailyTotalsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  useEffect(() => {
    const fetchDailyTotals = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      setDailyTotalsLoading(true);
      try {
        const config = {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: selectedDate },
        };
        const res = await axios.get(`${API_BASE_URI}/api/receipts/daily-totals`, config);
        setDailyTotals(res.data);
      } catch (err) {
        console.error("Failed to fetch daily totals:", err);
      } finally {
        setDailyTotalsLoading(false);
      }
    };

    fetchDailyTotals();
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {t('dashboard.welcome')}, {vendor?.name}
            </h1>
            <p className="text-gray-600 flex items-center gap-2">
              <FaBuilding className="text-slate-600" />
              {vendor?.businessName}
            </p>
          </div>
        </div>
      </div>

      {/* --- DAILY SUMMARY CARD (Dashboard) --- */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white mb-6 print-hidden">
        {dailyTotalsLoading ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin" />
              <p className="opacity-90">{t('dashboard.loadingSummary')}</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 text-slate-800 text-sm rounded-lg focus:outline-none cursor-pointer"
            />
          </div>
        ) : dailyTotals ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-semibold opacity-90">
                    {new Date(selectedDate).toDateString() === new Date().toDateString() ? t('dashboard.todaySummary') : t('dashboard.dailySummary')}
                  </h3>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                    {new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <p className="text-xs opacity-75">{t('dashboard.combinedTotal')}</p>
              </div>


            </div>

            {/* Company Breakdown (Merged) */}
            {Object.keys(dailyTotals.totalsByCompany).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(dailyTotals.totalsByCompany).map(([company, data]) => (
                  <div key={company} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/10 hover:bg-white/15 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-base truncate pr-2" title={company}>{company}</p>
                      <span className="font-bold text-lg bg-white/20 px-2 py-0.5 rounded text-sm">
                        ₹{(data.totalIncome + data.totalPayment).toFixed(0)}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs opacity-80 mb-3 pb-2 border-b border-white/10">
                      <span>{t('receipts.title')}: <b>{data.receiptsCount}</b></span>
                      <span>{t('customers.title')}: <b>{data.customerCount}</b></span>
                    </div>

                    {/* Game Analysis */}
                    {data.gameTypeBreakdown && Object.keys(data.gameTypeBreakdown).length > 0 && (
                      <div className="space-y-1.5 mt-3 pt-3">
                        {Object.entries(data.gameTypeBreakdown).map(([type, stats]) => (
                          <div key={type} className="flex justify-between items-center text-xs">
                            <span className="opacity-80 font-medium">{type} <span className="opacity-50">({stats.count})</span></span>
                            <span className="font-semibold" title="Total (Income + Payment)">
                              ₹{(stats.income + stats.payment).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 bg-white/5 rounded-lg">
                <p className="opacity-75 text-sm">{t('dashboard.noRecords')}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="opacity-75">{t('dashboard.selectDate')}</p>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="mt-2 px-3 py-1 text-slate-800 text-sm rounded"
            />
          </div>
        )}
      </div>

      {/* Stats Overview Cards */}
      {/* <StatsCards dashboardStats={dashboardStats} formatCurrency={formatCurrency} /> */}

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
