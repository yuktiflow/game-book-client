import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import "dayjs/locale/mr"; // Import Marathi locale
import {
  FaEdit,
  FaTrashAlt,
  FaPrint,
  FaPlus,
  FaMinus,
  FaShareAlt,
  FaWhatsapp,
  FaDownload,
  FaTimes,
} from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { toJpeg } from "html-to-image";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

dayjs.extend(customParseFormat);
dayjs.locale("mr");

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const COMPANY_NAMES = [
  "कल्याण",
  "मेन बाजार",
  "श्रीदेवी",
  "श्रीदेवी नाईट",
  "मिलन डे",
  "मिलन नाईट",
];

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

const getMarathiDay = (englishDay) => {
  const dayMap = {
    Sunday: "रविवार",
    Monday: "सोमवार",
    Tuesday: "मंगळवार",
    Wednesday: "बुधवार",
    Thursday: "गुरुवार",
    Friday: "शुक्रवार",
    Saturday: "शनिवार",
  };
  return dayMap[englishDay] || englishDay;
};

// --- UPDATED: Now accepts customerCompany to preserve it on clear ---
const getInitialFormData = (businessName, customerCompany = "") => {
  const currentDayInEnglish = dayjs().format("dddd");
  const now = new Date();
  return {
    _id: null,
    businessName: businessName || "Bappa Gaming",
    customerId: "",
    customerName: "",
    customerCompany: customerCompany, // Use the passed-in value
    day: getMarathiDay(currentDayInEnglish),
    date: dayjs().format("DD-MM-YYYY"), // Display format
    actualDate: now, // Actual date object for storage
    payment: "",
    pendingAmount: "",
    advanceAmount: "",
    cuttingAmount: "",
    jama: "",
    chuk: "",
    isChukEnabled: false, // For NA/LD checkbox
    chukPercentage: "10", // ADDED for LD calculation
    deductionRate: "10", // Default to 10%
  };
};

// --- UPDATED: 'pan' field now includes 'type' ---
const getInitialGameRows = () => [
  {
    id: 1,
    type: "आ.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "", type: "sd" }, // MODIFIED
    gun: { val1: "", val2: "" },
    special: { type: "jackpot", val1: "", val2: "" }, // NEW
    multiplier: 8,
  },
  {
    id: 2,
    type: "कु.",
    income: "",
    o: "",
    jod: "",
    ko: "",
    pan: { val1: "", val2: "", type: "sd" }, // MODIFIED
    gun: { val1: "", val2: "" },
    special: { type: "jackpot", val1: "", val2: "" }, // NEW
    multiplier: 9,
  },
];

const initialOpenCloseValues = {
  open: "",
  close: "",
  jod: "",
};

