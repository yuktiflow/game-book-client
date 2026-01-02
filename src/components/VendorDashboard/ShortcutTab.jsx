import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import LoadingSpinner from "./components/LoadingSpinner";
import { FaUsers, FaUndo, FaBolt, FaReceipt, FaPlus, FaMinus, FaChevronDown, FaChevronUp, FaSave } from "react-icons/fa";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const COMPANY_NAMES = [
  "कल्याण",
  "मेन बाजार",
  "श्रीदेवी",
  "श्रीदेवी नाईट",
  "मिलन डे",
  "मिलन नाईट",
];

const ShortcutTab = ({ businessName }) => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [shortcutData, setShortcutData] = useState({});
  const [expandedFinancials, setExpandedFinancials] = useState({});
  const [savingCustomers, setSavingCustomers] = useState({});
  const [selectedDate, setSelectedDate] = useState(dayjs().format("YYYY-MM-DD"));
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customers.length > 0) {
      fetchReceiptsForDate(selectedDate);
    }
  }, [selectedDate, customers]);

  const fetchCustomers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedCustomers = (res.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );
      setCustomers(sortedCustomers);
    } catch (err) {
      console.error("Error fetching customers:", err);
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  const fetchReceiptsForDate = async (date) => {
    try {
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log("Selected date:", date);
      console.log("All receipts:", res.data.receipts);
      
      // Sort receipts by date (latest first) to get most recent financial data
      const sortedReceipts = res.data.receipts.sort((a, b) => 
        new Date(b.date) - new Date(a.date)
      );
      
      const receiptsForDate = sortedReceipts.filter((receipt) => {
        const receiptDate = dayjs(receipt.date).format("YYYY-MM-DD");
        console.log(`Comparing: ${receiptDate} === ${date}`, receiptDate === date);
        return receiptDate === date;
      });

      console.log("Receipts for date:", receiptsForDate);

      // Auto-fill data for customers who have receipts on this date
      // If multiple receipts exist for same customer on same date, use the latest one
      const newShortcutData = {};
      
      // Group receipts by customer and pick the latest for each customer on this date
      const customerReceiptsMap = {};
      receiptsForDate.forEach((receipt) => {
        const customerId = receipt.customerId;
        if (!customerReceiptsMap[customerId]) {
          customerReceiptsMap[customerId] = [];
        }
        customerReceiptsMap[customerId].push(receipt);
      });
      
      // For each customer, pick the latest receipt (sort by createdAt or updatedAt)
      Object.keys(customerReceiptsMap).forEach((customerId) => {
        const customerReceipts = customerReceiptsMap[customerId];
        
        // Sort by updatedAt or createdAt to get the latest receipt
        const latestReceipt = customerReceipts.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        )[0];
        
        // Map gameRows properly with all fields
        const mappedGameRows = (latestReceipt.gameRows || []).map((row) => {
          // Set default multiplier based on type if not present (for old receipts)
          let multiplier = row.multiplier;
          if (multiplier === undefined && row.type) {
            if (row.type === 'आ.' || row.type === 'आ') {
              multiplier = 8;
            } else if (row.type === 'कु.' || row.type === 'कु') {
              multiplier = 9;
            }
          }
          
          return {
            type: row.type || '',
            income: row.income || '',
            o: row.o || '',
            jod: row.jod || '',
            ko: row.ko || '',
            multiplier: multiplier,
            pan: row.pan || { type: 'sp', val1: '', val2: '' },
            gun: row.gun || { val1: '', val2: '' },
            special: row.special || { type: 'jackpot', val1: '', val2: '' },
          };
        });
        
        newShortcutData[customerId] = {
          open: latestReceipt.openCloseValues?.open || "",
          close: latestReceipt.openCloseValues?.close || "",
          jod: latestReceipt.openCloseValues?.jod || "",
          company: latestReceipt.customerCompany || "",
          gameRows: mappedGameRows,
          jama: latestReceipt.jama || 0,
          chuk: latestReceipt.chuk || 0,
          advanceAmount: latestReceipt.advanceAmount || 0,
          cuttingAmount: latestReceipt.cuttingAmount || 0,
        };
      });
      
      // Get latest financial data for ALL customers (for those without receipts on selected date)
      const latestFinancialData = {};
      customers.forEach((customer) => {
        const customerReceipts = sortedReceipts.filter(r => r.customerId === customer._id);
        if (customerReceipts.length > 0) {
          const latestReceipt = customerReceipts[0]; // Already sorted by date (latest first)
          latestFinancialData[customer._id] = {
            previousBalance: latestReceipt.remainingBalance || 0,
            previousAdvance: latestReceipt.finalTotal || 0,
          };
        }
      });
      
      // For customers WITHOUT receipts on this date, initialize with their latest financial data
      customers.forEach((customer) => {
        if (!newShortcutData[customer._id]) {
          // Initialize with default game rows (आ. and कु.) with multipliers
          newShortcutData[customer._id] = {
            open: "",
            close: "",
            jod: "",
            company: "",
            gameRows: [
              { 
                type: 'आ.', 
                income: '', 
                o: '', 
                jod: '', 
                ko: '',
                multiplier: 8,
                pan: { val1: '', val2: '' },
                gun: { val1: '', val2: '' },
                special: { val1: '', val2: '' },
              },
              { 
                type: 'कु.', 
                income: '', 
                o: '', 
                jod: '', 
                ko: '',
                multiplier: 9,
                pan: { val1: '', val2: '' },
                gun: { val1: '', val2: '' },
                special: { val1: '', val2: '' },
              },
            ],
            jama: latestFinancialData[customer._id]?.previousBalance || 0,
            chuk: 0,
            advanceAmount: latestFinancialData[customer._id]?.previousAdvance || 0,
            cuttingAmount: 0,
          };
        }
      });
      
      console.log("Setting shortcut data:", newShortcutData);
      setShortcutData(newShortcutData);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast.error("Failed to load receipts for selected date");
    }
  };

  const handleInputChange = (customerId, field, value) => {
    setShortcutData((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        [field]: value,
      },
    }));
  };

  const handleGameRowChange = (customerId, rowIndex, field, value) => {
    setShortcutData((prev) => {
      const customerData = prev[customerId] || {};
      const gameRows = customerData.gameRows || [];
      const updatedRows = [...gameRows];
      
      if (field.includes('pan') || field.includes('gun') || field.includes('special')) {
        const [mainField, subField] = field.split('.');
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          [mainField]: {
            ...(updatedRows[rowIndex][mainField] || {}),
            [subField]: value,
          },
        };
      } else {
        updatedRows[rowIndex] = {
          ...updatedRows[rowIndex],
          [field]: value,
        };
      }
      
      return {
        ...prev,
        [customerId]: {
          ...customerData,
          gameRows: updatedRows,
        },
      };
    });
  };

  const addGameRow = (customerId, type = '') => {
    setShortcutData((prev) => {
      const customerData = prev[customerId] || {};
      const gameRows = customerData.gameRows || [];
      
      // Set multiplier based on type
      const multiplier = type === 'आ.' ? 8 : type === 'कु.' ? 9 : undefined;
      
      return {
        ...prev,
        [customerId]: {
          ...customerData,
          gameRows: [...gameRows, { 
            type: type, 
            income: '', 
            o: '', 
            jod: '', 
            ko: '',
            multiplier: multiplier,
            pan: { val1: '', val2: '' },
            gun: { val1: '', val2: '' },
            special: { val1: '', val2: '' },
          }],
        },
      };
    });
  };

  const initializeDefaultRows = (customerId) => {
    setShortcutData((prev) => {
      const customerData = prev[customerId] || {};
      if (customerData.gameRows && customerData.gameRows.length > 0) {
        return prev; // Already initialized
      }
      
      return {
        ...prev,
        [customerId]: {
          ...customerData,
          gameRows: [
            { 
              type: 'आ.', 
              income: '', 
              o: '', 
              jod: '', 
              ko: '',
              multiplier: 8,
              pan: { val1: '', val2: '' },
              gun: { val1: '', val2: '' },
              special: { val1: '', val2: '' },
            },
            { 
              type: 'कु.', 
              income: '', 
              o: '', 
              jod: '', 
              ko: '',
              multiplier: 9,
              pan: { val1: '', val2: '' },
              gun: { val1: '', val2: '' },
              special: { val1: '', val2: '' },
            },
          ],
        },
      };
    });
  };

  const calculateCustomerTotals = (customerData) => {
    const gameRows = customerData.gameRows || [];
    
    // Calculate O, Jod, Ko totals with multipliers
    let oFinalTotal = 0;
    let jodFinalTotal = 0;
    let koFinalTotal = 0;
    let panFinalTotal = 0;
    let gunFinalTotal = 0;
    let specialFinalTotal = 0;

    gameRows.forEach((row) => {
      const oVal = parseFloat(row.o) || 0;
      const jodVal = parseFloat(row.jod) || 0;
      const koVal = parseFloat(row.ko) || 0;
      const multiplier = row.multiplier;

      if (multiplier !== undefined) {
        oFinalTotal += oVal * Number(multiplier);
        jodFinalTotal += jodVal * Number(multiplier) * 10;
        koFinalTotal += koVal * Number(multiplier);
      } else {
        oFinalTotal += oVal;
        jodFinalTotal += jodVal;
        koFinalTotal += koVal;
      }

      const panVal1 = Number(row.pan?.val1) || 0;
      const panVal2 = Number(row.pan?.val2) || 0;
      panFinalTotal += panVal1 * panVal2;

      const gunVal1 = Number(row.gun?.val1) || 0;
      const gunVal2 = Number(row.gun?.val2) || 0;
      gunFinalTotal += gunVal1 * gunVal2;

      const specialVal1 = Number(row.special?.val1) || 0;
      const specialVal2 = Number(row.special?.val2) || 0;
      specialFinalTotal += specialVal1 * specialVal2;
    });

    // Calculate total income from income field
    const totalIncome = gameRows.reduce(
      (sum, row) => sum + (Number(row.income) || 0),
      0
    );

    // Calculate payment from all game totals
    const payment =
      oFinalTotal +
      jodFinalTotal +
      koFinalTotal +
      panFinalTotal +
      gunFinalTotal +
      specialFinalTotal;

    // Calculate deduction (10%)
    const deduction = totalIncome * 0.1;
    const afterDeduction = totalIncome - deduction;
    const remainingBalance = afterDeduction - payment;
    
    // Get user inputs
    const jama = Number(customerData.jama) || 0;
    const totalDue = remainingBalance;
    const jamaTotal = totalDue - jama;
    
    const chuk = Number(customerData.chuk) || 0;
    const finalTotalAfterChuk = jamaTotal - chuk;
    
    const advanceAmount = Number(customerData.advanceAmount) || 0;
    const cuttingAmount = Number(customerData.cuttingAmount) || 0;
    const finalTotal = finalTotalAfterChuk - advanceAmount - cuttingAmount;

    return {
      totalIncome,
      deduction,
      afterDeduction,
      payment,
      remainingBalance,
      totalDue,
      jamaTotal,
      chuk,
      finalTotalAfterChuk,
      finalTotal,
      oFinalTotal,
      jodFinalTotal,
      koFinalTotal,
      panFinalTotal,
      gunFinalTotal,
      specialFinalTotal,
    };
  };

  const removeGameRow = (customerId, rowIndex) => {
    setShortcutData((prev) => {
      const customerData = prev[customerId] || {};
      const gameRows = customerData.gameRows || [];
      
      return {
        ...prev,
        [customerId]: {
          ...customerData,
          gameRows: gameRows.filter((_, index) => index !== rowIndex),
        },
      };
    });
  };

  const handleCreateReceipts = async () => {
    const receiptsToCreate = Object.entries(shortcutData).filter(
      ([_, data]) => data.open || data.close || (data.gameRows && data.gameRows.length > 0)
    );

    if (receiptsToCreate.length === 0) {
      toast.warning("Please enter at least one field for any customer");
      return;
    }

    if (!window.confirm(`Create receipts for ${receiptsToCreate.length} customer(s)?`)) {
      return;
    }

    setCreating(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const [customerId, data] of receiptsToCreate) {
        const customer = customers.find(c => c._id === customerId);
        if (!customer) continue;

        try {
          // Prepare game rows from shortcut data
          const gameRows = (data.gameRows || []).map((row, index) => ({
            id: Date.now() + index,
            type: row.type || '',
            income: row.income || '',
            o: row.o || '',
            jod: row.jod || '',
            ko: row.ko || '',
            multiplier: undefined,
            pan: row.pan || { type: 'sp', val1: '', val2: '' },
            gun: row.gun || { val1: '', val2: '' },
            special: row.special || { type: 'jackpot', val1: '', val2: '' },
          }));

          // Calculate totals
          const totals = calculateCustomerTotals(data);

          const receiptData = {
            customerId: customerId,
            customerName: customer.name,
            customerCompany: customer.company || "",
            businessName: businessName || "Game Book",
            date: new Date().toISOString(),
            day: dayjs().format("dddd"),
            openCloseValues: {
              open: data.open || "",
              close: data.close || "",
              jod: data.jod || "",
            },
            gameRows: gameRows,
            totalIncome: totals.totalIncome,
            deduction: totals.deduction,
            afterDeduction: totals.afterDeduction,
            payment: 0,
            remainingBalance: totals.afterDeduction,
            pendingAmount: 0,
            totalDue: totals.afterDeduction,
            oFinalTotal: 0,
            jodFinalTotal: 0,
            koFinalTotal: 0,
            panFinalTotal: 0,
            gunFinalTotal: 0,
            specialFinalTotal: 0,
            jama: Number(data.jama) || 0,
            jamaTotal: totals.jamaTotal,
            chuk: Number(data.chuk) || 0,
            isChukEnabled: false,
            finalTotalAfterChuk: totals.finalTotalAfterChuk,
            advanceAmount: Number(data.advanceAmount) || 0,
            cuttingAmount: Number(data.cuttingAmount) || 0,
            finalTotal: totals.finalTotal,
          };

          await axios.post(`${API_BASE_URI}/api/receipts`, receiptData, {
            headers: { Authorization: `Bearer ${token}` },
          });

          successCount++;
        } catch (err) {
          console.error(`Error creating receipt for ${customer.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully created ${successCount} receipt(s)!`);
        setShortcutData({});
        
        // Navigate to view receipts after a short delay
        setTimeout(() => {
          navigate("/vendor/viewReceipts");
        }, 1500);
      }

      if (errorCount > 0) {
        toast.error(`Failed to create ${errorCount} receipt(s)`);
      }
    } catch (err) {
      console.error("Error creating receipts:", err);
      toast.error("Failed to create receipts");
    } finally {
      setCreating(false);
    }
  };

  const handleSaveCustomer = async (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    const data = shortcutData[customerId];

    if (!data || (!data.open && !data.close && (!data.gameRows || data.gameRows.length === 0))) {
      toast.warning("Please enter some data before saving");
      return;
    }

    setSavingCustomers(prev => ({ ...prev, [customerId]: true }));

    try {
      // Prepare game rows from shortcut data
      const gameRows = (data.gameRows || []).map((row, index) => ({
        id: Date.now() + index,
        type: row.type || '',
        income: row.income || '',
        o: row.o || '',
        jod: row.jod || '',
        ko: row.ko || '',
        multiplier: undefined,
        pan: row.pan || { type: 'sp', val1: '', val2: '' },
        gun: row.gun || { val1: '', val2: '' },
        special: row.special || { type: 'jackpot', val1: '', val2: '' },
      }));

      // Calculate totals
      const totals = calculateCustomerTotals(data);

      const receiptData = {
        customerId: customerId,
        customerName: customer.name,
        customerCompany: data.company || "",
        businessName: businessName || "Game Book",
        date: new Date().toISOString(),
        day: dayjs().format("dddd"),
        openCloseValues: {
          open: data.open || "",
          close: data.close || "",
          jod: data.jod || "",
        },
        gameRows: gameRows,
        totalIncome: totals.totalIncome,
        deduction: totals.deduction,
        afterDeduction: totals.afterDeduction,
        payment: 0,
        remainingBalance: totals.afterDeduction,
        pendingAmount: 0,
        totalDue: totals.afterDeduction,
        oFinalTotal: 0,
        jodFinalTotal: 0,
        koFinalTotal: 0,
        panFinalTotal: 0,
        gunFinalTotal: 0,
        specialFinalTotal: 0,
        jama: Number(data.jama) || 0,
        jamaTotal: totals.jamaTotal,
        chuk: Number(data.chuk) || 0,
        isChukEnabled: false,
        finalTotalAfterChuk: totals.finalTotalAfterChuk,
        advanceAmount: Number(data.advanceAmount) || 0,
        cuttingAmount: Number(data.cuttingAmount) || 0,
        finalTotal: totals.finalTotal,
      };

      await axios.post(`${API_BASE_URI}/api/receipts`, receiptData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Receipt created for ${customer.name}!`);
      
      // Clear this customer's data
      setShortcutData(prev => {
        const updated = { ...prev };
        delete updated[customerId];
        return updated;
      });
    } catch (err) {
      console.error(`Error creating receipt for ${customer.name}:`, err);
      toast.error(`Failed to create receipt for ${customer.name}`);
    } finally {
      setSavingCustomers(prev => ({ ...prev, [customerId]: false }));
    }
  };

  const toggleFinancialSummary = (customerId) => {
    setExpandedFinancials(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to clear all shortcuts?")) {
      setShortcutData({});
      toast.info("Shortcuts cleared");
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading customers..." />;
  }

  return (
    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen p-4 sm:p-6 lg:p-8">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-slate-100 p-3 rounded-lg">
                  <FaBolt className="text-slate-600 text-2xl" />
                </div>
                Quick Receipt Shortcuts
              </h1>
              <p className="text-gray-600 mt-2">
                Enter ओ (Open) and क्लो (Close) values for quick receipt creation
              </p>
            </div>
            {/* <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-gray-700">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                />
              </div>
              <button
                onClick={handleReset}
                disabled={creating}
                className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition shadow-md disabled:opacity-50"
              >
                <FaUndo /> Reset All
              </button>
            </div> */}
          </div>
        </div>

        {/* Date Info Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-500 p-2 rounded-lg">
              <FaReceipt className="text-white text-xl" />
            </div>
            <div>
               <p className="text-lg font-bold text-gray-800">
                {dayjs(selectedDate).format("DD MMMM YYYY, dddd")}
              </p>
            </div>
          </div>
        </div>

        

        {/* Customers Grid */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <FaUsers className="text-slate-600" />
            Customer Shortcuts
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {customers.map((customer, index) => {
              const customerData = shortcutData[customer._id] || {};
              const gameRows = customerData.gameRows || [];
              const totals = calculateCustomerTotals(customerData);
              
              // Initialize default rows only if customer has no data at all (not from fetched receipts)
              if (!shortcutData[customer._id]) {
                setTimeout(() => initializeDefaultRows(customer._id), 0);
              }
              
              return (
                <div
                  key={customer._id}
                  className="bg-gradient-to-br from-white to-slate-50 border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all"
                >
                  {/* Customer Header */}
                  <div className="bg-gradient-to-r from-slate-600 to-slate-700 text-white p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                      <span className="text-xs opacity-75">Sr.No: {customer.srNo}</span>
                    </div>
                    <h3 className="text-lg font-bold" title={customer.name}>
                      {customer.name}
                    </h3>
                    {customer.company && (
                      <p className="text-sm opacity-90 mt-1" title={customer.company}>
                        {customer.company}
                      </p>
                    )}
                  </div>

                  <div className="p-5">

                  {/* Company Dropdown */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Name
                    </label>
                    <select
                      value={customerData.company || ""}
                      onChange={(e) =>
                        handleInputChange(customer._id, "company", e.target.value)
                      }
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition bg-white"
                    >
                      <option value="">Select Company</option>
                      {COMPANY_NAMES.map((company) => (
                        <option key={company} value={company}>
                          {company}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Open/Close/Jod Fields */}
                  <div className="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        ओ (Open)
                      </label>
                      <input
                        type="text"
                        value={customerData.open || ""}
                        onChange={(e) =>
                          handleInputChange(customer._id, "open", e.target.value)
                        }
                        placeholder="Open"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        क्लो (Close)
                      </label>
                      <input
                        type="text"
                        value={customerData.close || ""}
                        onChange={(e) =>
                          handleInputChange(customer._id, "close", e.target.value)
                        }
                        placeholder="Close"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        जोड (Jod)
                      </label>
                      <input
                        type="text"
                        value={customerData.jod || ""}
                        onChange={(e) =>
                          handleInputChange(customer._id, "jod", e.target.value)
                        }
                        placeholder="Jod"
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition"
                      />
                    </div>
                  </div>

                  {/* Game Rows */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-bold text-gray-700">Game Rows</h4>
                      <button
                        onClick={() => addGameRow(customer._id, '')}
                        className="flex items-center gap-1 bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 transition text-sm"
                      >
                        <FaPlus size={12} /> Add Row
                      </button>
                    </div>

                    {gameRows.length === 0 && (
                      <p className="text-sm text-gray-500 italic text-center py-3">
                        No game rows. Click "Add Row" to start.
                      </p>
                    )}

                    {gameRows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="bg-white border border-gray-300 rounded-lg p-3 relative"
                      >
                        <button
                          onClick={() => removeGameRow(customer._id, rowIndex)}
                          className="absolute top-2 right-2 text-red-500 hover:text-red-700 transition"
                          title="Remove Row"
                        >
                          <FaMinus size={14} />
                        </button>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              ओ. (Type)
                            </label>
                            <input
                              type="text"
                              value={row.type || ""}
                              onChange={(e) =>
                                handleGameRowChange(customer._id, rowIndex, "type", e.target.value)
                              }
                              placeholder="आ./कु."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              रक्कम (Income)
                            </label>
                            <input
                              type="text"
                              value={row.income || ""}
                              onChange={(e) =>
                                handleGameRowChange(customer._id, rowIndex, "income", e.target.value)
                              }
                              placeholder="Income"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              ओ. (O)
                            </label>
                            <input
                              type="text"
                              value={row.o || ""}
                              onChange={(e) =>
                                handleGameRowChange(customer._id, rowIndex, "o", e.target.value)
                              }
                              placeholder="O"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500"
                            />
                            {row.multiplier !== undefined && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span>*</span>
                                <input
                                  type="number"
                                  value={row.multiplier || ''}
                                  onChange={(e) =>
                                    handleGameRowChange(customer._id, rowIndex, "multiplier", e.target.value)
                                  }
                                  className="w-10 text-center border border-gray-300 rounded px-1"
                                />
                                <span>= {((parseFloat(row.o) || 0) * (row.multiplier || 0)).toFixed(0)}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              जोड (Jod)
                            </label>
                            <input
                              type="text"
                              value={row.jod || ""}
                              onChange={(e) =>
                                handleGameRowChange(customer._id, rowIndex, "jod", e.target.value)
                              }
                              placeholder="Jod"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500"
                            />
                            {row.multiplier !== undefined && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span>*</span>
                                <input
                                  type="number"
                                  value={(row.multiplier || 0) * 10}
                                  onChange={(e) =>
                                    handleGameRowChange(customer._id, rowIndex, "multiplier", (parseFloat(e.target.value) || 0) / 10)
                                  }
                                  className="w-10 text-center border border-gray-300 rounded px-1"
                                />
                                <span>= {((parseFloat(row.jod) || 0) * (row.multiplier || 0) * 10).toFixed(0)}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              को. (Ko)
                            </label>
                            <input
                              type="text"
                              value={row.ko || ""}
                              onChange={(e) =>
                                handleGameRowChange(customer._id, rowIndex, "ko", e.target.value)
                              }
                              placeholder="Ko"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500"
                            />
                            {row.multiplier !== undefined && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <span>*</span>
                                <input
                                  type="number"
                                  value={row.multiplier || ''}
                                  onChange={(e) =>
                                    handleGameRowChange(customer._id, rowIndex, "multiplier", e.target.value)
                                  }
                                  className="w-10 text-center border border-gray-300 rounded px-1"
                                />
                                <span>= {((parseFloat(row.ko) || 0) * (row.multiplier || 0)).toFixed(0)}</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              पान (Pan)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.pan?.val1 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "pan.val1", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                              <span className="text-xs">×</span>
                              <input
                                type="text"
                                value={row.pan?.val2 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "pan.val2", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              गुण (Gun)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.gun?.val1 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "gun.val1", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                              <span className="text-xs">×</span>
                              <input
                                type="text"
                                value={row.gun?.val2 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "gun.val2", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              जॅकपॉट (Special)
                            </label>
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={row.special?.val1 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "special.val1", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                              <span className="text-xs">×</span>
                              <input
                                type="text"
                                value={row.special?.val2 || ""}
                                onChange={(e) =>
                                  handleGameRowChange(customer._id, rowIndex, "special.val2", e.target.value)
                                }
                                placeholder="0"
                                className="w-10 px-1 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-slate-500 text-center"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Summary (Collapsible) */}
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <button
                      onClick={() => toggleFinancialSummary(customer._id)}
                      className="w-full flex items-center justify-between text-left font-bold text-gray-700 mb-3 hover:text-slate-600 transition-colors"
                    >
                      <span className="text-md">Financial Summary</span>
                      {expandedFinancials[customer._id] ? (
                        <FaChevronUp className="text-sm" />
                      ) : (
                        <FaChevronDown className="text-sm" />
                      )}
                    </button>

                    {expandedFinancials[customer._id] && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Left Box */}
                          <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">जमा:-</span>
                          <input
                            type="number"
                            value={customerData.jama || ''}
                            onChange={(e) =>
                              handleInputChange(customer._id, "jama", e.target.value)
                            }
                            placeholder="0"
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex justify-between">
                          <span className="font-semibold">टो:-</span>
                          <span className="font-bold">{totals.jamaTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">चूक (NA):-</span>
                          <input
                            type="number"
                            value={customerData.chuk || ''}
                            onChange={(e) =>
                              handleInputChange(customer._id, "chuk", e.target.value)
                            }
                            placeholder="Enter amount"
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-semibold">
                            अंतिम टोटल {totals.finalTotalAfterChuk < 0 ? '(देणे)' : '(येणे)'}:-
                          </span>
                          <span className="font-bold text-lg text-slate-600">
                            {Math.abs(totals.finalTotalAfterChuk).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Right Box */}
                      <div className="bg-white border border-gray-300 rounded-lg p-3 space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">आड:-</span>
                          <input
                            type="number"
                            value={customerData.advanceAmount || ''}
                            onChange={(e) =>
                              handleInputChange(customer._id, "advanceAmount", e.target.value)
                            }
                            placeholder="0"
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">कटिंग:-</span>
                          <input
                            type="number"
                            value={customerData.cuttingAmount || ''}
                            onChange={(e) =>
                              handleInputChange(customer._id, "cuttingAmount", e.target.value)
                            }
                            placeholder="0"
                            className="w-24 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </div>
                        <div className="flex justify-between pt-2 border-t border-gray-200">
                          <span className="font-semibold">टो:-</span>
                          <span className="font-bold text-lg text-green-600">
                            {totals.finalTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                      </>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {(customerData.open || customerData.close || gameRows.length > 0) && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-600 font-medium">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Data entered - Ready to save receipt
                    </div>
                  )}

                  {/* Save Button - Bottom */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleSaveCustomer(customer._id)}
                      disabled={savingCustomers[customer._id]}
                      className="w-full bg-slate-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
                    >
                      <FaSave />
                      {savingCustomers[customer._id] ? 'Saving Receipt...' : 'Save Receipt'}
                    </button>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>

          {customers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FaUsers className="text-6xl mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No customers found</p>
              <p className="text-sm">Add customers to start using shortcuts</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 border-l-4 border-slate-500 rounded-lg p-4 mt-6">
          <div className="flex items-start gap-3">
            <div className="bg-slate-100 p-2 rounded-lg mt-1">
              <FaBolt className="text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Quick Tip</h3>
              <p className="text-sm text-slate-800">
                Enter ओ (Open) and क्लो (Close) values for customers, then click "Create Receipts" 
                to generate receipts for all selected customers at once. This saves time when creating 
                multiple receipts with the same open/close values.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShortcutTab;
