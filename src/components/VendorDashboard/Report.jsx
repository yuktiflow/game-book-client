import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Loader2,
  AlertCircle,
  FileText,
  Printer,
  CalendarRange,
  Calendar,
  LineChart,
  Edit,
  BarChart3,
  PieChart,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Check,
  X,
  Grid3x3,
  List as ListIcon,
} from "lucide-react";
import { toast, ToastContainer } from "react-toastify";
import {
  MonthlyTrendsChart,
  IncomeByGameTypeChart,
  PaymentStatsChart,
} from "./components/ReportCharts";
// Note: "react-toastify/dist/ReactToastify.css" is assumed to be imported at the root (e.g., index.js or App.js)

// --- Constants ---
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_DELAY = 300;

// --- Custom Hook for Debouncing ---
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

// --- Helper to format currency ---
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// --- UI Sub-components ---

const SummaryCard = ({ title, value, icon, color, loading }) => {
  return (
    <div
      className="p-4 sm:p-6 rounded-2xl shadow-lg bg-gradient-to-br from-slate-700 to-slate-800 text-white border border-slate-600"
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm sm:text-lg font-medium opacity-90">{title}</p>
          {loading ? (
            <div className="h-6 sm:h-8 w-24 sm:w-32 bg-white/20 rounded-md animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {formatCurrency(value)}
            </p>
          )}
        </div>
        <div className="text-2xl sm:text-4xl opacity-40">{icon}</div>
      </div>
    </div>
  );
};