const ReceiptForm = ({ businessName = "Bappa Gaming" }) => {
  const { id: receiptId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState(() =>
    getInitialFormData(businessName)
  );
  const [gameRows, setGameRows] = useState(getInitialGameRows());
  const [openCloseValues, setOpenCloseValues] = useState(
    initialOpenCloseValues
  );
  const [customerList, setCustomerList] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  // --- State for company filter ---
  const [companySearchTerm, setCompanySearchTerm] = useState("");
  const [serialNumberInput, setSerialNumberInput] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareImageData, setShareImageData] = useState(null);

  // --- State for global 'special' type ---
  const [globalSpecialType, setGlobalSpecialType] = useState("jackpot");

  // --- NEW: State for header dropdown visibility ---
  const [isSpecialDropdownOpen, setIsSpecialDropdownOpen] = useState(false);

  // --- STATES FOR SEARCHABLE DROPDOWN ---
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerSearchRef = useRef(null);

  // --- NEW: Ref for header dropdown ---
  const specialHeaderRef = useRef(null);

  const printRef = useRef();
  const token = localStorage.getItem("token");
  const formRef = useRef(null);
  const isEditingRef = useRef(false);

  // --- NEW: Ref to track previous serial number to prevent re-runs ---
  const prevSerialNumberRef = useRef();

  // --- UPDATED: Clear button now preserves company name ---
  const clearForm = useCallback(() => {
    setFormData((prevFormData) =>
      // Pass the current businessName and customerCompany to preserve them
      getInitialFormData(prevFormData.businessName, prevFormData.customerCompany)
    );
    setGameRows(getInitialGameRows());
    setSerialNumberInput("");
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
    setGlobalSpecialType("jackpot"); // Reset global type
    setIsSpecialDropdownOpen(false); // NEW: Close header dropdown
    isEditingRef.current = false;
    // openCloseValues is intentionally not cleared
  }, []); // No dependencies needed as setFormData provides the previous state

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const sortedCustomers = (response.data.customers || []).sort(
        (a, b) => a.srNo - b.srNo
      );

      const sequentialCustomers = sortedCustomers.map((customer, index) => ({
        ...customer,
        srNo: index + 1,
      }));

      setCustomerList(sequentialCustomers);
    } catch (error) {
      toast.error("Failed to fetch customer data.");
    }
  }, [token]);

  const fetchLatestOpenCloseValues = useCallback((allReceipts) => {
    const todayStr = dayjs().format("YYYY-MM-DD");
    const receiptsFromToday = allReceipts.filter(
      (r) => dayjs(r.date).format("YYYY-MM-DD") === todayStr
    );

    let lastOpenClose = initialOpenCloseValues;
    if (receiptsFromToday.length > 0) {
      receiptsFromToday.sort((a, b) => {
        const dateA = dayjs(a.date);
        const dateB = dayjs(b.date);
        const dateDiff = dateB.diff(dateA);
        if (dateDiff !== 0) return dateDiff;
        if (b._id > a._id) return 1;
        if (a._id < b._id) return -1;
        return 0;
      });
      const latestReceiptOfTheDay = receiptsFromToday[0];

      if (latestReceiptOfTheDay.openCloseValues) {
        lastOpenClose = {
          open: latestReceiptOfTheDay.openCloseValues.open || "",
          close: latestReceiptOfTheDay.openCloseValues.close || "",
          jod: latestReceiptOfTheDay.openCloseValues.jod || "",
        };
      }
    }
    return lastOpenClose;
  }, []);

  const fetchReceipts = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const fetchedReceipts = response.data.receipts || [];

      // --- NEW SORT LOGIC (REQUEST 3) ---
      // Sort by _id descending. Mongo ObjectIDs are chronological.
      // This will put the most recently created/updated receipts first.
      fetchedReceipts.sort((a, b) => {
        if (a._id > b._id) return -1;
        if (a._id < b._id) return 1;
        return 0;
      });
      // --- END NEW SORT LOGIC ---

      setReceipts(fetchedReceipts);

      if (!formData._id) {
        const latestOpenClose = fetchLatestOpenCloseValues(fetchedReceipts);
        setOpenCloseValues(latestOpenClose);
      }
    } catch (error) {
      toast.error("Failed to load saved receipts.");
    }
  }, [token, formData._id, fetchLatestOpenCloseValues]);

  useEffect(() => {
    fetchCustomers();
    fetchReceipts();
  }, [fetchCustomers, fetchReceipts]);

  // --- NEW: Load customer from query params (for edit button from Report) ---
  useEffect(() => {
    const customerIdFromQuery = searchParams.get('customerId');
    if (customerIdFromQuery && customerList.length > 0) {
      const customer = customerList.find((c) => c._id === customerIdFromQuery);
      if (customer) {
        setSerialNumberInput(customer.srNo.toString());
        setCustomerSearch("");
        setIsCustomerDropdownOpen(false);
        // Remove the query param from URL
        navigate('/vendor/createReceipt', { replace: true });
      }
    }
  }, [searchParams, customerList, navigate]);

  // --- NEW: Load receipt data when receiptId is present (for editing) ---
  useEffect(() => {
    const loadReceiptForEdit = async () => {
      if (receiptId && token && customerList.length > 0) {
        try {
          const response = await axios.get(`${API_BASE_URI}/api/receipts`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const receipt = response.data.receipts.find((r) => r._id === receiptId);
          
          if (!receipt) {
            toast.error("Receipt not found");
            navigate("/vendor");
            return;
          }

          isEditingRef.current = true;
          const customer = customerList.find((c) => c._id === receipt.customerId);

          setSerialNumberInput(customer ? customer.srNo.toString() : "");
          setCustomerSearch("");
          setIsCustomerDropdownOpen(false);

          // Sanitize game rows
          const sanitizedGameRows = (receipt.gameRows || getInitialGameRows()).map((row) => {
            const panData = row.pan;
            let newPan = { val1: "", val2: "", type: "sp" };
            if (typeof panData === "object" && panData !== null) {
              newPan.val1 = panData.val1 || "";
              newPan.val2 = panData.val2 || "";
              newPan.type = panData.type || "sp";
            } else if (typeof panData === "string") {
              newPan.val1 = panData;
            }

            let newSpecial = { type: "jackpot", val1: "", val2: "" };
            if (row.special) {
              newSpecial = row.special;
            } else if (row.jackpot) {
              newSpecial = {
                type: "jackpot",
                val1: row.jackpot.val1 || "",
                val2: row.jackpot.val2 || "",
              };
            } else if (row.berij) {
              newSpecial = {
                type: "berij",
                val1: row.berij.val1 || "",
                val2: row.berij.val2 || "",
              };
            } else if (row.frak) {
              newSpecial = {
                type: "frak",
                val1: row.frak.val1 || "",
                val2: row.frak.val2 || "",
              };
            }

            return {
              ...row,
              pan: newPan,
              gun: typeof row.gun === "object" ? row.gun : { val1: "", val2: "" },
              special: newSpecial,
              jackpot: undefined,
              berij: undefined,
              frak: undefined,
            };
          });

          const englishDay = dayjs(receipt.date).format("dddd");
          setGlobalSpecialType(sanitizedGameRows[0]?.special?.type || "jackpot");

          setFormData({
            _id: receipt._id,
            businessName: receipt.businessName || "Bappa Gaming",
            customerId: receipt.customerId,
            customerName: customer?.name || receipt.customerName,
            customerCompany: receipt.customerCompany || "",
            day: getMarathiDay(englishDay),
            date: dayjs(receipt.date).format("DD-MM-YYYY"), // Display format
            actualDate: new Date(receipt.date), // Actual date object for storage
            payment: receipt.payment || "",
            pendingAmount: receipt.pendingAmount?.toString() || "",
            advanceAmount: receipt.advanceAmount?.toString() || "",
            cuttingAmount: receipt.cuttingAmount?.toString() || "",
            jama: receipt.jama?.toString() || "",
            chuk: receipt.chuk?.toString() || "",
            isChukEnabled: !!receipt.isChukEnabled,
            chukPercentage: receipt.chukPercentage?.toString() || "10",
            deductionRate: receipt.deductionRate?.toString() || "10",
          });

          setGameRows(sanitizedGameRows);
          
          // Load open/close values if available
          if (receipt.openCloseValues) {
            setOpenCloseValues(receipt.openCloseValues);
          }

          formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
          console.error("Error loading receipt:", error);
          toast.error("Failed to load receipt for editing");
          navigate("/vendor");
        }
      } else if (!receiptId && isEditingRef.current) {
        // If receiptId is cleared and we were in edit mode, reset the form
        isEditingRef.current = false;
        clearForm();
      }
    };

    loadReceiptForEdit();
  }, [receiptId, token, customerList, navigate, clearForm]);

  // --- UPDATED: This effect now loads magil/advance ONLY ---
  useEffect(() => {
    // --- FIX: Only run if serialNumberInput *actually changes* ---
    if (serialNumberInput === prevSerialNumberRef.current) {
      return;
    }

    const serial = serialNumberInput;
    const serialAsNumber = parseInt(serial, 10);

    if (isEditingRef.current) {
      prevSerialNumberRef.current = serialNumberInput; // Update ref even in edit mode
      return;
    }

    if (
      !isNaN(serialAsNumber) &&
      serialAsNumber > 0 &&
      customerList.length > 0
    ) {
      const customer = customerList.find((c) => c.srNo === serialAsNumber);
      if (customer) {
        // Find all receipts for this customer
        const customerReceipts = receipts.filter(
          (r) => r.customerId === customer._id
        );

        let lastPendingAmount = "";
        let lastAdvanceAmount = "";
        // --- MODIFIED: cuttingAmount will now remain blank
        const lastCuttingAmount = "";
        let newGameRows = getInitialGameRows(); // Start with fresh rows

        if (customerReceipts.length > 0) {
          // Sort receipts to find the most recent one
          customerReceipts.sort((a, b) => {
            const dateA = dayjs(a.date);
            const dateB = dayjs(b.date);
            const dateDiff = dateB.diff(dateA);
            if (dateDiff !== 0) return dateDiff;
            if (b._id > a._id) return 1;
            if (a._id < b._id) return -1;
            return 0;
          });
          const latestReceipt = customerReceipts[0];

          // Load 'pendingAmount' (मागील) from the *last* receipt's final total
          if (latestReceipt.finalTotalAfterChuk !== undefined) {
            lastPendingAmount = latestReceipt.finalTotalAfterChuk.toString();
          }

          // Load other carry-over values
          if (latestReceipt.finalTotal !== undefined) {
            lastAdvanceAmount = latestReceipt.finalTotal.toString();
          }

          // --- REMOVED: Logic to load cutting amount removed ---
          // lastCuttingAmount = latestReceipt.cuttingAmount?.toString() || "";

          // --- REMOVED (REQUEST 1): Logic to load aa/ku income removed ---
        }

        // Set the form data
        setFormData((prev) => ({
          ...prev,
          customerId: customer._id,
          customerName: customer.name,
          pendingAmount: lastPendingAmount,
          advanceAmount: lastAdvanceAmount,
          cuttingAmount: lastCuttingAmount, // --- MODIFIED: This will be ""
          jama: "", // --- CRITICAL FIX: Reset jama to empty ---
          chuk: "", // Reset chuk
          chukPercentage: "10", // Reset chuk percentage
          isChukEnabled: false, // Reset chuk checkbox
        }));
        // --- UPDATED: Use the new game rows ---
        setGameRows(newGameRows); // This will be getInitialGameRows()
      }
    } else {
      // Clear form data if serial is invalid or empty
      setFormData((prev) => ({
        ...prev,
        customerId: "",
        customerName: "",
        pendingAmount: "",
        advanceAmount: "",
        cuttingAmount: "",
        jama: "", // Also clear jama here
        chuk: "",
        chukPercentage: "10",
        isChukEnabled: false,
      }));
      setGameRows(getInitialGameRows());
    }

    // --- FIX: Update the ref *after* logic runs ---
    prevSerialNumberRef.current = serialNumberInput;

    // --- FIX: Add 'receipts' to dependency array ---
  }, [serialNumberInput, customerList, receipts]);

  // --- UPDATED: Click-outside handler for BOTH dropdowns ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Customer search dropdown
      if (
        customerSearchRef.current &&
        !customerSearchRef.current.contains(event.target)
      ) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearch(""); // Clear search on click outside
      }

      // NEW: Special header dropdown
      if (
        specialHeaderRef.current &&
        !specialHeaderRef.current.contains(event.target)
      ) {
        setIsSpecialDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []); // Empty dependency array is correct

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "isChukEnabled") {
      setFormData((prev) => ({
        ...prev,
        isChukEnabled: checked,
        chuk: "", // Clear chuk amount when toggling
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenCloseChange = (e) => {
    const { name, value } = e.target;
    setOpenCloseValues((prev) => ({ ...prev, [name]: value }));
  };

  // --- UPDATED: Row change handler now includes 'panType' ---
  const handleRowChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRows = [...gameRows];

    if (["o", "jod", "ko"].includes(name)) {
      const formattedValue = value
        .replace(/\s/g, "+")
        .replace(/\+{2,}/g, "+");
      updatedRows[index][name] = formattedValue;
    } else if (name === "panVal1" || name === "panVal2") {
      const field = name === "panVal1" ? "val1" : "val2";
      updatedRows[index].pan = { ...updatedRows[index].pan, [field]: value };
    } else if (name === "panType") {
      // --- NEW: Handle Pan Type (SP/DP) change ---
      updatedRows[index].pan = { ...updatedRows[index].pan, type: value };
    } else if (name === "gunVal1" || name === "gunVal2") {
      const field = name === "gunVal1" ? "val1" : "val2";
      updatedRows[index].gun = { ...updatedRows[index].gun, [field]: value };
    }
    // --- UPDATED: Handle 'special' field changes (was 'jbf') ---
    else if (name === "specialVal1" || name === "specialVal2") {
      const field = name === "specialVal1" ? "val1" : "val2";
      updatedRows[index].special = {
        ...updatedRows[index].special,
        [field]: value,
      };
    } else if (name === "specialType") {
      // This is now controlled globally, but leaving for safety
      updatedRows[index].special = {
        ...updatedRows[index].special,
        type: value,
      };
    }
    // --- END UPDATE ---
    else {
      updatedRows[index][name] = value;
    }
    setGameRows(updatedRows);
  };

  const handleMultiplierChange = (index, value) => {
    const updatedRows = [...gameRows];
    updatedRows[index].multiplier = Number(value) || 0;
    setGameRows(updatedRows);
  };

  // --- UPDATED: AddRow now respects globalSpecialType and adds pan.type ---
  const addRow = () => {
    if (gameRows.length < 10) {
      const newRow = {
        id: Date.now(),
        type: "",
        income: "",
        o: "",
        jod: "",
        ko: "",
        pan: { val1: "", val2: "", type: "sp" }, // MODIFIED
        gun: { val1: "", val2: "" },
        special: { type: globalSpecialType, val1: "", val2: "" }, // MODIFIED
        multiplier: 8,
      };
      setGameRows([...gameRows, newRow]);
      toast.success("New empty row added successfully!");
    } else {
      toast.warn("You can add a maximum of 10 rows.");
    }
  };

  const removeRow = (index) => {
    // --- FIX: This logic is correct and now works
    if (index > 1) {
      const updatedRows = gameRows.filter((_, i) => i !== index);
      setGameRows(updatedRows);
    } else {
      toast.warn("Cannot remove the initial rows.");
    }
  };

  const calculationResults = useMemo(() => {
    let oFinalTotal = 0,
      jodFinalTotal = 0,
      koFinalTotal = 0,
      panFinalTotal = 0,
      gunFinalTotal = 0,
      specialFinalTotal = 0; // --- NEW: Combined total

    gameRows.forEach((row) => {
      const oVal = evaluateExpression(row.o);
      const jodVal = evaluateExpression(row.jod);
      const koVal = evaluateExpression(row.ko);
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

      // --- NEW: Calculate 'special' total ---
      const specialVal1 = Number(row.special?.val1) || 0;
      const specialVal2 = Number(row.special?.val2) || 0;
      specialFinalTotal += specialVal1 * specialVal2;
    });

    const totalIncome = gameRows.reduce(
      (sum, row) => sum + (Number(row.income) || 0), // Use Number(row.income)
      0
    );
    // --- UPDATED: Payment calculation ---
    const payment =
      oFinalTotal +
      jodFinalTotal +
      koFinalTotal +
      panFinalTotal +
      gunFinalTotal +
      specialFinalTotal; // --- UPDATED

    const deductionRate = Number(formData.deductionRate) || 0;
    const deduction = totalIncome * (deductionRate / 100);
    const afterDeduction = totalIncome - deduction;
    const remainingBalance = afterDeduction - payment;
    const pendingAmount = Number(formData.pendingAmount) || 0;
    const totalDue = remainingBalance + pendingAmount;
    const jama = Number(formData.jama) || 0;

    // --- UPDATED: Chuk calculation based on LD percentage ---
    const jamaTotal = totalDue - jama; // This is the total *before* chuk
    let chuk;
    if (formData.isChukEnabled) {
      const perc = Number(formData.chukPercentage) || 0;
      chuk = jamaTotal * (perc / 100);
    } else {
      // --- MODIFICATION: Allow negative chuk. Number() handles this.
      chuk = Number(formData.chuk) || 0;
    }
    // --- END UPDATE ---

    const advanceAmount = Number(formData.advanceAmount) || 0;
    const cuttingAmount = Number(formData.cuttingAmount) || 0;

    // --- MODIFICATION: This calculation is correct.
    // If chuk is -50, jamaTotal - (-50) = jamaTotal + 50
    const finalTotalAfterChuk = jamaTotal - chuk;
    const finalTotal = advanceAmount - cuttingAmount;

    return {
      totalIncome,
      payment,
      deduction,
      afterDeduction,
      remainingBalance,
      totalDue,
      finalTotal,
      jamaTotal, // This is BEFORE chuk
      chuk, // This is the calculated or entered chuk
      finalTotalAfterChuk,
      oFinalTotal,
      jodFinalTotal,
      koFinalTotal,
      panFinalTotal,
      gunFinalTotal,
      specialFinalTotal, // --- UPDATED
    };
  }, [
    gameRows,
    formData.pendingAmount,
    formData.advanceAmount,
    formData.cuttingAmount,
    formData.jama,
    formData.chuk, // We depend on this for 'NA' mode
    formData.isChukEnabled, // And this
    formData.chukPercentage, // And this
    formData.deductionRate,
  ]);

  // This effect updates the 'payment' field
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payment: calculationResults.payment.toFixed(2),
    }));
  }, [calculationResults.payment]);

  // --- NEW: Effect to update the 'chuk' input field if LD is checked ---
  useEffect(() => {
    if (formData.isChukEnabled) {
      // calculationResults.chuk already has the calculated value
      const newChuk = calculationResults.chuk.toFixed(2);
      // Set it *only if it's different* to avoid loop
      if (formData.chuk !== newChuk) {
        setFormData((prev) => ({ ...prev, chuk: newChuk }));
      }
    }
  }, [
    formData.isChukEnabled,
    calculationResults.chuk, // This is the calculated value
    formData.chuk, // Need this to prevent loop
  ]);

  const handleSave = async (clear = true) => {
    if (!formData.customerId) {
      toast.error("Please select a customer.");
      return false;
    }

    const receiptToSend = {
      ...formData,
      ...calculationResults,
      openCloseValues,
      gameRows,
      // Use actualDate if available (for edits), otherwise current time (for new receipts)
      date: formData.actualDate 
        ? new Date(formData.actualDate).toISOString() 
        : new Date().toISOString(),
    };

    try {
      if (formData._id) {
        // --- This is an UPDATE (PUT) ---
        await axios.put(
          `${API_BASE_URI}/api/receipts/${formData._id}`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt updated successfully!");
        
        // Navigate back to view receipts after editing
        if (receiptId) {
          setTimeout(() => {
            navigate("/vendor/viewReceipts");
          }, 1000);
        }
      } else {
        // --- This is a NEW (POST) ---
        await axios.post(
          `${API_BASE_URI}/api/receipts`,
          receiptToSend,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Receipt saved successfully!");
      }

      // --- CRITICAL: Refresh receipts list *after* save ---
      // This will fetch the newly sorted list (Request 3)
      await fetchReceipts();

      if (clear) {
        clearForm();
      }
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error saving receipt");
      console.error("Save error:", error);
      return false;
    }
  };

  // --- UPDATED: Navigate to edit route ---
  const handleEdit = (id) => {
    navigate(`/vendor/editReceipt/${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`${API_BASE_URI}/api/receipts/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // --- FIX: Refresh receipt list after delete ---
        await fetchReceipts(); // This will fetch the sorted list
        toast.success("Receipt deleted successfully.");
      } catch (error) {
        toast.error("Failed to delete receipt.");
        console.error("Delete error:", error);
      }
    }
  };

  const handlePrint = async () => {
    // This calls handleSave, which now calls fetchReceipts (which sorts)
    const savedSuccessfully = await handleSave(false);
    if (savedSuccessfully) {
      setTimeout(() => {
        window.print();
      }, 50);
    }
  };

  // --- **** NEW SHARE HANDLERS **** ---
  const handleShare = async () => {
    if (!printRef.current) {
      toast.error("Receipt element not found.");
      return;
    }

    setIsSharing(true);
    toast.info("Generating image...");
    printRef.current.classList.add("sharing-view");

    try {
      const dataUrl = await toJpeg(printRef.current, {
        quality: 0.95,
        backgroundColor: "#ffffff",
        width: 1100,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File(
        [blob],
        `receipt-${formData.customerName}-${formData.date}.jpg`,
        { type: "image/jpeg" }
      );

      // Store image data for sharing
      setShareImageData({ dataUrl, file, blob });
      
      // Show custom share modal
      setShowShareModal(true);
      
    } catch (error) {
      console.error("Image Generation Error:", error);
      toast.error("Failed to generate image for sharing.");
    } finally {
      if (printRef.current) {
        printRef.current.classList.remove("sharing-view");
      }
      setIsSharing(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!shareImageData) return;

    try {
      // Download the image first
      const link = document.createElement("a");
      link.href = shareImageData.dataUrl;
      link.download = `receipt-${formData.customerName}-${formData.date}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Image downloaded! Opening WhatsApp...");

      // Open WhatsApp (app or web based on device)
      const text = encodeURIComponent(
        `Receipt for ${formData.customerName}\nDate: ${formData.date}\n\nPlease attach the downloaded receipt image.`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");

      // Close modal and save receipt
      setShowShareModal(false);
      await handleSave(false);
    } catch (error) {
      console.error("WhatsApp Share Error:", error);
      toast.error("Failed to share via WhatsApp.");
    }
  };

  const handleNativeShare = async () => {
    if (!shareImageData) return;

    try {
      if (navigator.share && navigator.canShare({ files: [shareImageData.file] })) {
        await navigator.share({
          title: "Receipt",
          text: `Receipt for ${formData.customerName} on ${formData.date}`,
          files: [shareImageData.file],
        });
        toast.success("Shared successfully!");
        setShowShareModal(false);
        await handleSave(false);
      } else {
        toast.warn("Native sharing not supported.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Native Share Error:", error);
        toast.error("Failed to share.");
      }
    }
  };

  const handleDownloadOnly = async () => {
    if (!shareImageData) return;

    try {
      const link = document.createElement("a");
      link.href = shareImageData.dataUrl;
      link.download = `receipt-${formData.customerName}-${formData.date}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Image downloaded!");
      setShowShareModal(false);
      await handleSave(false);
    } catch (error) {
      console.error("Download Error:", error);
      toast.error("Failed to download image.");
    }
  };
  // --- **** END of new handleShare **** ---

  // --- UPDATED: Global Handler now takes a string value ---
  const handleGlobalSpecialTypeChange = (newType) => {
    setGlobalSpecialType(newType);
    setIsSpecialDropdownOpen(false); // Close dropdown on selection

    // Update all game rows to use this new type
    setGameRows((prevRows) =>
      prevRows.map((row) => ({
        ...row,
        special: {
          // Ensure special object exists and spread its old values
          ...(row.special || { val1: "", val2: "" }),
          type: newType, // Set the new type
        },
      }))
    );
  };

  const handleTablePrint = (id) => {
    handleEdit(id);
    setTimeout(() => {
      handlePrint();
    }, 200);
  };

  // --- MODIFIED: Filter logic now checks both search terms ---
  const filteredReceipts = receipts.filter((r) => {
    const customerNameMatch = (r.customerName || "")
      .toLowerCase()
      .includes(searchTerm.toLowerCase());

    // --- NEW: Company filter logic ---
    const companyNameMatch = companySearchTerm // If a company is selected...
      ? (r.customerCompany || "") === companySearchTerm // ...check for an exact match
      : true; // ...otherwise, show all (true)

    return customerNameMatch && companyNameMatch;
  });

  const getCustomerSrNo = (customerId) => {
    const customer = customerList.find((c) => c._id === customerId);
    return customer ? customer.srNo : serialNumberInput || "N/A";
  };

  // --- UPDATED: renderComplexCell now includes SD/DP dropdown for 'pan' ---
  const renderComplexCell = (index, fieldName) => {
    const row = gameRows[index];
    const data = row[fieldName] || { val1: "", val2: "" };
    const result = (Number(data.val1) || 0) * (Number(data.val2) || 0);

    // NEW: Logic for Pan dropdown
    const isPan = fieldName === "pan";
    const panType = isPan ? data.type || "sp" : "sp";

    return (
      <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-1.5 text-xs sm:text-sm p-1 sm:p-1.5">
        {/* Input row */}
        <div className="print-hidden flex items-center justify-center space-x-1 sm:space-x-1.5">
          <input
            type="number"
            name={`${fieldName}Val1`}
            value={data.val1 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-9 sm:w-10 md:w-12 text-center border border-gray-300 rounded p-1 text-xs sm:text-sm"
          />
          <span className="text-gray-600 text-xs sm:text-sm">×</span>
          <input
            type="number"
            name={`${fieldName}Val2`}
            value={data.val2 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-9 sm:w-10 md:w-12 text-center border border-gray-300 rounded p-1 text-xs sm:text-sm"
          />
        </div>

        {/* Total row (print-hidden) */}
        <div className="print-hidden text-xs sm:text-sm font-semibold">
          = {result.toFixed(0)}
        </div>

        {/* --- NEW: Dropdown for Pan (SD/DP) --- */}
        {isPan && (
          <div className="print-hidden flex justify-center mt-1">
            <select
              name="panType"
              value={panType}
              onChange={(e) => handleRowChange(index, e)}
              className="border border-gray-300 rounded p-1 text-xs sm:text-sm"
            >
              <option value="sd">Sp</option>
              <option value="dp">DP</option>
            </select>
          </div>
        )}

        {/* Updated print/share div */}
        <div className="hidden print:block text-sm">
          {data.val1 || "_"} × {data.val2 || "_"} = {result.toFixed(0)}
          {/* --- NEW: Show SP/DP on print --- */}
          {isPan && (
            <span className="text-xs font-normal">
              {" "}
              ({panType.toUpperCase()})
            </span>
          )}
        </div>
      </div>
    );
  };

  // --- UPDATED: renderSpecialCell (Dropdown REMOVED) ---
  const renderSpecialCell = (index) => {
    const row = gameRows[index];
    const data = row.special || { type: "jackpot", val1: "", val2: "" };
    const result = (Number(data.val1) || 0) * (Number(data.val2) || 0);

    return (
      <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-1.5 text-xs sm:text-sm p-1 sm:p-1.5">
        {/* Input row */}
        <div className="print-hidden flex items-center justify-center space-x-1 sm:space-x-1.5">
          <input
            type="number"
            name="specialVal1"
            value={data.val1 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-9 sm:w-10 md:w-12 text-center border border-gray-300 rounded p-1 text-xs sm:text-sm"
          />
          <span className="text-gray-600 text-xs sm:text-sm">×</span>
          <input
            type="number"
            name="specialVal2"
            value={data.val2 || ""}
            onChange={(e) => handleRowChange(index, e)}
            className="w-9 sm:w-10 md:w-12 text-center border border-gray-300 rounded p-1 text-xs sm:text-sm"
          />
        </div>

        {/* Total row (print-hidden) */}
        <div className="print-hidden text-xs sm:text-sm font-semibold">
          = {result.toFixed(0)}
        </div>

        {/* Dropdown for type (REMOVED - Now controlled globally) */}

        {/* Updated print/share div */}
        <div className="hidden print:block text-sm">
          {data.val1 || "_"} × {data.val2 || "_"} = {result.toFixed(0)}
          {data.type === "berij" && (
            <span className="text-xs font-normal"> (बे)</span>
          )}
          {data.type === "frak" && (
            <span className="text-xs font-normal"> (फ)</span>
          )}
          {data.type === "jackpot" && (
            <span className="text-xs font-normal"> (जॅ)</span>
          )}
        </div>
      </div>
    );
  };

  // Filtered customer list for the dropdown
  const filteredCustomerList = useMemo(() => {
    return customerList.filter((customer) => {
      const search = customerSearch.toLowerCase();
      if (!search) return true; // Show all if search is empty
      const nameMatch = customer.name.toLowerCase().includes(search);
      const srNoMatch = customer.srNo.toString().includes(search);
      return nameMatch || srNoMatch;
    });
  }, [customerSearch, customerList]);

  // Handlers for the searchable input
  const handleCustomerSearchChange = (e) => {
    isEditingRef.current = false;
    setCustomerSearch(e.target.value);
    setIsCustomerDropdownOpen(true);
    if (serialNumberInput) {
      setSerialNumberInput("");
    }
  };

  const handleCustomerSelect = (customer) => {
    isEditingRef.current = false;
    setSerialNumberInput(customer.srNo.toString());
    setCustomerSearch("");
    setIsCustomerDropdownOpen(false);
  };

  // Logic for the input's display value
  const selectedCustomer = useMemo(
    () => customerList.find((c) => c.srNo.toString() === serialNumberInput),
    [serialNumberInput, customerList]
  );

  const customerDisplayValue = isCustomerDropdownOpen
    ? customerSearch
    : selectedCustomer
    ? `${selectedCustomer.srNo} - ${selectedCustomer.name}`
    : customerSearch;

  // --- NEW: Calculate the header name based on state ---
  const specialColumnHeader = useMemo(() => {
    if (globalSpecialType === "berij") return "बेरीज";
    if (globalSpecialType === "frak") return "फरक";
    // if (globalSpecialType === "frak") return "फरक";
    return "जॅकपॉट"; // Default
  }, [globalSpecialType]);

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-3 md:p-4 lg:p-6 xl:p-8 font-sans">
      {isSharing && (
        <div className="fixed inset-0 bg-white z-50"></div>
      )}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        style={{ zIndex: 99999 }}
        className="text-sm sm:text-base"
      />

      {/* --- ALL STYLE CHANGES ARE IN THIS BLOCK --- */}
      <style>{`
        .sharing-view {
          position: fixed !important; 
          top: 0 !important;
          left: 0 !important;
          z-index: 40 !important;
          opacity: 1 !important;
          background: white !important;
          border: 2px solid black !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0.5rem !important;
          font-size: 13px !important; /* Kept from last change */
          font-weight: bold !important;
          width: 1100px !important; 
          height: auto !important;
          overflow: hidden !important; 
        }
       
        .sharing-view .overflow-x-auto {
            overflow: visible !important; 
        }
        .sharing-view .print-hidden {
          display: none !important; 
        }
        .sharing-view .hidden.print\\:inline { display: inline !important; }
        .sharing-view .hidden.print\\:block { display: block !important; }

        .sharing-view h2 {
          font-size: 20px !important; /* Kept from last change */
          margin: 0 0 0.25rem 0 !important;
          text-align: center !important; font-weight: bold !important;
        }
        .sharing-view .header-section {
          padding-bottom: 0.25rem !important; 
          border-bottom: 2px solid #000 !important;
          position: relative !important;
        }
        .sharing-view .company-header {
          text-align: center !important; 
          font-size: 15px !important; /* Kept from last change */
          font-weight: bold !important; margin: 0.25rem 0 !important;
        }
        .sharing-view .info-section {
          margin-top: 0.25rem !important; 
        }
        .sharing-view .values-section-print {
          display: block !important;
          position: absolute !important;
          top: 35px !important; 
          right: 0.5rem !important;
          border: none !important;
          padding: 0 !important;
        }
        .sharing-view .values-row {
          display: flex !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }
        .sharing-view input, .sharing-view select {
          border: none !important; background: transparent !important;
          padding: 0 !important; color: black !important;
          -webkit-appearance: none; -moz-appearance: none; appearance: none;
          text-align: inherit; font-size: inherit !important;
          font-family: inherit; font-weight: inherit !important;
          min-width: 0 !important;
        }
        .sharing-view table {
          width: 100% !important; 
          margin: 0.2rem 0 !important; /* CHANGED from 0.4rem */
        }
        .sharing-view th, .sharing-view td {
          padding: 6px 4px !important; /* CHANGED from 8px 4px */
          border: 1px solid #000 !important;
          vertical-align: middle !important;
          text-align: center;
        }
        .sharing-view td { text-align: right; }
        .sharing-view td:first-child { text-align: center; }
        .sharing-view .bottom-box-container { 
          margin-top: 0.2rem !important; /* CHANGED from 0.5rem */
        } 
        .sharing-view .bottom-box {
          border: 1px solid #000 !important;
          padding: 7px !important; 
          font-weight: bold !important;
        }
        .sharing-view .bottom-box div {
          /* inherits 13px */
        }
        .sharing-view .bottom-box > div.flex {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
        .sharing-view .bottom-box > div.flex > span:first-child,
        .sharing-view .bottom-box > div.flex > div:first-child {
          min-width: 90px; text-align: left !important;
        }
        .sharing-view .bottom-box > div.flex > input,
        .sharing-view .bottom-box > div.flex > span.font-bold {
          flex: 1; text-align: right !important; width: auto !important;
        }
        .sharing-view #add-row-button, .sharing-view button {
          display: none !important;
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
            font-size: 13px !important; /* Kept */
            font-weight: bold !important;
          }
          .print-hidden { display: none !important; }
          .printable-area h2 {
            font-size: 20px !important; /* Kept */
            margin: 0 0 0.25rem 0 !important;
            text-align: center !important; font-weight: bold !important;
          }
          .printable-area .header-section {
            padding-bottom: 0.25rem !important; 
            border-bottom: 2px solid #000 !important;
            position: relative !important;
          }
          .printable-area .company-header {
            text-align: center !important; 
            font-size: 15px !important; /* Kept */
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
          }
          .printable-area .values-row {
            display: flex !important;
            justify-content: space-between !important;
            gap: 1rem !important;
          }
          .printable-area input, .printable-area select {
            border: none !important; background: transparent !important;
            padding: 0 !important; color: black !important;
            -webkit-appearance: none; -moz-appearance: none; appearance: none;
            text-align: inherit; font-size: inherit !important;
            font-family: inherit; font-weight: inherit !important;
            min-width: 0 !important;
          }
          .printable-area table {
            width: 100% !important; 
            margin: 0.2rem 0 !important; /* CHANGED from 0.4rem */
          }
          .printable-area th, .printable-area td {
            padding: 6px 4px !important; /* CHANGED from 8px 4px */
            border: 1px solid #000 !important;
            vertical-align: middle !important;
            text-align: center;
          }
          .printable-area td {
            text-align: right;
          }
          .printable-area td:first-child {
            text-align: center;
          }
          .printable-area .bottom-box-container {
            margin-top: 0.2rem !important; /* CHANGED from 0.5rem */
          } 
          .printable-area .bottom-box {
            border: 1px solid #000 !important;
            padding: 7px !important; 
            font-weight: bold !important;
          }
          .printable-area .bottom-box div {
            /* inherits 13px */
          }
          .printable-area .bottom-box > div.flex {
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .printable-area .bottom-box > div.flex > span:first-child,
          .printable-area .bottom-box > div.flex > div:first-child {
            min-width: 90px;
            text-align: left !important;
          }
          .printable-area .bottom-box > div.flex > input,
          .printable-area .bottom-box > div.flex > span.font-bold {
            flex: 1;
            text-align: right !important;
            width: auto !important;
          }
          #add-row-button, .printable-area button {
            display: none !important;
          }
        }

        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none; margin: 0;
        }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>

      {/* --- END OF STYLE BLOCK --- */}

      <div
        ref={formRef}
        className="max-w-7xl mx-auto bg-white rounded-lg shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8"
      >
        <div
          ref={printRef}
          className="printable-area p-2 sm:p-3 md:p-4 border border-gray-400 rounded-lg"
        >
          {/* Header Section */}
          <div className="header-section relative pb-3 sm:pb-4 md:pb-5 mb-3 sm:mb-4 md:mb-5">
            {/* Business Name and Company Selection - Centered */}
            <div className="text-center mb-3 sm:mb-4">
              <h2 className="font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl mb-2">{formData.businessName}</h2>
              <div className="company-header">
                <span className="print-hidden">
                  <select
                    name="customerCompany"
                    value={formData.customerCompany}
                    onChange={handleChange}
                    className="bg-transparent border rounded p-1.5 sm:p-2 text-xs sm:text-sm md:text-base w-full max-w-xs"
                  >
                    <option value="">Choose Company...</option>
                    {COMPANY_NAMES.map((company, index) => (
                      <option key={index} value={company}>
                        {company}
                      </option>
                    ))}
                  </select>
                </span>
                <span className="hidden print:inline font-bold text-sm sm:text-base">
                  Company Name : {formData.customerCompany || "N/A"}
                </span>
              </div>
            </div>

            {/* Open/Close/Jod Box - Responsive positioning */}
            {/* Mobile & Tablet: Below header in grid, Desktop: Absolute top-right */}
            <div className="values-section 
              grid grid-cols-3 gap-2 p-2 mb-3
              lg:absolute lg:top-2 lg:right-2 lg:flex lg:flex-col lg:gap-0 lg:space-y-2 lg:p-3 lg:mb-0
              border border-gray-300 rounded-md bg-white print-hidden shadow-sm">
              <div className="flex flex-col lg:flex-row items-center lg:gap-2">
                <span className="font-bold text-xs sm:text-sm md:text-base whitespace-nowrap mb-1 lg:mb-0">Open:</span>
                <input
                  type="text"
                  name="open"
                  value={openCloseValues.open}
                  onChange={handleOpenCloseChange}
                  className="w-full lg:w-24 text-center border border-gray-300 rounded text-xs sm:text-sm md:text-base p-1 sm:p-1.5"
                />
              </div>
              <div className="flex flex-col lg:flex-row items-center lg:gap-2">
                <span className="font-bold text-xs sm:text-sm md:text-base whitespace-nowrap mb-1 lg:mb-0">Close:</span>
                <input
                  type="text"
                  name="close"
                  value={openCloseValues.close}
                  onChange={handleOpenCloseChange}
                  className="w-full lg:w-24 text-center border border-gray-300 rounded text-xs sm:text-sm md:text-base p-1 sm:p-1.5"
                />
              </div>
              <div className="flex flex-col lg:flex-row items-center lg:gap-2">
                <span className="font-bold text-xs sm:text-sm md:text-base whitespace-nowrap mb-1 lg:mb-0">Jod:</span>
                <input
                  type="text"
                  name="jod"
                  value={openCloseValues.jod}
                  onChange={handleOpenCloseChange}
                  className="w-full lg:w-24 text-center border border-gray-300 rounded text-xs sm:text-sm md:text-base p-1 sm:p-1.5"
                />
              </div>
            </div>

            {/* Open/Close/Jod Display (Print Visible) */}
            <div className="values-section-print hidden">
              <div className="values-row">
                <span>ओपन:</span>
                <span>{openCloseValues.open || "___"}</span>
              </div>
              <div className="values-row">
                <span>क्लोज:</span>
                <span>{openCloseValues.close || "___"}</span>
              </div>
              <div className="values-row">
                <span>जोड:</span>
                <span>{openCloseValues.jod || "___"}</span>
              </div>
            </div>

            {/* Date, Day, and Customer Info - Left aligned */}
            <div className="info-section space-y-3 sm:space-y-4">
              {/* Day and Date - Horizontal layout */}
              <div className="date-info flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
                <div className="flex items-center">
                  <span className="mr-2 text-sm sm:text-base md:text-lg font-medium">वार:-</span>
                  <input
                    type="text"
                    name="day"
                    value={formData.day}
                    onChange={handleChange}
                    className="font-semibold bg-transparent border-b border-gray-400 print-hidden w-24 sm:w-28 text-sm sm:text-base px-1"
                  />
                  <span className="hidden print:inline font-semibold">
                    {formData.day}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2 text-sm sm:text-base md:text-lg font-medium">दि:-</span>
                  <input
                    type="text"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    placeholder="DD-MM-YYYY"
                    className="font-semibold bg-transparent border-b border-gray-400 print-hidden w-28 sm:w-32 text-sm sm:text-base px-1"
                  />
                  <span className="hidden print:inline font-semibold">
                    {formData.date}
                  </span>
                </div>
              </div>

              {/* Customer Selection */}
              <div className="customer-section">
                <div className="print-hidden">
                  <div
                    className="flex flex-col items-start relative w-full max-w-md"
                    ref={customerSearchRef}
                  >
                    <div className="flex items-center w-full gap-2">
                      <strong className="text-sm sm:text-base md:text-lg whitespace-nowrap">Sr.No:</strong>
                      <input
                        type="search"
                        placeholder="Search S.No or Name..."
                        value={customerDisplayValue}
                        onChange={handleCustomerSearchChange}
                        onFocus={() => setIsCustomerDropdownOpen(true)}
                        className="p-2 sm:p-2.5 flex-1 rounded-md border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      />
                    </div>

                    {isCustomerDropdownOpen &&
                      filteredCustomerList.length > 0 && (
                        <div className="absolute top-full mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 sm:max-h-60 overflow-y-auto">
                          {filteredCustomerList.map((customer) => (
                            <div
                              key={customer._id}
                              className="p-2 sm:p-2.5 hover:bg-gray-100 cursor-pointer text-sm sm:text-base"
                              onClick={() => handleCustomerSelect(customer)}
                            >
                              {customer.srNo} - {customer.name}
                            </div>
                          ))}
                        </div>
                      )}

                    <div className="mt-2 sm:mt-3">
                      <span className="font-bold text-gray-800 text-sm sm:text-base">
                        {formData.customerName
                          ? `Customer Name: ${formData.customerName}`
                          : "No customer selected"}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="hidden print:inline customer-info text-sm sm:text-base">
                  <strong>Sr.No:</strong>{" "}
                  {getCustomerSrNo(formData.customerId)} |
                  <strong> Customer Name:</strong>{" "}
                  {formData.customerName || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Game Rows Table */}
          <div className="w-full overflow-x-auto">
            <div className="text-xs sm:text-sm text-gray-500 mb-2 block md:hidden text-center">← Swipe to see all columns →</div>
            <table className="w-full min-w-[600px] md:min-w-0 text-xs sm:text-sm md:text-base border-collapse">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[10%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">ओ.</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">रक्कम</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">ओ.</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">जोड</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">को.</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">पान</th>
                  <th className="border p-1 sm:p-1.5 md:p-2 text-center text-xs sm:text-sm md:text-base font-semibold">गुण</th>

                  {/* --- NEW: Header Dropdown --- */}
                  <th
                    className="border p-1 sm:p-1.5 md:p-2 text-center relative"
                    ref={specialHeaderRef}
                  >
                    <button
                      type="button"
                      onClick={() => setIsSpecialDropdownOpen((prev) => !prev)}
                      className="print-hidden font-bold text-blue-600 hover:text-blue-800 text-xs sm:text-sm md:text-base"
                    >
                      {specialColumnHeader} ▾
                    </button>
                    <span className="hidden print:inline font-semibold">
                      {specialColumnHeader}
                    </span>

                    {isSpecialDropdownOpen && (
                      <div className="print-hidden absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 sm:w-28 md:w-32 bg-white border border-gray-300 rounded-md shadow-lg z-20">
                        <div
                          className="p-2 sm:p-2.5 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("jackpot")
                          }
                        >
                          जॅकपॉट
                        </div>
                        <div
                          className="p-2 sm:p-2.5 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("berij")
                          }
                        >
                          बेरीज
                        </div>
                        <div
                          className="p-2 sm:p-2.5 hover:bg-gray-100 cursor-pointer text-xs sm:text-sm"
                          onClick={() =>
                            handleGlobalSpecialTypeChange("frak")
                          }
                        >
                          फरक
                        </div>
                      </div>
                    )}
                  </th>
                  {/* --- END NEW HEADER --- */}
                </tr>
              </thead>
              <tbody>
                {gameRows.map((row, index) => {
                  const multiplier = row.multiplier;
                  const hasMultiplier = multiplier !== undefined;

                  const renderCellWithCalculation = (colName) => {
                    const effectiveMultiplier =
                      colName === "jod" ? multiplier * 10 : multiplier;
                    const cellTotal =
                      evaluateExpression(row[colName]) * effectiveMultiplier;

                    return (
                      <div className="flex flex-col items-end p-1 sm:p-1.5">
                        <input
                          type="text"
                          name={colName}
                          value={row[colName]}
                          onChange={(e) => handleRowChange(index, e)}
                          className="w-full text-right bg-white border border-gray-300 rounded p-1 sm:p-1.5 text-xs sm:text-sm mb-1 print-hidden"
                        />
                        <div className="hidden print:block w-full print:text-center print:border-b print:border-gray-400 print:pb-1 print:mb-1">
                          {row[colName] || "_"}
                        </div>

                        {hasMultiplier && (
                          <span className="text-gray-500 whitespace-nowrap flex items-center justify-end print-hidden text-xs sm:text-sm">
                            *{" "}
                            <input
                              type="number"
                              value={effectiveMultiplier}
                              onChange={(e) =>
                                handleMultiplierChange(
                                  index,
                                  colName === "jod"
                                    ? Number(e.target.value) / 10
                                    : e.target.value
                                )
                              }
                              className="w-8 sm:w-10 text-center bg-transparent focus:outline-none text-xs sm:text-sm"
                            />
                            <span className="ml-1">
                              = {cellTotal.toFixed(0)}
                            </span>
                          </span>
                        )}

                        {hasMultiplier && (
                          <span className="hidden print:inline text-xs">
                            * {effectiveMultiplier} = {cellTotal.toFixed(0)}
                          </span>
                        )}
                      </div>
                    );
                  };

                  // --- UPDATED: Simplified cell rendering ---
                  const panCell = renderComplexCell(index, "pan");
                  const gunCell = renderComplexCell(index, "gun");
                  const jbfCell = renderSpecialCell(index); // Use special renderer

                  if (row.type === "") {
                    return (
                      <tr key={row.id}>
                        <td
                          colSpan="2"
                          className="border-l border-r border-t border-b p-1 sm:p-1.5 md:p-2"
                        ></td>
                        <td className="border border-l p-0">
                          {renderCellWithCalculation("o")}
                        </td>
                        <td className="border border-l p-0">
                          {renderCellWithCalculation("jod")}
                        </td>
                        <td className="border border-l p-0">
                          {renderCellWithCalculation("ko")}
                        </td>
                        <td className="border border-l p-0">{panCell}</td>
                        <td className="border border-l p-0">{gunCell}</td>
                        {/* --- UPDATED: jbfCell with remove button --- */}
                        <td className="border border-l p-0">
                          <div className="flex items-center justify-center">
                            {jbfCell}
                            <button
                              onClick={() => removeRow(index)}
                              className="print-hidden text-red-500 hover:text-red-700 ml-1 sm:ml-2 p-1"
                            >
                              <FaMinus size={12} className="sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    return (
                      <tr key={row.id}>
                        <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">{row.type}</td>
                        <td className="border p-1 sm:p-1.5 md:p-2">
                          <input
                            type="text"
                            name="income"
                            value={row.income}
                            onChange={(e) => handleRowChange(index, e)}
                            className="w-full text-right border border-gray-300 rounded p-1 sm:p-1.5 text-xs sm:text-sm md:text-base print-hidden"
                          />
                          <span className="hidden print:block text-right text-xs sm:text-sm">
                            {row.income}
                          </span>
                        </td>
                        <td className="border p-0">
                          {renderCellWithCalculation("o")}
                        </td>
                        <td className="border p-0">
                          {renderCellWithCalculation("jod")}
                        </td>
                        <td className="border p-0">
                          {renderCellWithCalculation("ko")}
                        </td>
                        <td className="border p-0">{panCell}</td>
                        <td className="border p-0">{gunCell}</td>
                        {/* --- UPDATED: jbfCell --- */}
                        <td className="border p-0">{jbfCell}</td>
                      </tr>
                    );
                  }
                })}
              </tbody>
              <tbody className="bg-gray-50">
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">टो.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base font-semibold">
                    {calculationResults.totalIncome.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">क.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base">
                    <div className="flex items-center justify-end print-hidden">
                      <input
                        type="number"
                        name="deductionRate"
                        value={formData.deductionRate}
                        onChange={handleChange}
                        className="w-10 sm:w-12 text-right bg-white border-b p-1 text-xs sm:text-sm"
                        min="0"
                        max="100"
                      />
                      <span className="ml-1">%</span>
                    </div>
                    <span className="font-bold">
                      {calculationResults.deduction.toFixed(2)}
                    </span>
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">टो.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base font-semibold">
                    {calculationResults.afterDeduction.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">पें.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base font-semibold">
                    {calculationResults.payment.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">टो.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base font-semibold">
                    {calculationResults.remainingBalance.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">मा.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2">
                    <input
                      type="number"
                      name="pendingAmount"
                      value={formData.pendingAmount}
                      onChange={handleChange}
                      className="w-full text-right bg-white border-b p-1 text-xs sm:text-sm md:text-base print-hidden"
                    />
                    <span className="hidden print:block text-right text-xs sm:text-sm md:text-base">
                      {formData.pendingAmount || 0}
                    </span>
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-xs sm:text-sm md:text-base">टो.</td>
                  <td className="border p-1 sm:p-1.5 md:p-2 text-right text-xs sm:text-sm md:text-base font-semibold">
                    {calculationResults.totalDue.toFixed(2)}
                  </td>
                  {/* --- UPDATED: colSpan from 8 to 6 --- */}
                  <td colSpan="6" className="border p-1 sm:p-1.5 md:p-2"></td>
                </tr>
                <tr className="bg-gray-50">
                  <td
                    colSpan="2"
                    className="border p-1 sm:p-1.5 md:p-2 font-bold text-right align-middle text-xs sm:text-sm md:text-base"
                  >
                    Total *
                  </td>
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.oFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.jodFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.koFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.panFinalTotal.toFixed(2)}
                  </td>
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.gunFinalTotal.toFixed(2)}
                  </td>
                  {/* --- UPDATED: Total cell for special --- */}
                  <td className="border p-1 sm:p-1.5 md:p-2 font-medium text-right text-xs sm:text-sm md:text-base">
                    {calculationResults.specialFinalTotal.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-2 sm:mt-3 flex justify-end print-hidden">
            <button
              id="add-row-button"
              onClick={addRow}
              className="flex items-center px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 bg-blue-500 text-white rounded-md shadow-sm hover:bg-blue-600 text-xs sm:text-sm md:text-base transition-colors"
            >
              <FaPlus size={12} className="sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Add Row
            </button>
          </div>

          {/* Bottom Calculation Boxes */}
          <div className="flex flex-col lg:flex-row justify-between mt-3 sm:mt-4 md:mt-5 gap-3 sm:gap-4 bottom-box-container">
            <div className="w-full lg:w-1/2 p-3 sm:p-4 md:p-5 border rounded-md space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base bottom-box">
              <div className="flex justify-between items-center">
                <span className="font-semibold">जमा:-</span>
                <input
                  type="number"
                  name="jama"
                  value={formData.jama}
                  onChange={handleChange}
                  className="w-2/3 sm:w-3/5 text-right bg-transparent border-b print-hidden p-1"
                />
                <span className="hidden print:inline font-bold">
                  {formData.jama || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">टो:-</span>
                <span className="font-bold">
                  {calculationResults.jamaTotal.toFixed(2)}
                </span>
              </div>

              {/* --- UPDATED: Chuk Section with Percentage --- */}
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div className="flex items-center print-hidden">
                  <span className="mr-2 font-semibold">चूक:</span>
                  <input
                    type="checkbox"
                    name="isChukEnabled"
                    id="isChukEnabled"
                    checked={formData.isChukEnabled}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <label htmlFor="isChukEnabled" className="text-xs sm:text-sm">
                    {formData.isChukEnabled ? "(LD)" : "(NA)"}
                  </label>
                </div>
                <span className="hidden print:inline font-semibold">
                  चूक {formData.isChukEnabled ? "(LD)" : "(NA)"}:-
                </span>

                {/* Percentage Input (Show if LD) */}
                {formData.isChukEnabled && (
                  <div className="print-hidden flex items-center">
                    <input
                      type="number"
                      name="chukPercentage"
                      value={formData.chukPercentage}
                      onChange={handleChange}
                      className="w-12 sm:w-14 text-right bg-transparent border-b p-1"
                    />
                    <span className="ml-1">%</span>
                  </div>
                )}

                {/* Chuk Amount Input */}
                {/* --- MODIFIED: This is type="number", so it accepts negative values --- */}
                <input
                  type="number"
                  name="chuk"
                  value={formData.chuk}
                  onChange={handleChange}
                  disabled={formData.isChukEnabled} // Disable if LD
                  className={`w-1/3 sm:w-2/5 text-right bg-transparent border-b print-hidden p-1 ${
                    formData.isChukEnabled ? "bg-gray-100" : ""
                  }`}
                  placeholder={
                    formData.isChukEnabled ? "Calculated" : "Enter amount"
                  }
                />
                <span className="hidden print:inline font-bold">
                  {Number(calculationResults.chuk || 0).toFixed(2)}
                </span>
              </div>
              {/* --- END UPDATE --- */}

              <div className="flex justify-between">
                {/* --- MODIFIED: This logic is correct for yene/dene --- */}
                <span className="font-semibold">
                  अंतिम टोटल{" "}
                  {calculationResults.finalTotalAfterChuk < 0
                    ? "(देणे)"
                    : "(येणे)"}
                  :-
                </span>
                <span className="font-bold text-base sm:text-lg md:text-xl">
                  {Math.abs(calculationResults.finalTotalAfterChuk).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="w-full lg:w-1/2 p-3 sm:p-4 md:p-5 border rounded-md space-y-2 sm:space-y-3 text-xs sm:text-sm md:text-base bottom-box">
              <div className="flex justify-between items-center">
                <span className="font-semibold">आड:-</span>
                <input
                  type="number"
                  name="advanceAmount"
                  value={formData.advanceAmount}
                  onChange={handleChange}
                  className="w-2/3 sm:w-3/5 text-right bg-transparent border-b print-hidden p-1"
                />
                <span className="hidden print:inline font-bold">
                  {formData.advanceAmount || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">कटिंग:-</span>
                <input
                  type="number"
                  name="cuttingAmount"
                  value={formData.cuttingAmount}
                  onChange={handleChange}
                  className="w-2/3 sm:w-3/5 text-right bg-transparent border-b print-hidden p-1"
                />
                <span className="hidden print:inline font-bold">
                  {formData.cuttingAmount || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">टो:-</span>
                <span className="font-bold text-base sm:text-lg md:text-xl">
                  {calculationResults.finalTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons (Print Hidden) */}
        <div className="print-hidden flex flex-wrap justify-center items-center mt-4 sm:mt-5 md:mt-6 gap-2 sm:gap-3 md:gap-4">
          <button
            onClick={() => handleSave(true)}
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 transition-colors text-sm sm:text-base md:text-lg font-medium"
          >
            {formData._id ? 'Update Receipt' : 'Save'}
          </button>
          <button
            onClick={handlePrint}
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors flex items-center text-sm sm:text-base md:text-lg font-medium"
          >
            <FaPrint className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Print
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing}
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-purple-500 text-white rounded-full shadow-lg hover:bg-purple-600 transition-colors flex items-center disabled:opacity-50 text-sm sm:text-base md:text-lg font-medium"
          >
            <FaShareAlt className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            {isSharing ? "Sharing..." : "Share"}
          </button>
          <button
            onClick={clearForm}
            className="px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gray-500 text-white rounded-full shadow-lg hover:bg-gray-600 transition-colors text-sm sm:text-base md:text-lg font-medium"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="print-hidden mt-4 sm:mt-5 md:mt-6 lg:mt-8 max-w-7xl mx-auto bg-white rounded-lg shadow-xl p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold mb-3 sm:mb-4 md:mb-5">Saved Receipts</h2>
        {/* --- MODIFIED: Search filter container --- */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4">
          <input
            type="text"
            placeholder="Search by Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-1/2 p-2 sm:p-2.5 md:p-3 border border-gray-300 rounded-md text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {/* --- THIS IS THE NEW <select> --- */}
          <select
            value={companySearchTerm}
            onChange={(e) => setCompanySearchTerm(e.target.value)}
            className="w-full sm:w-1/2 p-2 sm:p-2.5 md:p-3 border border-gray-300 rounded-md bg-white text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Companies</option>
            {COMPANY_NAMES.map((company, index) => (
              <option key={index} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Name
                </th>
                <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* The 'receipts' array is now sorted, so 'filteredReceipts' will be sorted too */}
              {filteredReceipts.length > 0 ? (
                filteredReceipts.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {r.customerName}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {r.customerCompany || "N/A"}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                      {dayjs(r.date).format("DD-MM-YYYY")}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm font-semibold">
                      {r.finalTotalAfterChuk &&
                        Number(r.finalTotalAfterChuk).toFixed(2)}
                    </td>
                    <td className="px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => handleEdit(r._id)}
                          className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                          title="Edit"
                        >
                          <FaEdit size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() => handleTablePrint(r._id)}
                          className="text-green-600 hover:text-green-800 transition-colors p-1"
                          title="Print"
                        >
                          <FaPrint size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          className="text-red-600 hover:text-red-800 transition-colors p-1"
                          title="Delete"
                        >
                          <FaTrashAlt size={14} className="sm:w-4 sm:h-4 md:w-5 md:h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-6 sm:py-8 text-gray-500 text-sm sm:text-base"
                  >
                    No receipts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Custom Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <FaTimes size={20} />
            </button>

            {/* Modal Header */}
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Share Receipt
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Choose how you want to share this receipt
            </p>

            {/* Share Options */}
            <div className="space-y-3">
              {/* WhatsApp Option */}
              <button
                onClick={handleWhatsAppShare}
                className="w-full flex items-center justify-start gap-4 p-4 bg-green-50 hover:bg-green-100 border-2 border-green-500 rounded-lg transition-colors"
              >
                <div className="bg-green-500 text-white p-3 rounded-full">
                  <FaWhatsapp size={24} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">
                    Share via WhatsApp
                  </div>
                  <div className="text-xs text-gray-600">
                    Downloads image & opens WhatsApp
                  </div>
                </div>
              </button>

              {/* Native Share Option (if supported) */}
              {navigator.share && (
                <button
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-start gap-4 p-4 bg-blue-50 hover:bg-blue-100 border-2 border-blue-500 rounded-lg transition-colors"
                >
                  <div className="bg-blue-500 text-white p-3 rounded-full">
                    <FaShareAlt size={24} />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-gray-800">
                      Share with Other Apps
                    </div>
                    <div className="text-xs text-gray-600">
                      Use system share menu
                    </div>
                  </div>
                </button>
              )}

              {/* Download Option */}
              <button
                onClick={handleDownloadOnly}
                className="w-full flex items-center justify-start gap-4 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-300 rounded-lg transition-colors"
              >
                <div className="bg-gray-500 text-white p-3 rounded-full">
                  <FaDownload size={24} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">
                    Download Only
                  </div>
                  <div className="text-xs text-gray-600">
                    Save image to your device
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptForm;
