import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/mr"; // Import Marathi locale
import LoadingSpinner from "./components/LoadingSpinner";
import {
  FaTrashAlt,
  FaPrint,
  FaSearch,
  FaEdit,
  FaList,
  FaTh,
  FaFileInvoice,
  FaCalendarAlt,
  FaDollarSign,
  FaUser,
  FaFilter,
  FaFileExport,
  FaEye,
  FaTimes,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { useNavigate } from "react-router-dom";

dayjs.extend(customParseFormat);
dayjs.locale("mr"); // Set locale to Marathi

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const toNum = (value) => Number(value) || 0;

// Helper function to safely evaluate arithmetic expressions
const evaluateExpression = (expression) => {
  if (typeof expression !== "string" || !expression.trim()) {
    return 0;
  }
  try {
    let sanitized = expression.replace(/[^0-9+\-*/.]/g, "");
    sanitized = sanitized.replace(/[+\-*/.]+$/, "");
    if (!sanitized) return 0;
    // eslint-disable-next-line no-eval
    const result = eval(sanitized);
    return isFinite(result) ? result : 0;
  } catch (error) {
    return 0;
  }
};

// --- NEW: PrintableReceipt component copied from ReceiptForm.jsx ---
// This component is now a 1:1 match with your form's print/share layout.
const PrintableReceipt = React.forwardRef(({ receiptData }, ref) => {
  if (!receiptData) return null;

  // --- Logic to get the header for the 'special' column ---
  const getSpecialHeader = () => {
    const firstRowType = receiptData?.gameRows?.[0]?.special?.type || "jackpot";
    if (firstRowType === "berij") return "बेरीज";
    if (firstRowType === "frak") return "फरक";
    return "जॅकपॉट";
  };
  const specialColumnHeader = getSpecialHeader();

  // Helper to render the complex calculation cells for print
  const renderCellWithCalculation = (row, colName) => {
    const multiplier = row.multiplier;
    const hasMultiplier = multiplier !== undefined;
    const effectiveMultiplier = colName === "jod" ? multiplier * 10 : multiplier;
    const cellTotal = evaluateExpression(row[colName]) * effectiveMultiplier;

    return (
      <div className="flex flex-col items-end p-1">
        <div className="w-full text-center border-b border-gray-400 pb-1 mb-1">
          {row[colName] || "_"}
        </div>
        {hasMultiplier && (
          <span className="text-xs">
            * {effectiveMultiplier} = {cellTotal.toFixed(0)}
          </span>
        )}
      </div>
    );
  };

  // Helper to render Pan/Gun/Special cells for print
  const renderComplexCell = (data, fieldType) => {
    const result = (toNum(data?.val1) * toNum(data?.val2)).toFixed(0);
    let typeAbbr = "";

    if (fieldType === "pan") {
      typeAbbr = `(${(data?.type || "sp").toUpperCase()})`;
    } else if (fieldType === "special") {
      if (data?.type === "berij") typeAbbr = "(बे)";
      else if (data?.type === "frak") typeAbbr = "(फ)";
      else typeAbbr = "(जॅ)";
    }

    return (
      <div className="flex flex-col items-center justify-center p-1 text-center">
        <div>{`${data?.val1 || "_"} × ${data?.val2 || "_"} = ${result}`}</div>
        {typeAbbr && <span className="text-xs font-normal">{typeAbbr}</span>}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className="printable-area p-4 border border-gray-400 rounded-lg bg-white text-black"
    >
      {/* Header Section */}
      <div className="header-section relative pb-4 mb-4">
        <div className="text-center">
          <h2 className="font-bold text-2xl">{receiptData.businessName}</h2>
          <div className="company-header">
            <span className="font-bold">
              Company Name : {receiptData.customerCompany || "N/A"}
            </span>
          </div>
        </div>

        {/* Open/Close/Jod Display (Print Visible) */}
        <div className="values-section-print hidden">
          <div className="values-row">
            <span>ओपन:</span>
            <span>{receiptData.openCloseValues?.open || "___"}</span>
          </div>
          <div className="values-row">
            <span>क्लोज:</span>
            <span>{receiptData.openCloseValues?.close || "___"}</span>
          </div>
          <div className="values-row">
            <span>जोड:</span>
            <span>{receiptData.openCloseValues?.jod || "___"}</span>
          </div>
        </div>

        {/* Date, Day, and Customer Info */}
        <div className="info-section mt-4">
          <div className="date-info">
            <div>
              वार:- <span className="font-semibold">{receiptData.day}</span>
            </div>
            <div>
              दि:-{" "}
              <span className="font-semibold">
                {dayjs(receiptData.date).format("DD-MM-YYYY")}
              </span>
            </div>
            <div className="mt-2">
              <span className="customer-info">
                <strong>Sr.No:</strong> {receiptData.customerSrNo || "N/A"} |
                <strong> Customer Name:</strong>{" "}
                {receiptData.customerName || "N/A"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Rows Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed border-collapse">
          <colgroup>
            <col style={{ width: "6%" }} /> {/* ओ. */}
            <col style={{ width: "10%" }} /> {/* रक्कम */}
            <col style={{ width: "12%" }} /> {/* ओ. */}
            <col style={{ width: "12%" }} /> {/* जोड */}
            <col style={{ width: "12%" }} /> {/* को. */}
            <col style={{ width: "12%" }} /> {/* पान */}
            <col style={{ width: "12%" }} /> {/* गुण */}
            <col style={{ width: "12%" }} /> {/* जॅकपॉट/बे/फ */}
          </colgroup>
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-center">ओ.</th>
              <th className="border p-2 text-center">रक्कम</th>
              <th className="border p-2 text-center">ओ.</th>
              <th className="border p-2 text-center">जोड</th>
              <th className="border p-2 text-center">को.</th>
              <th className="border p-2 text-center">पान</th>
              <th className="border p-2 text-center">गुण</th>
              <th className="border p-2 text-center">{specialColumnHeader}</th>
            </tr>
          </thead>
          <tbody>
            {(receiptData.gameRows || []).map((row, index) => {
              if (row.type === "") {
                return (
                  <tr key={row.id || index}>
                    <td colSpan="2" className="border-l border-r border-t border-b p-2"></td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "o")}
                    </td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "jod")}
                    </td>
                    <td className="border border-l p-1">
                      {renderCellWithCalculation(row, "ko")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.pan, "pan")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.gun, "gun")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.special, "special")}
                    </td>
                  </tr>
                );
              } else {
                return (
                  <tr key={row.id || index}>
                    <td className="border p-2">{row.type}</td>
                    <td className="border p-2 text-right">{row.income}</td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "o")}
                    </td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "jod")}
                    </td>
                    <td className="border p-1">
                      {renderCellWithCalculation(row, "ko")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.pan, "pan")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.gun, "gun")}
                    </td>
                    <td className="border border-l p-1">
                      {renderComplexCell(row.special, "special")}
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
          <tbody className="bg-gray-50">
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.totalIncome).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">क.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.deduction).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.afterDeduction).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">पें.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.payment).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.remainingBalance).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">मा.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.pendingAmount).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr>
              <td className="border p-2">टो.</td>
              <td className="border p-2 text-right">
                {toNum(receiptData.totalDue).toFixed(2)}
              </td>
              <td colSpan="6" className="border p-2"></td>
            </tr>
            <tr className="bg-gray-50">
              <td
                colSpan="2"
                className="border p-2 font-bold text-right align-middle"
              >
                Total *
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.oFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.jodFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.koFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.panFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.gunFinalTotal).toFixed(2)}
              </td>
              <td className="border p-2 font-medium text-right">
                {toNum(receiptData.specialFinalTotal).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Calculation Boxes */}
      <div className="flex justify-between mt-4 bottom-box-container">
        <div className="w-1/2 mr-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between">
            <span>जमा:-</span>
            <span className="font-bold">
              {toNum(receiptData.jama).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>टो:-</span>
            <span className="font-bold">
              {toNum(receiptData.jamaTotal).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              चूक {receiptData.isChukEnabled ? "(LD)" : "(NA)"}:-
            </span>
            <span className="font-bold">
              {toNum(receiptData.chuk).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>
              अंतिम टोटल{" "}
              {toNum(receiptData.finalTotalAfterChuk) < 0 ? "(देणे)" : "(येणे)"}
              :-
            </span>
            <span className="font-bold">
              {Math.abs(toNum(receiptData.finalTotalAfterChuk)).toFixed(2)}
            </span>
          </div>
        </div>
        <div className="w-1/2 ml-2 p-2 border rounded-md space-y-2 text-sm bottom-box">
          <div className="flex justify-between">
            <span>आड:-</span>
            <span className="font-bold">
              {toNum(receiptData.advanceAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>कटिंग:-</span>
            <span className="font-bold">
              {toNum(receiptData.cuttingAmount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>टो:-</span>
            <span className="font-bold">
              {toNum(receiptData.finalTotal).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
// --- END: New PrintableReceipt component ---

const ViewReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [receiptToPrint, setReceiptToPrint] = useState(null);
  const [customerList, setCustomerList] = useState([]);
  const [viewMode, setViewMode] = useState(() => {
    // Default to grid view on mobile devices
    return window.innerWidth < 768 ? "grid" : "list";
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFilter, setDateFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const printRef = useRef();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchReceipts = useCallback(async () => {
    if (!token) {
      toast.error("Authentication error. Please log in again.");
      return;
    }
    try {
      const res = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const sortedReceipts = (res.data.receipts || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );
      setReceipts(sortedReceipts);
    } catch (err) {
      console.error("Error fetching receipts:", err);
      toast.error(err.response?.data?.message || "Failed to fetch receipts.");
    }
  }, [token]);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sortedCustomers = (res.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );

      const sequentialCustomers = sortedCustomers.map((customer, index) => ({
        ...customer,
        srNo: index + 1,
      }));

      setCustomerList(sequentialCustomers);
    } catch (err) {
      console.error("Error fetching customers:", err);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true); 
    Promise.all([fetchReceipts(), fetchCustomers()])
      .finally(() => setLoading(false)); 
  }, [fetchReceipts, fetchCustomers]);

  const handleDelete = async (receiptToDelete) => {
    if (
      window.confirm(
        `Are you sure you want to delete the receipt for ${receiptToDelete.customerName}?`
      )
    ) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${receiptToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setReceipts((prev) => prev.filter((r) => r._id !== receiptToDelete._id));
        toast.success("Receipt deleted successfully!");
      } catch (err) {
        console.error("Error deleting receipt:", err);
        toast.error(err.response?.data?.message || "Failed to delete receipt.");
      }
    }
  };

  // --- THIS EDIT LOGIC IS CORRECT ---
  // Its job is to navigate to the form with the receipt's ID.
  // The ReceiptForm.jsx component is responsible for fetching the data using this ID.
  const handleEdit = (receiptId) => {
    navigate(`/vendor/createReceipt/${receiptId}`);
  };

  const handlePrint = (receipt) => {
    setReceiptToPrint(receipt);
    setTimeout(() => {
      window.print();
      setReceiptToPrint(null);
    }, 100);
  };

  const customerSrNoMap = useMemo(() => {
    const map = new Map();
    customerList.forEach((customer) => {
      map.set(customer._id, customer.srNo);
    });
    return map;
  }, [customerList]);

  // Enrich receipts with customerSrNo and mark latest receipt per customer
  const enrichedReceipts = useMemo(() => {
    // Find latest receipt for each customer
    const latestReceiptMap = new Map();
    receipts.forEach((receipt) => {
      const customerId = receipt.customerId;
      const existingLatest = latestReceiptMap.get(customerId);
      if (!existingLatest || new Date(receipt.date) > new Date(existingLatest.date)) {
        latestReceiptMap.set(customerId, receipt);
      }
    });

    return receipts.map((receipt) => ({
      ...receipt,
      customerSrNo: customerSrNoMap.get(receipt.customerId) || 'N/A',
      isLatest: latestReceiptMap.get(receipt.customerId)?._id === receipt._id
    }));
  }, [receipts, customerSrNoMap]);

  // Filter receipts
  const filteredReceipts = enrichedReceipts.filter((receipt) => {
    const searchTerm = search.toLowerCase();
    let matchesSearch = true;
    
    if (searchTerm) {
      const nameMatch = (receipt.customerName || "").toLowerCase().includes(searchTerm);
      const srNoMatch = receipt.customerSrNo.toString() === searchTerm;
      const businessMatch = (receipt.businessName || "").toLowerCase().includes(searchTerm);
      matchesSearch = nameMatch || srNoMatch || businessMatch;
    }
    
    // Date filter
    let matchesDate = true;
    const receiptDate = dayjs(receipt.date);
    const today = dayjs();
    
    if (dateFilter === 'today') {
      matchesDate = receiptDate.isSame(today, 'day');
    } else if (dateFilter === 'week') {
      matchesDate = receiptDate.isAfter(today.subtract(7, 'day'));
    } else if (dateFilter === 'month') {
      matchesDate = receiptDate.isSame(today, 'month');
    }
    
    return matchesSearch && matchesDate;
  });

  // Sort receipts
  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    
    if (sortBy === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (sortBy === 'finalTotalAfterChuk' || sortBy === 'totalIncome') {
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

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const viewReceiptDetails = (receipt) => {
    setSelectedReceipt(receipt);
    setShowDetailsModal(true);
  };

  const exportToCSV = () => {
    const headers = ['Sr.No', 'Customer Name', 'Date', 'Total Income', 'Payment', 'Final Total', 'Balance'];
    const rows = sortedReceipts.map(r => [
      r.customerSrNo,
      r.customerName,
      dayjs(r.date).format('DD-MM-YYYY'),
      r.totalIncome || 0,
      r.payment || 0,
      r.finalTotalAfterChuk || 0,
      r.remainingBalance || 0
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Receipts exported successfully!');
  };

  // Calculate stats
  const totalReceipts = enrichedReceipts.length;
  const totalIncome = enrichedReceipts.reduce((sum, r) => sum + (toNum(r.totalIncome) || 0), 0);
  const totalBalance = enrichedReceipts.reduce((sum, r) => sum + (toNum(r.finalTotalAfterChuk) || 0), 0);

  if (loading) {
    return <LoadingSpinner message="Loading Receipts..." />;
  }

  return (
    <>
      <div className="hidden print:block">
        {receiptToPrint && (
          <PrintableReceipt receiptData={receiptToPrint} ref={printRef} />
        )}
      </div>

      {/* --- NEW: Style block copied from ReceiptForm.jsx --- */}
      <style>{`
        .printable-area {
          font-weight: bold;
        }
        
        .printable-area h2 {
          font-size: 18px !important;
          margin: 0 0 0.25rem 0 !important;
          text-align: center !important; font-weight: bold !important;
        }
        .printable-area .header-section {
          padding-bottom: 0.25rem !important;
          border-bottom: 2px solid #000 !important;
          position: relative !important;
        }
        .printable-area .company-header {
          text-align: center !important; font-size: 13px !important;
          font-weight: bold !important; margin: 0.25rem 0 !important;
        }
        .printable-area .info-section {
          margin-top: 0.25rem !important;
        }
        .printable-area .values-section-print {
          display: block !important;
          position: absolute !important;
          top: 35px !important;
          right: 0.5rem !important;
          border: none !important;
          padding: 0 !important;
          font-size: 11px !important;
        }
        .printable-area .values-row {
          display: flex !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }
        .printable-area table {
          width: 100% !important; margin: 0.4rem 0 !important;
        }
        .printable-area th, .printable-area td {
          padding: 5px 3px !important;
          border: 1px solid #000 !important;
          font-size: 11px !important;
          vertical-align: middle !important;
          text-align: center;
        }
        .printable-area td { text-align: right; }
        .printable-area td:first-child { text-align: center; }
        .printable-area .bottom-box-container { margin-top: 0.5rem !important; }
        .printable-area .bottom-box {
          border: 1px solid #000 !important;
          padding: 7px !important;
          font-weight: bold !important;
        }
        .printable-area .bottom-box div {
          font-size: 11px !important;
        }
        .printable-area .bottom-box > div.flex {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        .printable-area .bottom-box > div.flex > span:first-child,
        .printable-area .bottom-box > div.flex > div:first-child {
          min-width: 90px; text-align: left !important;
        }
        .printable-area .bottom-box > div.flex > span.font-bold {
          flex: 1; text-align: right !important; width: auto !important;
        }
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 0.2in;
          }
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area {
            position: absolute; left: 0; top: 0; width: 100%; height: auto;
            border: 2px solid black !important;
            box-shadow: none !important; margin: 0;
            padding: 0.5rem !important;
            font-size: 11px !important;
            font-weight: bold !important;
          }
          .print-hidden { display: none !important; }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
      {/* --- END: New style block --- */}

      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen p-4 sm:p-6 lg:p-8 print-hidden">
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
        />
        
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FaFileInvoice className="text-blue-600 text-2xl" />
                  </div>
                  View Receipts
                </h1>
                <p className="text-gray-600 mt-2">Manage and view all your receipts</p>
              </div>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition shadow-md"
              >
                <FaFileExport /> Export
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Receipts</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{totalReceipts}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <FaFileInvoice className="text-blue-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Income</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalIncome)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <FaDollarSign className="text-green-600 text-2xl" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalBalance)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <FaDollarSign className="text-purple-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and View Toggle */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, business or Sr.No..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Date Filter */}
              <div className="relative">
                <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none bg-white"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">This Month</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'list' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FaList /> List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                    viewMode === 'grid' 
                      ? 'bg-blue-600 text-white shadow-md' 
                      : 'text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <FaTh /> Grid
                </button>
              </div>
            </div>
          </div>

          {/* Receipts Display */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Receipts ({sortedReceipts.length})
            </h2>

            {/* List View */}
            {viewMode === 'list' && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <tr>
                      <th 
                        onClick={() => handleSort('customerSrNo')}
                        className="py-4 px-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          Sr.No {sortBy === 'customerSrNo' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('customerName')}
                        className="py-4 px-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          Customer {sortBy === 'customerName' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('date')}
                        className="py-4 px-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('totalIncome')}
                        className="py-4 px-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          Income {sortBy === 'totalIncome' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('finalTotalAfterChuk')}
                        className="py-4 px-4 text-left text-sm font-semibold cursor-pointer hover:bg-blue-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          Balance {sortBy === 'finalTotalAfterChuk' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </div>
                      </th>
                      <th className="py-4 px-4 text-center text-sm font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedReceipts.length > 0 ? (
                      sortedReceipts.map((receipt) => (
                        <tr
                          key={receipt._id}
                          className={`transition ${
                            receipt.isLatest 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-l-4 border-green-500' 
                              : 'hover:bg-blue-50'
                          }`}
                        >
                          <td className="py-4 px-4 font-bold text-gray-800">
                            {receipt.customerSrNo}
                            {receipt.isLatest && (
                              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">Latest</span>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <FaUser className="text-gray-400" />
                              <div>
                                <p className="font-medium text-gray-800">{receipt.customerName}</p>
                                <p className="text-xs text-gray-500">{receipt.businessName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <FaCalendarAlt className="text-gray-400" />
                              {dayjs(receipt.date).format("DD-MM-YYYY HH:mm")}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-semibold text-green-600">
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(toNum(receipt.totalIncome))}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`font-semibold ${toNum(receipt.finalTotalAfterChuk) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(toNum(receipt.finalTotalAfterChuk)))}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => viewReceiptDetails(receipt)}
                                className="text-purple-600 hover:text-purple-800 transition p-2 hover:bg-purple-100 rounded-lg"
                                title="View Details"
                              >
                                <FaEye size={18} />
                              </button>
                              <button
                                onClick={() => handleEdit(receipt._id)}
                                className="text-blue-600 hover:text-blue-800 transition p-2 hover:bg-blue-100 rounded-lg"
                                title="Edit"
                              >
                                <FaEdit size={18} />
                              </button>
                              <button
                                onClick={() => handlePrint(receipt)}
                                className="text-green-600 hover:text-green-800 transition p-2 hover:bg-green-100 rounded-lg"
                                title="Print"
                              >
                                <FaPrint size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(receipt)}
                                className="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-100 rounded-lg"
                                title="Delete"
                              >
                                <FaTrashAlt size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="6"
                          className="text-center py-12 text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-3">
                            <div className="bg-gray-100 p-4 rounded-full">
                              <FaFileInvoice className="text-gray-400 text-4xl" />
                            </div>
                            <p className="font-medium">No receipts found</p>
                            <p className="text-sm">Try adjusting your filters</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedReceipts.length > 0 ? (
                  sortedReceipts.map((receipt) => (
                    <div
                      key={receipt._id}
                      className={`bg-white rounded-xl p-5 hover:shadow-lg transition-all ${
                        receipt.isLatest
                          ? 'border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md'
                          : 'border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg ${receipt.isLatest ? 'bg-green-100' : 'bg-blue-100'}`}>
                            <FaFileInvoice className={`text-xl ${receipt.isLatest ? 'text-green-600' : 'text-blue-600'}`} />
                          </div>
                          <div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              receipt.isLatest ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'
                            }`}>
                              #{receipt.customerSrNo}
                            </span>
                            {receipt.isLatest && (
                              <span className="block mt-1 text-xs font-semibold text-green-600">
                                ✓ Latest
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-800 mb-2">{receipt.customerName}</h3>
                      <p className="text-sm text-gray-500 mb-4">{receipt.businessName}</p>
                      
                      <div className="space-y-2 mb-4 pb-4 border-b">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <FaCalendarAlt className="text-gray-400" />
                            Date
                          </span>
                          <span className="font-medium text-gray-800">
                            {dayjs(receipt.date).format("DD-MM-YYYY HH:mm")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Income</span>
                          <span className="font-semibold text-green-600">
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(toNum(receipt.totalIncome))}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Balance</span>
                          <span className={`font-semibold ${toNum(receipt.finalTotalAfterChuk) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Math.abs(toNum(receipt.finalTotalAfterChuk)))}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => viewReceiptDetails(receipt)}
                          className="flex-1 text-purple-600 hover:bg-purple-50 py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                        >
                          <FaEye /> View
                        </button>
                        <button
                          onClick={() => handleEdit(receipt._id)}
                          className="flex-1 text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                        >
                          <FaEdit /> Edit
                        </button>
                        <button
                          onClick={() => handlePrint(receipt)}
                          className="flex-1 text-green-600 hover:bg-green-50 py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                        >
                          <FaPrint /> Print
                        </button>
                        <button
                          onClick={() => handleDelete(receipt)}
                          className="flex-1 text-red-600 hover:bg-red-50 py-2 rounded-lg transition flex items-center justify-center gap-1 text-sm"
                        >
                          <FaTrashAlt /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-gray-100 p-4 rounded-full">
                        <FaFileInvoice className="text-gray-400 text-4xl" />
                      </div>
                      <p className="font-medium">No receipts found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Receipt Details Modal */}
        {showDetailsModal && selectedReceipt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Receipt Details</h2>
                    <p className="text-blue-100 mt-1">#{selectedReceipt.customerSrNo} - {selectedReceipt.customerName}</p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition"
                  >
                    <FaTimes size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Business Name</p>
                      <p className="font-semibold text-gray-800">{selectedReceipt.businessName}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Date</p>
                      <p className="font-semibold text-gray-800">{dayjs(selectedReceipt.date).format("DD-MM-YYYY HH:mm")}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Day</p>
                      <p className="font-semibold text-gray-800">{selectedReceipt.day}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Company</p>
                      <p className="font-semibold text-gray-800">{selectedReceipt.customerCompany || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Financial Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <p className="text-sm text-gray-600 mb-1">Total Income</p>
                      <p className="text-xl font-bold text-blue-600">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(toNum(selectedReceipt.totalIncome))}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-500">
                      <p className="text-sm text-gray-600 mb-1">Payment</p>
                      <p className="text-xl font-bold text-green-600">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(toNum(selectedReceipt.payment))}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                      <p className="text-sm text-gray-600 mb-1">Deduction</p>
                      <p className="text-xl font-bold text-purple-600">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(toNum(selectedReceipt.deduction))}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                      <p className="text-sm text-gray-600 mb-1">Final Balance</p>
                      <p className={`text-xl font-bold ${toNum(selectedReceipt.finalTotalAfterChuk) >= 0 ? 'text-orange-600' : 'text-red-600'}`}>
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Math.abs(toNum(selectedReceipt.finalTotalAfterChuk)))}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {toNum(selectedReceipt.finalTotalAfterChuk) >= 0 ? 'येणे (To Receive)' : 'देणे (To Pay)'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Details</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-500 mb-1">Pending Amount</p>
                      <p className="font-semibold text-gray-800">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(toNum(selectedReceipt.pendingAmount))}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-500 mb-1">Advance Amount</p>
                      <p className="font-semibold text-gray-800">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(toNum(selectedReceipt.advanceAmount))}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <p className="text-sm text-gray-500 mb-1">Cutting Amount</p>
                      <p className="font-semibold text-gray-800">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(toNum(selectedReceipt.cuttingAmount))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEdit(selectedReceipt._id);
                    }}
                    className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <FaEdit /> Edit Receipt
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handlePrint(selectedReceipt);
                    }}
                    className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition flex items-center justify-center gap-2"
                  >
                    <FaPrint /> Print Receipt
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ViewReceipts;