const ProfitLossCard = ({ title, value, loading }) => {
  const isProfit = value >= 0;
  const bgColor = isProfit ? "bg-slate-50" : "bg-slate-100";
  const textColor = isProfit ? "text-slate-700" : "text-slate-800";
  const amountColor = isProfit ? "text-slate-900" : "text-slate-900";

  return (
    <div
      className={`p-4 sm:p-6 rounded-2xl shadow-lg ${bgColor} border border-slate-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-sm sm:text-lg font-medium ${textColor}`}>{title}</p>
          {loading ? (
            <div className="h-6 sm:h-8 w-24 sm:w-32 bg-slate-300 rounded-md animate-pulse mt-1"></div>
          ) : (
            <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${amountColor}`}>
              {formatCurrency(value)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
    {/* --- Skeleton for Advance & Actions --- */}
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
    <td className="p-3">
      <div className="h-4 bg-gray-200 rounded"></div>
    </td>
  </tr>
);

const EmptyState = ({ icon, title, message, onRetry }) => (
  <div className="text-center py-10 px-4">
    <div className="flex justify-center items-center mx-auto w-16 h-16 bg-gray-100 rounded-full">
      {icon}
    </div>
    <h3 className="mt-4 text-lg font-semibold text-gray-700">{title}</h3>
    <p className="mt-2 text-sm text-gray-500">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-6 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
      >
        Retry
      </button>
    )}
  </div>
);

// --- UPDATED: CustomerTable now accepts totalAdvance and navigate ---
const CustomerTable = ({
  customers,
  loading,
  pageStartIndex,
  totalYene,
  totalDene,
  totalAdvance, // <-- NEW PROP
  onEditCustomer, // <-- NEW PROP for edit handler
  userRole, // <-- NEW PROP for role check
  onBalanceUpdate, // <-- NEW PROP for balance update handler
}) => {
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ yene: 0, dene: 0, advance: 0 });
  const [saving, setSaving] = useState(false);

  const handleEditClick = (customer) => {
    const finalTotal = customer.latestBalance || 0;
    const yene = finalTotal > 0 ? finalTotal : 0;
    const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
    const advance = customer.advanceAmount || 0;
    
    setEditingRow(customer._id);
    setEditValues({ yene, dene, advance });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({ yene: 0, dene: 0, advance: 0 });
  };

  const handleSaveEdit = async (customerId) => {
    setSaving(true);
    try {
      await onBalanceUpdate(customerId, editValues);
      setEditingRow(null);
      setEditValues({ yene: 0, dene: 0, advance: 0 });
    } catch (error) {
      console.error('Error saving balance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    
    // If changing yene or dene, clear the other one (they're mutually exclusive)
    if (field === 'yene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, yene: numValue, dene: 0 }));
    } else if (field === 'dene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, dene: numValue, yene: 0 }));
    } else {
      setEditValues(prev => ({ ...prev, [field]: numValue }));
    }
  };

  return { editingRow, editValues, saving, handleEditClick, handleCancelEdit, handleSaveEdit, handleInputChange };
};

// Grid Card Component with inline editing
const CustomerGridCard = ({
  customer,
  index,
  pageStartIndex,
  userRole,
  editingRow,
  editValues,
  saving,
  handleEditClick,
  handleCancelEdit,
  handleSaveEdit,
  handleInputChange,
}) => {
  const finalTotal = customer.latestBalance || 0;
  const yene = finalTotal > 0 ? finalTotal : 0;
  const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
  const advance = customer.advanceAmount || 0;
  const isEditing = editingRow === customer._id;

  if (isEditing) {
    return (
      <div className="bg-blue-50 border-2 border-blue-400 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg">
            #{pageStartIndex + index + 1}
          </div>
          <span className="text-blue-600 font-semibold text-sm">Editing Balance</span>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Users className="text-gray-600 w-5 h-5" />
          </div>
          {customer.name}
        </h3>

        <div className="space-y-3 mb-5">
          {/* येणे Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">येणे (To Receive)</label>
            <input
              type="number"
              value={editValues.yene}
              onChange={(e) => handleInputChange('yene', e.target.value)}
              className="w-full px-3 py-2 border-2 border-green-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50"
              placeholder="0"
              disabled={saving}
            />
          </div>

          {/* देणे Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">देणे (To Give)</label>
            <input
              type="number"
              value={editValues.dene}
              onChange={(e) => handleInputChange('dene', e.target.value)}
              className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-red-50"
              placeholder="0"
              disabled={saving}
            />
          </div>

          {/* आड Input */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">आड (Advance)</label>
            <input
              type="number"
              value={editValues.advance}
              onChange={(e) => handleInputChange('advance', e.target.value)}
              className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              placeholder="0"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleSaveEdit(customer._id)}
            disabled={saving}
            className="flex-1 bg-green-600 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold hover:bg-green-700 disabled:opacity-50 shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            disabled={saving}
            className="flex-1 bg-gray-600 text-white py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-semibold hover:bg-gray-700 disabled:opacity-50 shadow-md"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-slate-400 hover:-translate-y-1 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg">
          #{pageStartIndex + index + 1}
        </div>
         
          <button
            onClick={() => handleEditClick(customer)}
            className="text-blue-600 hover:text-blue-800 transition-all p-2 hover:bg-blue-100 rounded-lg"
            title="Edit Balance"
          >
            <Edit className="w-5 h-5" />
          </button>
        
      </div>

      <div className="mb-5 relative z-10">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="bg-gray-100 p-2 rounded-lg">
            <Users className="text-gray-600 w-5 h-5" />
          </div>
          {customer.name}
        </h3>
        
        <div className="space-y-3">
          {/* येणे (To Receive) */}
          {yene > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
              <span className="text-sm font-medium text-green-700">येणे (To Receive)</span>
              <div className="flex items-center gap-1">
                <DollarSign className="text-green-600 w-4 h-4" />
                <span className="font-bold text-green-700">
                  {formatCurrency(yene)}
                </span>
              </div>
            </div>
          )}

          {/* देणे (To Give) */}
          {dene > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-red-50 to-rose-50 p-3 rounded-lg border border-red-200">
              <span className="text-sm font-medium text-red-700">देणे (To Give)</span>
              <div className="flex items-center gap-1">
                <DollarSign className="text-red-600 w-4 h-4" />
                <span className="font-bold text-red-700">
                  {formatCurrency(dene)}
                </span>
              </div>
            </div>
          )}

          {/* आड (Advance) */}
          {advance > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-200">
              <span className="text-sm font-medium text-blue-700">आड (Advance)</span>
              <div className="flex items-center gap-1">
                <DollarSign className="text-blue-600 w-4 h-4" />
                <span className="font-bold text-blue-700">
                  {formatCurrency(advance)}
                </span>
              </div>
            </div>
          )}

          {/* No Balance */}
          {yene === 0 && dene === 0 && advance === 0 && (
            <div className="text-center py-3 text-gray-400 text-sm">
              No outstanding balance
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Table Component
const CustomerTableView = ({
  customers,
  loading,
  pageStartIndex,
  totalYene,
  totalDene,
  totalAdvance,
  onEditCustomer,
  userRole,
  onBalanceUpdate,
}) => {
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ yene: 0, dene: 0, advance: 0 });
  const [saving, setSaving] = useState(false);

  const handleEditClick = (customer) => {
    const finalTotal = customer.latestBalance || 0;
    const yene = finalTotal > 0 ? finalTotal : 0;
    const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
    const advance = customer.advanceAmount || 0;
    
    setEditingRow(customer._id);
    setEditValues({ yene, dene, advance });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({ yene: 0, dene: 0, advance: 0 });
  };

  const handleSaveEdit = async (customerId) => {
    setSaving(true);
    try {
      await onBalanceUpdate(customerId, editValues);
      setEditingRow(null);
      setEditValues({ yene: 0, dene: 0, advance: 0 });
    } catch (error) {
      console.error('Error saving balance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    
    // If changing yene or dene, clear the other one (they're mutually exclusive)
    if (field === 'yene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, yene: numValue, dene: 0 }));
    } else if (field === 'dene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, dene: numValue, yene: 0 }));
    } else {
      setEditValues(prev => ({ ...prev, [field]: numValue }));
    }
  };
  
  if (loading) {
    return (
      <div className="overflow-x-auto border rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">
                Sr.No.
              </th>
              <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">
                Name
              </th>
              <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                येणे
              </th>
              <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                देणे
              </th>
              <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                आड (Advance)
              </th>
              <th className="p-3 text-center text-sm font-semibold text-gray-600 tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <EmptyState
        icon={<Search className="text-gray-400 text-2xl" />}
        title="No Customers Found"
        message="Try adjusting your search or filter criteria."
      />
    );
  }

  return (
    <div className="overflow-x-auto border rounded-lg shadow max-h-[50vh] sm:max-h-[60vh] overflow-y-auto -mx-2 sm:mx-0">
      <table className="min-w-full divide-y divide-gray-200" id="customer-table">
        <thead className="bg-gray-100 sticky top-0 z-10">
          <tr>
            <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              Sr.No.
            </th>
            <th className="p-2 sm:p-3 text-left text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              Name
            </th>
            <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              येणे
            </th>
            <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              देणे
            </th>
            <th className="p-2 sm:p-3 text-right text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              आड
            </th>
            <th className="p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold text-gray-600 tracking-wider">
              <span className="hidden sm:inline">Actions</span>
              <span className="sm:hidden">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((c, index) => {
            const finalTotal = c.latestBalance || 0;
            const yene = finalTotal > 0 ? finalTotal : 0;
            const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
            // --- UPDATED: Read advanceAmount from customer object ---
            const advance = c.advanceAmount || 0;
            const isEditing = editingRow === c._id;

            return (
              <tr
                key={c._id}
                className={`hover:bg-slate-50 transition-colors ${isEditing ? 'bg-blue-50' : ''}`}
              >
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm text-gray-700">
                  {pageStartIndex + index + 1}
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                  {c.name}
                </td>
                {/* येणे (To Receive) */}
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-medium text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editValues.yene}
                      onChange={(e) => handleInputChange('yene', e.target.value)}
                      className="w-20 sm:w-24 px-2 py-1 border border-blue-400 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    />
                  ) : (
                    formatCurrency(yene)
                  )}
                </td>
                {/* देणे (To Give) */}
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-medium text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editValues.dene}
                      onChange={(e) => handleInputChange('dene', e.target.value)}
                      className="w-20 sm:w-24 px-2 py-1 border border-blue-400 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    />
                  ) : (
                    formatCurrency(dene)
                  )}
                </td>
                {/* आड (Advance) */}
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm text-gray-700 font-medium text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      value={editValues.advance}
                      onChange={(e) => handleInputChange('advance', e.target.value)}
                      className="w-20 sm:w-24 px-2 py-1 border border-blue-400 rounded text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    />
                  ) : (
                    formatCurrency(advance)
                  )}
                </td>
                <td className="p-2 sm:p-3 whitespace-nowrap text-xs sm:text-sm text-center">
                  {isEditing ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleSaveEdit(c._id)}
                        disabled={saving}
                        className="text-green-600 hover:text-green-900 transition-colors disabled:opacity-50"
                        title="Save Changes"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        disabled={saving}
                        className="text-red-600 hover:text-red-900 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-center">
                      
                        <button
                          onClick={() => handleEditClick(c)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="Edit Balance"
                        >
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                       
                       
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* --- UPDATED: Table Footer for Totals --- */}
        <tfoot className="bg-gray-100 sticky bottom-0 z-10 border-t-2 border-gray-300">
          <tr className="font-bold text-gray-900">
            <td className="p-2 sm:p-3 text-left text-xs sm:text-sm" colSpan="2">
              Total
            </td>
            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm text-slate-700">
              {formatCurrency(totalYene)}
            </td>
            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm text-slate-700">
              {formatCurrency(totalDene)}
            </td>
            {/* --- UPDATED: Display dynamic totalAdvance --- */}
            <td className="p-2 sm:p-3 text-right text-xs sm:text-sm text-slate-700">
              {formatCurrency(totalAdvance)}
            </td>
            <td className="p-2 sm:p-3"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-4 print-hidden">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Previous
      </button>
      <span className="text-sm text-gray-700">
        Page {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="w-full sm:w-auto px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
};

// Tab Navigation Component
const TabNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "analytics", label: "Analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { id: "payments", label: "Payments", icon: <DollarSign className="w-4 h-4" /> },
    { id: "customers", label: "Customer Insights", icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-slate-700 text-slate-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

// Grid View Component
const GridView = ({ customers, pageStartIndex, userRole, onBalanceUpdate, currentPage, totalPages, onPageChange }) => {
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({ yene: 0, dene: 0, advance: 0 });
  const [saving, setSaving] = useState(false);

  const handleEditClick = (customer) => {
    const finalTotal = customer.latestBalance || 0;
    const yene = finalTotal > 0 ? finalTotal : 0;
    const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
    const advance = customer.advanceAmount || 0;
    
    setEditingRow(customer._id);
    setEditValues({ yene, dene, advance });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditValues({ yene: 0, dene: 0, advance: 0 });
  };

  const handleSaveEdit = async (customerId) => {
    setSaving(true);
    try {
      await onBalanceUpdate(customerId, editValues);
      setEditingRow(null);
      setEditValues({ yene: 0, dene: 0, advance: 0 });
    } catch (error) {
      console.error('Error saving balance:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    
    if (field === 'yene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, yene: numValue, dene: 0 }));
    } else if (field === 'dene' && numValue > 0) {
      setEditValues(prev => ({ ...prev, dene: numValue, yene: 0 }));
    } else {
      setEditValues(prev => ({ ...prev, [field]: numValue }));
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {customers.length > 0 ? (
          customers.map((customer, index) => (
            <CustomerGridCard
              key={customer._id}
              customer={customer}
              index={index}
              pageStartIndex={pageStartIndex}
              userRole={userRole}
              editingRow={editingRow}
              editValues={editValues}
              saving={saving}
              handleEditClick={handleEditClick}
              handleCancelEdit={handleCancelEdit}
              handleSaveEdit={handleSaveEdit}
              handleInputChange={handleInputChange}
            />
          ))
        ) : (
          <div className="col-span-full text-center py-16">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No customers found</p>
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
};

export default function ReportPage() {
  const navigate = useNavigate();
  const [allCustomers, setAllCustomers] = useState([]);
  const [summary, setSummary] = useState({
    weekly: { income: 0, profit: 0 },
    monthly: { income: 0, profit: 0 },
    yearly: { income: 0, profit: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewMode, setViewMode] = useState(() => {
    // Default to grid view on mobile devices
    return window.innerWidth < 768 ? "grid" : "list";
  });
  const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_DELAY);
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role"); // Get user role from localStorage

  // Chart data states
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [gameTypeIncome, setGameTypeIncome] = useState([]);
  const [paymentStats, setPaymentStats] = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setSummaryLoading(true);
    setError(null);
    if (!token) {
      const msg = "Authentication token not found.";
      toast.error(msg);
      setError(msg);
      setLoading(false);
      setSummaryLoading(false);
      return;
    }

    try {
      const cacheBust = `_=${new Date().getTime()}`;
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
      };

      // ! THIS API CALL is assumed to now return:
      // ! { _id, name, latestBalance, advanceAmount }
      const [customerRes, weeklyRes, monthlyRes, yearlyRes] =
        await Promise.all([
          axios.get(
            `${API_BASE_URI}/api/reports/customers/all-balances?${cacheBust}`,
            config
          ),
          axios.get(
            `${API_BASE_URI}/api/reports/summary/weekly?${cacheBust}`,
            config
          ),
          axios.get(
            `${API_BASE_URI}/api/reports/summary/monthly?${cacheBust}`,
            config
          ),
          axios.get(
            `${API_BASE_URI}/api/reports/summary/yearly?${cacheBust}`,
            config
          ),
        ]);

      setAllCustomers(customerRes.data);
      setSummary({
        weekly: {
          income: weeklyRes.data.totalIncome || 0,
          profit: weeklyRes.data.totalProfit || 0,
        },
        monthly: {
          income: monthlyRes.data.totalIncome || 0,
          profit: monthlyRes.data.totalProfit || 0,
        },
        yearly: {
          income: yearlyRes.data.totalIncome || 0,
          profit: yearlyRes.data.totalProfit || 0,
        },
      });
    } catch (err) {
      console.error("Failed to fetch data:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to load data. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setSummaryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    fetchChartData();
  }, [fetchData]);

  const fetchChartData = async () => {
    if (!token) return;

    setChartsLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Cache-Control": "no-cache",
        },
      };

      const [trendsRes, gameTypeRes, statsRes] = await Promise.all([
        axios.get(`${API_BASE_URI}/api/reports/monthly-trends`, config),
        axios.get(`${API_BASE_URI}/api/reports/income-by-game-type`, config),
        axios.get(`${API_BASE_URI}/api/reports/payment-stats`, config),
      ]);

      setMonthlyTrends(trendsRes.data);
      setGameTypeIncome(gameTypeRes.data);
      setPaymentStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch chart data:", err);
      // Don't show error toast for charts, just log it
    } finally {
      setChartsLoading(false);
    }
  };

  // --- UPDATED: This useMemo now calculates and returns totalAdvance ---
  const { netBalance, totalYene, totalDene, totalAdvance } = useMemo(() => {
    let yene = 0;
    let dene = 0;
    let advance = 0; // <-- NEW: Accumulator for advance

    allCustomers.forEach((c) => {
      const balance = c.latestBalance || 0;
      if (balance > 0) {
        yene += balance;
      } else if (balance < 0) {
        dene += Math.abs(balance);
      }
      
      // --- NEW: Calculate total advance from API data ---
      if (c.advanceAmount && c.advanceAmount > 0) {
        advance += c.advanceAmount;
      }
    });

    return {
      totalYene: yene,
      totalDene: dene,
      netBalance: yene - dene,
      totalAdvance: advance, // <-- NEW: Return total advance
    };
  }, [allCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return allCustomers;
    return allCustomers.filter(
      (c) =>
        (c.name &&
          c.name.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (c.srNo && c.srNo.toString() === debouncedSearch.trim())
    );
  }, [debouncedSearch, allCustomers]);

  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
  const pageStartIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentCustomersOnPage = filteredCustomers.slice(
    pageStartIndex,
    pageStartIndex + ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const handleExportCSV = () => {
    if (allCustomers.length === 0) {
      toast.warn("No customer data to export.");
      return;
    }
    // --- UPDATED CSV Headers ---
    const headers = [
      "Sr.No.",
      "Name",
      "येणे (To Receive)",
      "देणे (To Give)",
      "आड (Advance)",
    ];
    const rows = allCustomers.map((c) => {
      const finalTotal = c.latestBalance || 0;
      const yene = finalTotal > 0 ? finalTotal : 0;
      const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
      // --- UPDATED: Get advanceAmount from customer data ---
      const advance = c.advanceAmount || 0;
      return [
        c.srNo || "N/A",
        `"${c.name}"`,
        yene.toFixed(2),
        dene.toFixed(2),
        advance.toFixed(2), // <-- Use dynamic advance
      ].join(",");
    });

    // --- UPDATED: Add the dynamic totalAdvance to the total row ---
    const totalRow = [
      "Total",
      "",
      totalYene.toFixed(2),
      totalDene.toFixed(2),
      totalAdvance.toFixed(2), // <-- Use dynamic total advance
    ].join(",");
    rows.push(totalRow);
    // --- END UPDATE ---

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "all_customers_balance.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloaded all customers as CSV.");
  };

  const handlePrint = () => window.print();

  const handleEditCustomer = useCallback((customerId) => {
    // Navigate to create receipt page with customer pre-selected
    navigate(`/vendor/createReceipt?customerId=${customerId}`);
  }, [navigate]);

  const handleBalanceUpdate = useCallback(async (customerId, balanceData) => {
    if (!token) {
      toast.error("Authentication token not found.");
      return;
    }

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      await axios.put(
        `${API_BASE_URI}/api/customers/${customerId}/balance`,
        balanceData,
        config
      );

      toast.success("Balance updated successfully!");
      
      // Refresh the data after update
      await fetchData();
    } catch (err) {
      console.error("Failed to update balance:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Failed to update balance. Please try again.";
      toast.error(errorMessage);
      throw err;
    }
  }, [token, fetchData]);

  if (error && allCustomers.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-6 max-w-7xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="text-slate-500 text-3xl" />}
          title="Failed to Load Data"
          message={error}
          onRetry={fetchData}
        />
      </div>
    );
  }

  return (
    <>
      <style>{`
            @media print {
                body * { visibility: hidden; }
                .printable-area, .printable-area * { visibility: visible; }
                .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
                .print-hidden { display: none !important; }
                @page { size: auto; margin: 0.5in; }
                table { border-collapse: collapse !important; width: 100% !important; }
                th, td { border: 1px solid #ddd !important; padding: 8px !important; }
                thead, tfoot { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
                td.text-slate-700 { color: #334155 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
                td.text-gray-700 { color: #374151 !important; -webkit-print-color-adjust: exact; color-adjust: exact; }
            }
        `}</style>

      <div className="bg-gray-50 min-h-full p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 max-w-7xl mx-auto space-y-6">
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
          />
          <div className="printable-area">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">
              Reports Dashboard
            </h1>

            {/* Tab Navigation */}
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Customer Balance Overview</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 print-hidden">
                  <SummaryCard
                    title="This Week's Income"
                    value={summary.weekly.income}
                    icon={<CalendarRange />}
                    color="purple"
                    loading={summaryLoading}
                  />
                  <SummaryCard
                    title="This Month's Income"
                    value={summary.monthly.income}
                    icon={<Calendar />}
                    color="blue"
                    loading={summaryLoading}
                  />
                  <SummaryCard
                    title="This Year's Income"
                    value={summary.yearly.income}
                    icon={<LineChart />}
                    color="green"
                    loading={summaryLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 print-hidden">
                  <ProfitLossCard
                    title="Weekly Profit/Loss"
                    value={summary.weekly.profit}
                    loading={summaryLoading}
                  />
                  <ProfitLossCard
                    title="Monthly Profit/Loss"
                    value={summary.monthly.profit}
                    loading={summaryLoading}
                  />
                  <ProfitLossCard
                    title="Yearly Profit/Loss"
                    value={summary.yearly.profit}
                    loading={summaryLoading}
                  />
                  <ProfitLossCard
                    title="Net Customer Balance"
                    value={netBalance}
                    loading={loading}
                  />
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm print-hidden">
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                      <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or Sr.No."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="border border-gray-300 rounded-lg py-2 pl-10 pr-4 w-full focus:outline-none focus:ring-2 focus:ring-slate-500"
                        />
                      </div>
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1 border border-gray-300">
                        <button
                          onClick={() => setViewMode('list')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-all text-sm ${
                            viewMode === 'list'
                              ? 'bg-slate-700 text-white shadow-md'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <ListIcon className="w-4 h-4" /> List
                        </button>
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-all text-sm ${
                            viewMode === 'grid'
                              ? 'bg-slate-700 text-white shadow-md'
                              : 'text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Grid3x3 className="w-4 h-4" /> Grid
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <button
                        onClick={handleExportCSV}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
                      >
                        <FileText /> Export CSV
                      </button>
                      <button
                        onClick={handlePrint}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto"
                      >
                        <Printer /> Print
                      </button>
                    </div>
                  </div>

                  {/* List View */}
                  {viewMode === 'list' && (
                    <>
                      <CustomerTableView
                        customers={currentCustomersOnPage}
                        loading={loading && allCustomers.length === 0}
                        pageStartIndex={pageStartIndex}
                        totalYene={totalYene}
                        totalDene={totalDene}
                        totalAdvance={totalAdvance}
                        onEditCustomer={handleEditCustomer}
                        userRole={userRole}
                        onBalanceUpdate={handleBalanceUpdate}
                      />

                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                      />
                    </>
                  )}

                  {/* Grid View */}
                  {viewMode === 'grid' && (
                    <GridView
                      customers={currentCustomersOnPage}
                      pageStartIndex={pageStartIndex}
                      userRole={userRole}
                      onBalanceUpdate={handleBalanceUpdate}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === "analytics" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Business Analytics</h2>
                </div>
                
                {chartsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                    <p className="ml-3 text-gray-600">Loading analytics...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <MonthlyTrendsChart data={monthlyTrends} />
                    <IncomeByGameTypeChart data={gameTypeIncome} />
                    <PaymentStatsChart data={paymentStats} />
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === "payments" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Payment Summary</h2>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                    <p className="ml-3 text-gray-600">Loading payment data...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl border-2 border-green-300 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-lg text-green-700 font-semibold">येणे (To Receive)</p>
                          <DollarSign className="w-8 h-8 text-green-600" />
                        </div>
                        <p className="text-4xl font-bold text-green-900 mb-2">{formatCurrency(totalYene)}</p>
                        <p className="text-sm text-green-700">
                          Amount customers owe you
                        </p>
                      </div>
                      
                      <div className="bg-gradient-to-br from-red-50 to-red-100 p-8 rounded-xl border-2 border-red-300 shadow-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-lg text-red-700 font-semibold">देणे (To Give)</p>
                          <DollarSign className="w-8 h-8 text-red-600" />
                        </div>
                        <p className="text-4xl font-bold text-red-900 mb-2">{formatCurrency(totalDene)}</p>
                        <p className="text-sm text-red-700">
                          Amount you owe customers
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Net Balance</p>
                        <p className={`text-3xl font-bold ${netBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(Math.abs(netBalance))}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {netBalance >= 0 ? 'In your favor' : 'In customers favor'}
                        </p>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Total Advance (आड)</p>
                        <p className="text-3xl font-bold text-blue-700">{formatCurrency(totalAdvance)}</p>
                        <p className="text-xs text-slate-500 mt-1">Advance from customers</p>
                      </div>
                      
                      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-sm text-slate-600 font-medium mb-2">Total Customers</p>
                        <p className="text-3xl font-bold text-slate-700">{allCustomers.length}</p>
                        <p className="text-xs text-slate-500 mt-1">Active customers</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-green-600" />
                          Top 10 Customers Owing Money (येणे)
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {allCustomers
                            .filter(c => (c.latestBalance || 0) > 0)
                            .sort((a, b) => (b.latestBalance || 0) - (a.latestBalance || 0))
                            .slice(0, 10)
                            .map((customer, idx) => (
                              <div key={customer._id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg hover:bg-green-100 transition">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-7 h-7 bg-green-200 rounded-full text-xs font-bold text-green-800">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">{customer.name}</span>
                                </div>
                                <span className="font-bold text-green-700">
                                  {formatCurrency(customer.latestBalance)}
                                </span>
                              </div>
                            ))}
                          {allCustomers.filter(c => (c.latestBalance || 0) > 0).length === 0 && (
                            <p className="text-center text-gray-500 py-8">No customers owe money</p>
                          )}
                        </div>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-red-600" />
                          Top 10 Customers You Owe (देणे)
                        </h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {allCustomers
                            .filter(c => (c.latestBalance || 0) < 0)
                            .sort((a, b) => (a.latestBalance || 0) - (b.latestBalance || 0))
                            .slice(0, 10)
                            .map((customer, idx) => (
                              <div key={customer._id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg hover:bg-red-100 transition">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-7 h-7 bg-red-200 rounded-full text-xs font-bold text-red-800">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">{customer.name}</span>
                                </div>
                                <span className="font-bold text-red-700">
                                  {formatCurrency(Math.abs(customer.latestBalance))}
                                </span>
                              </div>
                            ))}
                          {allCustomers.filter(c => (c.latestBalance || 0) < 0).length === 0 && (
                            <p className="text-center text-gray-500 py-8">You don't owe any customers</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Customer Insights Tab */}
            {activeTab === "customers" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">Customer Insights</h2>
                </div>

                {chartsLoading || loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
                    <p className="ml-3 text-gray-600">Loading customer insights...</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-xl border border-indigo-200 shadow-sm">
                        <p className="text-sm text-indigo-700 font-medium mb-2">Total Customers</p>
                        <p className="text-3xl font-bold text-indigo-900">{allCustomers.length}</p>
                      </div>
                      <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200 shadow-sm">
                        <p className="text-sm text-emerald-700 font-medium mb-2">Customers Owing</p>
                        <p className="text-3xl font-bold text-emerald-900">
                          {allCustomers.filter(c => (c.latestBalance || 0) > 0).length}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-xl border border-rose-200 shadow-sm">
                        <p className="text-sm text-rose-700 font-medium mb-2">We Owe To</p>
                        <p className="text-3xl font-bold text-rose-900">
                          {allCustomers.filter(c => (c.latestBalance || 0) < 0).length}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 text-slate-600" />
                          Top 5 Customers by Balance
                        </h3>
                        <div className="space-y-3">
                          {allCustomers
                            .sort((a, b) => Math.abs(b.latestBalance || 0) - Math.abs(a.latestBalance || 0))
                            .slice(0, 5)
                            .map((customer, idx) => (
                              <div key={customer._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="flex items-center justify-center w-8 h-8 bg-slate-200 rounded-full text-sm font-semibold text-slate-700">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium text-gray-900">{customer.name}</span>
                                </div>
                                <span className={`font-semibold ${(customer.latestBalance || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {formatCurrency(Math.abs(customer.latestBalance || 0))}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Balance Distribution</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-3">Customers Owing Money (येणे)</h4>
                          <div className="space-y-2">
                            {allCustomers
                              .filter(c => (c.latestBalance || 0) > 0)
                              .sort((a, b) => (b.latestBalance || 0) - (a.latestBalance || 0))
                              .slice(0, 10)
                              .map(customer => (
                                <div key={customer._id} className="flex justify-between items-center p-2 bg-green-50 rounded">
                                  <span className="text-sm text-gray-700">{customer.name}</span>
                                  <span className="text-sm font-semibold text-green-700">
                                    {formatCurrency(customer.latestBalance)}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-600 mb-3">Customers We Owe (देणे)</h4>
                          <div className="space-y-2">
                            {allCustomers
                              .filter(c => (c.latestBalance || 0) < 0)
                              .sort((a, b) => (a.latestBalance || 0) - (b.latestBalance || 0))
                              .slice(0, 10)
                              .map(customer => (
                                <div key={customer._id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                                  <span className="text-sm text-gray-700">{customer.name}</span>
                                  <span className="text-sm font-semibold text-red-700">
                                    {formatCurrency(Math.abs(customer.latestBalance))}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Print-only table for all customers */}
            <div className="hidden print:block">
              <h2 className="text-xl font-semibold mb-2">
                All Customers Balance
              </h2>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Sr.No.
                    </th>
                    <th className="p-3 text-left text-sm font-semibold text-gray-600 tracking-wider">
                      Name
                    </th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                      येणे
                    </th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                      देणे
                    </th>
                    <th className="p-3 text-right text-sm font-semibold text-gray-600 tracking-wider">
                      आड (Advance)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allCustomers.map((c) => {
                    const finalTotal = c.latestBalance || 0;
                    const yene = finalTotal > 0 ? finalTotal : 0;
                    const dene = finalTotal < 0 ? Math.abs(finalTotal) : 0;
                    const advance = c.advanceAmount || 0;
                    return (
                      <tr key={c._id}>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700">
                          {c.srNo}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {c.name}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(yene)}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(dene)}
                        </td>
                        <td className="p-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {formatCurrency(advance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                  <tr className="font-bold text-gray-900">
                    <td className="p-3 text-left" colSpan="2">
                      Total
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {formatCurrency(totalYene)}
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {formatCurrency(totalDene)}
                    </td>
                    <td className="p-3 text-right text-slate-700">
                      {formatCurrency(totalAdvance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}