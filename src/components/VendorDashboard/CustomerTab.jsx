import React, { useState, useEffect, useCallback } from "react";
import { toast, ToastContainer } from "react-toastify";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import LoadingSpinner from "./components/LoadingSpinner";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  FaEdit,
  FaTrashAlt,
  FaSpinner,
  FaSave,
  FaTimes,
  FaUserPlus,
  FaSearch,
  FaFileExport,
  FaUser,
  FaMapMarkerAlt,
  FaReceipt,
  FaDollarSign,
  FaEye,
  FaChartLine,
  FaTh,
  FaList,
  FaPlus,
  FaMinus,
  FaArrowRight,
  FaCalendarAlt,
  FaMoneyBillWave,
} from "react-icons/fa";

// API base URL
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const CustomerTab = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { customerId } = useParams();

  // --- STATE MANAGEMENT ---
  const [customers, setCustomers] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    address: "",
  });
  const [search, setSearch] = useState("");
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [customerStats, setCustomerStats] = useState(null);
  const [sortBy, setSortBy] = useState('srNo');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState(() => {
    // Default to grid view on mobile devices
    return window.innerWidth < 768 ? "grid" : "list";
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const token = localStorage.getItem("token");

  // --- API CALLS ---
  const fetchCustomers = useCallback(async () => {
    if (!token) {
      setLoading(false);
      toast.error(t('auth.loginError'));
      return;
    }
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const customerData = res.data?.customers || res.data || [];
      if (!Array.isArray(customerData)) {
        console.error("Fetched data is not an array:", customerData);
        toast.error(t('customers.messages.saveFailed'));
        setCustomers([]);
        return;
      }
      const sortedCustomers = customerData.sort((a, b) => a.srNo - b.srNo);
      setCustomers(sortedCustomers);
    } catch (err) {
      console.error("Error fetching customers:", err);
      toast.error(err.response?.data?.message || t('customers.messages.saveFailed'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Load customer details from URL parameter
  useEffect(() => {
    const loadCustomerFromUrl = async () => {
      // Check if we have a valid customer ID from useParams
      if (customerId && customers.length > 0) {
        const customer = customers.find(c => c._id === customerId);

        if (customer) {
          setSelectedCustomer(customer);
          setShowDetailsModal(true);
          setLoadingStats(true);

          // Fetch customer receipts and stats
          try {
            const receiptsRes = await axios.get(`${API_BASE_URI}/api/receipts`, {
              headers: { Authorization: `Bearer ${token}` },
            });

            const customerReceipts = receiptsRes.data.receipts.filter(
              r => r.customerId === customer._id
            );

            // Sort by date descending (newest first)
            customerReceipts.sort((a, b) => new Date(b.date) - new Date(a.date));

            const totalReceipts = customerReceipts.length;
            const totalIncome = customerReceipts.reduce((sum, r) => sum + (r.totalIncome || 0), 0);
            const totalPayment = customerReceipts.reduce((sum, r) => sum + (r.payment || 0), 0);
            const totalDeduction = customerReceipts.reduce((sum, r) => sum + (r.deduction || 0), 0);
            const avgIncome = totalReceipts > 0 ? totalIncome / totalReceipts : 0;

            setCustomerStats({
              totalReceipts,
              totalIncome,
              totalPayment,
              totalDeduction,
              avgIncome,
              balance: customer.latestBalance || 0,
              recentReceipts: customerReceipts.slice(0, 10),
              allReceipts: customerReceipts
            });
          } catch (error) {
            console.error('Error fetching customer stats:', error);
            toast.error(t('customers.messages.saveFailed'));
          } finally {
            setLoadingStats(false);
          }
        } else {
          // Customer not found, redirect back to customers list
          toast.error(t('customers.messages.noCustomers'));
          navigate('/vendor/customers');
        }
      } else if (!customerId && showDetailsModal) {
        // If there's no customerId but modal is showing, close it
        setShowDetailsModal(false);
        setSelectedCustomer(null);
        setCustomerStats(null);
      }
    };

    loadCustomerFromUrl();
  }, [customerId, customers, token, navigate, showDetailsModal]);

  // --- EVENT HANDLERS ---
  const handleNewCustomerChange = (e) => {
    const { name, value } = e.target;
    setNewCustomer((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustomer.name) {
      toast.warn(t('common.required'));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await axios.post(
        `${API_BASE_URI}/api/customers`,
        newCustomer,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCustomers((prevCustomers) => [...prevCustomers, res.data.customer]);
      setNewCustomer({ name: "", address: "" });
      setShowAddForm(false);
      toast.success(t('customers.messages.saveSuccess'));
    } catch (err) {
      console.error("Error adding customer:", err);
      toast.error(err.response?.data?.message || t('customers.messages.saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (customer) => {
    setEditingCustomerId(customer._id);
    setEditForm({
      name: customer.name,
      address: customer.address || "",
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveEdit = async (id) => {
    try {
      const res = await axios.put(
        `${API_BASE_URI}/api/customers/${id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedCustomer = res.data.customer;
      setCustomers((prevCustomers) =>
        prevCustomers.map((customer) =>
          customer._id === id ? updatedCustomer : customer
        )
      );
      setEditingCustomerId(null);
      toast.success(t('customers.messages.saveSuccess'));
    } catch (err) {
      console.error("Error updating customer:", err);
      toast.error(err.response?.data?.message || t('customers.messages.saveFailed'));
    }
  };

  const handleDeleteCustomer = async (customerToDelete) => {
    if (!customerToDelete) return;

    if (
      window.confirm(
        `${t('customers.messages.deleteConfirm')} ${customerToDelete.name}?`
      )
    ) {
      try {
        await axios.delete(
          `${API_BASE_URI}/api/customers/${customerToDelete._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setCustomers((prev) =>
          prev.filter((c) => c._id !== customerToDelete._id)
        );
        toast.success(t('customers.messages.deleteSuccess'));
      } catch (err) {
        console.error("Error deleting customer:", err);
        toast.error(err.response?.data?.message || t('customers.messages.deleteFailed'));
      }
    }
  };

  // --- DERIVED STATE ---
  const customersWithDisplaySrNo = customers.map((customer, index) => ({
    ...customer,
    displaySrNo: index + 1,
  }));

  const filteredCustomers = customersWithDisplaySrNo.filter((customer) => {
    const searchTerm = search.toLowerCase();
    return (
      customer.name.toLowerCase().includes(searchTerm) ||
      customer.displaySrNo.toString().includes(searchTerm) ||
      (customer.address && customer.address.toLowerCase().includes(searchTerm))
    );
  });

  // Sorting logic
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (sortBy === 'srNo' || sortBy === 'displaySrNo') {
      aVal = Number(aVal);
      bVal = Number(bVal);
    } else if (sortBy === 'latestBalance') {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else {
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // Calculate stats
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.latestBalance && c.latestBalance > 0).length;
  const totalBalance = customers.reduce((sum, c) => sum + (c.latestBalance || 0), 0);

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // View customer details
  const viewCustomerDetails = (customer) => {
    // Navigate to customer details URL
    navigate(`/vendor/customers/${customer._id}`);
  };

  // Navigate to receipt details
  const viewReceiptDetails = (receiptId) => {
    setShowDetailsModal(false);
    navigate(`/vendor/createReceipt/${receiptId}`);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [t('customers.table.srNo'), t('customers.table.name'), t('customers.table.address'), 'Latest Balance', 'Advance Amount'];
    const rows = sortedCustomers.map(c => [
      c.displaySrNo,
      c.name,
      c.address || '',
      c.latestBalance || 0,
      c.advanceAmount || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success(t('customers.messages.saveSuccess'));
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return <LoadingSpinner message={t('customers.messages.loading')} />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 min-h-screen">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} theme="colored" />

      <div className="max-w-[1600px] mx-auto p-6 lg:p-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-lg shadow-md">
                <FaUser className="text-white text-lg" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {t('customers.title')}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg text-sm ${showAddForm
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                  }`}
              >
                {showAddForm ? <FaMinus /> : <FaPlus />}
                <span>{showAddForm ? t('common.cancel') : t('customers.addCustomer')}</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg text-sm"
              >
                <FaFileExport />
                <span>{t('common.export')}</span>
              </button>
            </div>
          </div>
        </div>



        {/* CUSTOMER LIST */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FaList className="text-blue-600" />
              {t('customers.title')}
              <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                {sortedCustomers.length}
              </span>
            </h2>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 lg:min-w-[350px]">
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                <input
                  type="text"
                  placeholder={t('customers.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-2 border-gray-200 rounded-xl pl-12 pr-4 py-3.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-400 text-sm"
                />
              </div>
              <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1.5 border-2 border-gray-200">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${viewMode === 'list'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <FaList className="text-base" /> {t('receipts.viewMode.list')}
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 text-sm ${viewMode === 'grid'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  <FaTh className="text-base" /> {t('receipts.viewMode.grid')}
                </button>
              </div>
            </div>
          </div>

          {/* List View */}
          {viewMode === 'list' && (
            <div className="overflow-x-auto rounded-xl border-2 border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white">
                  <tr>
                    <th
                      onClick={() => handleSort('displaySrNo')}
                      className="py-5 px-6 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <span>{t('customers.table.srNo')}</span>
                        {sortBy === 'displaySrNo' && (
                          <span className="text-blue-400 font-bold text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-5 px-6 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FaUser className="text-xs" />
                        <span>{t('customers.table.name')}</span>
                        {sortBy === 'name' && (
                          <span className="text-blue-400 font-bold text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('address')}
                      className="py-5 px-6 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-xs" />
                        <span>{t('customers.table.address')}</span>
                        {sortBy === 'address' && (
                          <span className="text-blue-400 font-bold text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('latestBalance')}
                      className="py-5 px-6 text-left text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors duration-200"
                    >
                      <div className="flex items-center gap-2">
                        <FaDollarSign className="text-xs" />
                        <span>Outstanding Balance</span>
                        {sortBy === 'latestBalance' && (
                          <span className="text-blue-400 font-bold text-sm">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="py-5 px-6 text-center text-xs font-bold uppercase tracking-wider">
                      {t('customers.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {sortedCustomers.length > 0 ? (
                    sortedCustomers.map((customer, index) => (
                      <tr
                        key={customer._id}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          } hover:bg-blue-50 transition-colors duration-200 border-b border-gray-100`}
                      >
                        <td className="py-5 px-6">
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm shadow-sm">
                              #{customer.displaySrNo}
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          {editingCustomerId === customer._id ? (
                            <input
                              type="text"
                              name="name"
                              value={editForm.name}
                              onChange={handleEditChange}
                              className="border-2 border-blue-300 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500 font-medium"
                            />
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <FaUser className="text-gray-500 text-sm" />
                              </div>
                              <span className="font-semibold text-gray-900 text-base">{customer.name}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-5 px-6">
                          {editingCustomerId === customer._id ? (
                            <input
                              type="text"
                              name="address"
                              value={editForm.address}
                              onChange={handleEditChange}
                              className="border-2 border-blue-300 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div className="flex items-center gap-2 text-gray-700">
                              <FaMapMarkerAlt className="text-gray-400 text-xs" />
                              <span className="text-sm">{customer.address || '-'}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-5 px-6">
                          {customer.latestBalance > 0 ? (
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                              <FaDollarSign className="text-green-600 text-xs" />
                              <span className="font-bold text-green-700 text-base">
                                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customer.latestBalance)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm font-medium">No balance</span>
                          )}
                        </td>
                        <td className="py-5 px-6">
                          {editingCustomerId === customer._id ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => saveEdit(customer._id)}
                                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm"
                              >
                                <FaSave /> {t('common.save')}
                              </button>
                              <button
                                onClick={() => setEditingCustomerId(null)}
                                className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-sm"
                              >
                                <FaTimes /> {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => viewCustomerDetails(customer)}
                                className="text-purple-600 hover:text-purple-800 transition-all duration-200 p-2.5 hover:bg-purple-100 rounded-xl group"
                                title="View Details"
                              >
                                <FaEye size={18} className="group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => startEdit(customer)}
                                className="text-blue-600 hover:text-blue-800 transition-all duration-200 p-2.5 hover:bg-blue-100 rounded-xl group"
                                title="Edit Customer"
                              >
                                <FaEdit size={18} className="group-hover:scale-110 transition-transform" />
                              </button>
                              <button
                                onClick={() => handleDeleteCustomer(customer)}
                                className="text-red-600 hover:text-red-800 transition-all duration-200 p-2.5 hover:bg-red-100 rounded-xl group"
                                title="Delete Customer"
                              >
                                <FaTrashAlt size={18} className="group-hover:scale-110 transition-transform" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="text-center py-16 bg-gradient-to-br from-gray-50 to-blue-50"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-8 rounded-2xl shadow-lg">
                            <FaUser className="text-gray-400 text-5xl" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-xl">{t('customers.messages.noCustomers')}</p>
                            <p className="text-sm text-gray-600 mt-2">{t('customers.description')}</p>
                          </div>
                          <button
                            onClick={() => setShowAddForm(true)}
                            className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
                          >
                            <FaUserPlus className="text-lg" /> {t('customers.addCustomer')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sortedCustomers.length > 0 ? (
                sortedCustomers.map((customer) => (
                  <div
                    key={customer._id}
                    className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-2xl transition-all duration-300 hover:border-blue-400 hover:-translate-y-1 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {editingCustomerId === customer._id ? (
                      <div className="space-y-4 relative z-10">
                        <input
                          type="text"
                          name="name"
                          value={editForm.name}
                          onChange={handleEditChange}
                          className="border-2 border-blue-300 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500 font-medium"
                          placeholder="Customer Name"
                        />
                        <input
                          type="text"
                          name="address"
                          value={editForm.address}
                          onChange={handleEditChange}
                          className="border-2 border-blue-300 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-500"
                          placeholder="Address"
                        />
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => saveEdit(customer._id)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:from-green-700 hover:to-green-800 transition-all duration-200 font-semibold shadow-md"
                          >
                            <FaSave /> {t('common.save')}
                          </button>
                          <button
                            onClick={() => setEditingCustomerId(null)}
                            className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-3 rounded-xl flex items-center justify-center gap-2 hover:from-gray-700 hover:to-gray-800 transition-all duration-200 font-semibold shadow-md"
                          >
                            <FaTimes /> {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-5 relative z-10">
                          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg">
                            #{customer.displaySrNo}
                          </div>
                          {customer.latestBalance > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-3 py-1.5 rounded-lg border border-green-200">
                              <div className="flex items-center gap-1">
                                <FaDollarSign className="text-green-600 text-xs" />
                                <span className="font-bold text-green-700 text-xs">
                                  {new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(customer.latestBalance)}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="mb-5 relative z-10">
                          <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                            <div className="bg-gray-100 p-2 rounded-lg">
                              <FaUser className="text-gray-600 text-sm" />
                            </div>
                            {customer.name}
                          </h3>

                          <div className="space-y-2">
                            <div className="flex items-start gap-2 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                              <FaMapMarkerAlt className="text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="flex-1">{customer.address || 'No address provided'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-5 border-t-2 border-gray-100 relative z-10">
                          <button
                            onClick={() => viewCustomerDetails(customer)}
                            className="flex-1 text-purple-600 hover:bg-purple-50 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold border-2 border-purple-200 hover:border-purple-300 hover:shadow-md"
                          >
                            <FaEye /> {t('common.view')}
                          </button>
                          <button
                            onClick={() => startEdit(customer)}
                            className="flex-1 text-blue-600 hover:bg-blue-50 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold border-2 border-blue-200 hover:border-blue-300 hover:shadow-md"
                          >
                            <FaEdit /> {t('common.edit')}
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer)}
                            className="flex-1 text-red-600 hover:bg-red-50 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 font-semibold border-2 border-red-200 hover:border-red-300 hover:shadow-md"
                          >
                            <FaTrashAlt /> {t('common.delete')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-full text-center py-16 text-gray-500 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="flex flex-col items-center gap-4">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl shadow-inner">
                      <FaUser className="text-gray-400 text-5xl" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-700 text-lg">{t('customers.messages.noCustomers')}</p>
                      <p className="text-sm text-gray-500 mt-2">{t('customers.description')}</p>
                    </div>
                    <button
                      onClick={() => setShowAddForm(true)}
                      className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <FaUserPlus /> {t('customers.addCustomer')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-y-auto border-2 border-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 text-white p-5 rounded-t-2xl sticky top-0 z-10 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-md p-2.5 rounded-lg shadow-lg">
                    <FaUser className="text-xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedCustomer.name}</h2>
                    <p className="text-blue-200 mt-1 text-xs font-semibold">
                      ID: #{selectedCustomer.displaySrNo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate('/vendor/customers');
                  }}
                  className="text-white hover:bg-white/10 p-3 rounded-xl transition-all duration-200 hover:rotate-90"
                >
                  <FaTimes size={26} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-blue-50">
              {/* Basic Info */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-lg">
                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <FaUser className="text-blue-600 text-sm" />
                  Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-xl shadow-md border border-blue-200">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                      <span className="bg-blue-500 text-white p-1.5 rounded-lg text-xs">#</span>
                      Serial Number
                    </p>
                    <p className="text-3xl font-bold text-blue-700">{selectedCustomer.displaySrNo}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl shadow-md border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                      <FaUser className="text-gray-500" />
                      Customer Name
                    </p>
                    <p className="text-xl font-bold text-gray-900">{selectedCustomer.name}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-xl shadow-md border border-purple-200">
                    <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                      <FaMapMarkerAlt className="text-purple-500" />
                      Address
                    </p>
                    <p className="text-sm font-semibold text-gray-900">{selectedCustomer.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Financial Stats */}
              {loadingStats ? (
                <div className="flex items-center justify-center py-12 bg-white rounded-xl border border-gray-100 shadow-lg">
                  <FaSpinner className="animate-spin text-blue-600 text-3xl" />
                  <p className="ml-3 text-gray-700 font-semibold">Loading...</p>
                </div>
              ) : customerStats && (
                <>
                  {/* Stats Overview */}
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-lg">
                    <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
                      <FaChartLine className="text-green-600 text-sm" />
                      Financial Summary
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <div className="group bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border-2 border-blue-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-blue-400">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaReceipt className="text-blue-600" />
                          Receipts
                        </p>
                        <p className="text-3xl font-bold text-blue-700">{customerStats.totalReceipts}</p>
                      </div>
                      <div className="group bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border-2 border-green-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-green-400 cursor-pointer">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaDollarSign className="text-green-600" />
                          Income
                        </p>
                        <p className="text-xl font-bold text-green-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customerStats.totalIncome)}
                        </p>
                      </div>
                      <div className="group bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border-2 border-purple-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-purple-400 cursor-pointer">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaMoneyBillWave className="text-purple-600" />
                          Payments
                        </p>
                        <p className="text-xl font-bold text-purple-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customerStats.totalPayment)}
                        </p>
                      </div>
                      <div className="group bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl border-2 border-orange-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-orange-400 cursor-pointer">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaDollarSign className="text-orange-600" />
                          Balance
                        </p>
                        <p className="text-xl font-bold text-orange-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customerStats.balance)}
                        </p>
                      </div>
                      <div className="group bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border-2 border-red-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-red-400 cursor-pointer">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaMinus className="text-red-600" />
                          Deduction
                        </p>
                        <p className="text-xl font-bold text-red-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customerStats.totalDeduction)}
                        </p>
                      </div>
                      <div className="group bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl border-2 border-indigo-200 shadow-md hover:shadow-xl transition-all duration-200 hover:scale-105 hover:border-indigo-400 cursor-pointer">
                        <p className="text-xs text-gray-600 mb-2 flex items-center gap-2 font-semibold uppercase tracking-wider">
                          <FaChartLine className="text-indigo-600" />
                          Avg Income
                        </p>
                        <p className="text-xl font-bold text-indigo-700">
                          {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(customerStats.avgIncome)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Receipts */}
                  {customerStats.recentReceipts && customerStats.recentReceipts.length > 0 && (
                    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-lg">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                          <FaReceipt className="text-blue-600 text-sm" />
                          Receipts
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                            {customerStats.recentReceipts.length}/{customerStats.totalReceipts}
                          </span>
                        </h3>
                      </div>
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                        {customerStats.recentReceipts.map((receipt, index) => (
                          <div
                            key={receipt._id}
                            onClick={() => viewReceiptDetails(receipt._id)}
                            className={`group flex items-center justify-between p-4 rounded-xl hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-blue-400 hover:-translate-y-0.5 ${index % 2 === 0 ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'
                              } hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50`}
                          >
                            <div className="flex items-center gap-5 flex-1">
                              <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-xl group-hover:from-blue-500 group-hover:to-blue-600 transition-all duration-200 shadow-md">
                                <FaReceipt className="text-blue-600 group-hover:text-white text-xl transition-colors" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <p className="font-bold text-gray-900 text-base">
                                    {dayjs(receipt.date).format('DD MMM YYYY')}
                                  </p>
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                  <p className="text-sm text-gray-600 font-medium">
                                    {dayjs(receipt.date).format('hh:mm A')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                  <span className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">{receipt.businessName || 'N/A'}</span>
                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                                  <span className="text-gray-600 font-medium bg-gray-100 px-3 py-1 rounded-lg">{receipt.customerCompany || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="text-right bg-green-50 px-4 py-3 rounded-xl border border-green-200">
                                <p className="text-xs text-gray-600 mb-1 font-semibold uppercase tracking-wider">Income</p>
                                <p className="font-bold text-green-700 text-base">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.totalIncome || 0)}
                                </p>
                              </div>
                              <div className="text-right bg-purple-50 px-4 py-3 rounded-xl border border-purple-200">
                                <p className="text-xs text-gray-600 mb-1 font-semibold uppercase tracking-wider">Payment</p>
                                <p className="font-bold text-purple-700 text-base">
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(receipt.payment || 0)}
                                </p>
                              </div>
                              <div className="text-right bg-orange-50 px-4 py-3 rounded-xl border border-orange-200">
                                <p className="text-xs text-gray-600 mb-1 font-semibold uppercase tracking-wider">Balance</p>
                                <p className={`font-bold text-base ${(receipt.finalTotalAfterChuk || 0) >= 0 ? 'text-orange-700' : 'text-red-700'}`}>
                                  {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(receipt.finalTotalAfterChuk || 0))}
                                </p>
                              </div>
                              <FaArrowRight className="text-blue-600 opacity-0 group-hover:opacity-100 transition-all duration-200 text-xl" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {customerStats.totalReceipts === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-md">
                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-6 rounded-2xl inline-block mb-4 shadow-lg">
                        <FaReceipt className="text-gray-400 text-5xl" />
                      </div>
                      <p className="text-gray-800 font-bold text-lg">No receipts found</p>
                      <p className="text-sm text-gray-600 mt-2">Create a receipt to start tracking transactions</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Bottom Sheet */}
      {showAddForm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={() => {
              setShowAddForm(false);
              setNewCustomer({ name: "", address: "" });
            }}
          />

          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center animate-slide-up">
            <div className="bg-white rounded-t-3xl shadow-2xl border-t-2 border-gray-200 max-h-[85vh] overflow-y-auto w-full max-w-2xl mx-auto">
              {/* Handle Bar */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-14 h-1.5 bg-gray-300 rounded-full hover:bg-gray-400 transition-colors cursor-grab active:cursor-grabbing"></div>
              </div>

              {/* Content */}
              <div className="px-6 sm:px-8 pb-8">
                <form onSubmit={handleAddCustomer}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2.5 rounded-xl shadow-lg">
                        <FaUserPlus className="text-white text-lg" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Add New Customer</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Fill in the customer details below</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCustomer({ name: "", address: "" });
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <FaTimes className="text-xl" />
                    </button>
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-5 mb-6">
                    {/* Sr.No */}
                    <div className="space-y-2">
                      <label className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <span className="text-blue-600">#</span>
                        Serial Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={customers.length + 1}
                          disabled
                          className="border-2 border-gray-200 rounded-xl p-3.5 w-full bg-gray-50 cursor-not-allowed font-bold text-gray-600 text-center text-lg"
                        />
                        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                      <label className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <FaUser className="text-blue-600 text-xs" />
                        Customer Name
                        <span className="text-red-500 text-lg">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={newCustomer.name}
                        onChange={handleNewCustomerChange}
                        placeholder="Enter full customer name"
                        className="border-2 border-gray-200 rounded-xl p-3.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-400"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Address */}
                    <div className="space-y-2">
                      <label className="font-semibold text-gray-700 text-sm flex items-center gap-2">
                        <FaMapMarkerAlt className="text-blue-600 text-xs" />
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={newCustomer.address}
                        onChange={handleNewCustomerChange}
                        placeholder="Enter complete address"
                        className="border-2 border-gray-200 rounded-xl p-3.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-5 border-t-2 border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false);
                        setNewCustomer({ name: "", address: "" });
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 px-6 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 border-2 border-gray-200 hover:border-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:shadow-xl"
                    >
                      {isSubmitting ? (
                        <>
                          <FaSpinner className="animate-spin text-lg" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="text-lg" />
                          <span>Add Customer</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerTab;