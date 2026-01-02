import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
  FaUserClock,
  FaUserEdit,
  FaBars,
  FaTrash,
  FaCheck,
  FaTimes,
  FaDownload,
} from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useNavigate } from "react-router-dom";

// Define the base API URL
const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const AdminDashboard = () => {
  const navigate = useNavigate();

  // --- Authentication check ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "admin") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const [collapsed, setCollapsed] = useState(false);
  const [currentSection, setCurrentSection] = useState("dashboard");
  const [vendors, setVendors] = useState([]);
  const [pendingVendors, setPendingVendors] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [rejectedVendors, setRejectedVendors] = useState([]);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const toggleSidebar = () => setCollapsed(!collapsed);

  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <FaBars /> },
    { key: "add", label: "Add Vendor", icon: <FaUserPlus /> },
    { key: "pending", label: "Pending Approvals", icon: <FaUserClock /> },
    { key: "manage", label: "Manage Profiles", icon: <FaUserEdit /> },
  ];

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API_BASE_URI}/api/vendors`);
      const all = res.data;
      setVendors(all);
      setPendingVendors(all.filter((v) => v.status === "pending"));
      setApprovedVendors(all.filter((v) => v.status === "approved"));
      setRejectedVendors(all.filter((v) => v.status === "rejected"));
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch vendors.");
    }
  };

  const handleAddVendor = async (e) => {
    e.preventDefault();
    if (!name || !businessName || !mobile || !email || !address || !password) {
      toast.error("Please fill all fields!");
      return;
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE_URI}/api/vendors`, {
        name,
        businessName,
        mobile,
        email,
        address,
        password,
      });
      toast.success("Vendor added successfully!");
      setName("");
      setBusinessName("");
      setEmail("");
      setMobile("");
      setAddress("");
      setPassword("");
      fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add vendor.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await axios.put(`${API_BASE_URI}/api/vendors/${id}`, {
        status: "approved",
      });
      toast.success("Vendor approved!");
      fetchVendors();
    } catch {
      toast.error("Failed to approve vendor.");
    }
  };

  const handleReject = async (id) => {
    try {
      await axios.put(`${API_BASE_URI}/api/vendors/${id}`, {
        status: "rejected",
      });
      toast.info("Vendor rejected.");
      fetchVendors();
    } catch {
      toast.error("Failed to reject vendor.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE_URI}/api/vendors/${id}`);
      toast.warning("Vendor deleted.");
      fetchVendors();
    } catch {
      toast.error("Failed to delete vendor.");
    }
  };

  const handleEdit = (vendor) => {
    setEditVendor(vendor);
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (
      !editVendor.name ||
      !editVendor.businessName ||
      !editVendor.mobile ||
      !editVendor.email ||
      !editVendor.address
    ) {
      toast.error("Please fill all fields!");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URI}/api/vendors/${editVendor._id}`,
        editVendor
      );
      toast.success("Vendor updated!");
      setShowEditModal(false);
      fetchVendors();
    } catch {
      toast.error("Failed to update vendor.");
    }
  };

  const handleChangePassword = (vendor) => {
    setEditVendor(vendor);
    setNewPassword("");
    setShowPasswordModal(true);
  };

  const savePassword = async () => {
    if (!newPassword) {
      toast.error("Please enter a new password!");
      return;
    }
    try {
      await axios.put(
        `${API_BASE_URI}/api/vendors/${editVendor._id}/password`,
        { password: newPassword }
      );
      toast.success("Password updated!");
      setShowPasswordModal(false);
    } catch {
      toast.error("Failed to update password.");
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(vendors);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    XLSX.writeFile(wb, "vendors.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Vendor List", 14, 10);
    autoTable(doc, {
      head: [["Name", "Business", "Mobile", "Email", "Address", "Status"]],
      body: vendors.map((v) => [
        v.name,
        v.businessName,
        v.mobile,
        v.email,
        v.address,
        v.status,
      ]),
    });
    doc.save("vendors.pdf");
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.businessName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleLogout = () => {
    const role = localStorage.getItem("role"); 

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("vendorId");
    localStorage.removeItem("vendorProfile");

    if (role === "admin") {
      navigate("/", { replace: true });
    } else if (role === "vendor") {
      navigate("/vendor-login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaUsers className="text-white text-lg" />
              </div>
              <h2 className="font-bold text-gray-800 text-lg">Admin Panel</h2>
            </div>
          )}
          <button
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition"
            onClick={toggleSidebar}
          >
            <FaBars />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {menu.map((item) => (
            <button
              key={item.key}
              onClick={() => setCurrentSection(item.key)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                collapsed ? "justify-center" : ""
              } ${
                currentSection === item.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 m-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-all ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <FaTimesCircle className="text-lg" />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {currentSection === "dashboard" && (
          <div>
            {/* Page Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Dashboard Overview
              </h2>
              <p className="text-gray-600">Monitor and manage your vendor ecosystem</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                    <FaUsers className="text-gray-700 text-xl" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{vendors.length}</span>
                </div>
                <h4 className="font-semibold text-gray-700">Total Vendors</h4>
                <p className="text-sm text-gray-500 mt-1">All registered vendors</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-center">
                    <FaClock className="text-yellow-600 text-xl" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{pendingVendors.length}</span>
                </div>
                <h4 className="font-semibold text-gray-700">Pending</h4>
                <p className="text-sm text-gray-500 mt-1">Awaiting approval</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-50 border border-green-200 rounded-lg flex items-center justify-center">
                    <FaCheckCircle className="text-green-600 text-xl" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{approvedVendors.length}</span>
                </div>
                <h4 className="font-semibold text-gray-700">Approved</h4>
                <p className="text-sm text-gray-500 mt-1">Active vendors</p>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center">
                    <FaTimesCircle className="text-red-600 text-xl" />
                  </div>
                  <span className="text-2xl font-bold text-gray-800">{rejectedVendors.length}</span>
                </div>
                <h4 className="font-semibold text-gray-700">Rejected</h4>
                <p className="text-sm text-gray-500 mt-1">Declined requests</p>
              </div>
            </div>
          </div>
        )}

        {currentSection === "add" && (
          <div>
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Add New Vendor</h2>
              <p className="text-gray-600">Register a new vendor to the platform</p>
            </div>

            <div className="bg-white rounded-lg p-6 lg:p-8 shadow-sm border border-gray-200">
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-5"
                onSubmit={handleAddVendor}
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter vendor name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter business name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="Enter mobile number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter full address"
                    rows="3"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-6 rounded-lg font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <FaUserPlus className="animate-spin" />
                        Adding Vendor...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <FaUserPlus />
                        Add Vendor
                      </span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {currentSection === "pending" && (
          <div>
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Pending Approvals</h2>
              <p className="text-gray-600">Review and approve vendor registration requests</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Business</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Mobile</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Address</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingVendors.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                          <FaUserClock className="mx-auto text-4xl text-gray-300 mb-2" />
                          <p>No pending approvals</p>
                        </td>
                      </tr>
                    ) : (
                      pendingVendors.map((v) => (
                        <tr key={v._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-gray-800 font-medium">{v.name}</td>
                          <td className="px-6 py-4 text-gray-700">{v.businessName}</td>
                          <td className="px-6 py-4 text-gray-700">{v.mobile}</td>
                          <td className="px-6 py-4 text-gray-700">{v.email}</td>
                          <td className="px-6 py-4 text-gray-700">{v.address}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => handleApprove(v._id)}
                                title="Approve"
                              >
                                <FaCheck />
                              </button>
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => handleReject(v._id)}
                                title="Reject"
                              >
                                <FaTimes />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {currentSection === "manage" && (
          <div>
            {/* Page Header */}
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">Manage Vendor Profiles</h2>
              <p className="text-gray-600">View, edit, and manage all vendor accounts</p>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              {/* Search and Export Toolbar */}
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="w-full md:w-96">
                    <input
                      className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      placeholder="Search by business name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToExcel}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                    >
                      <FaDownload /> Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                    >
                      <FaDownload /> PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Vendors Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Business</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Mobile</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold">Address</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Status</th>
                      <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredVendors.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                          <FaUserEdit className="mx-auto text-4xl text-gray-300 mb-2" />
                          <p>No vendors found</p>
                        </td>
                      </tr>
                    ) : (
                      filteredVendors.map((v) => (
                        <tr key={v._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-4 text-gray-800 font-medium">{v.name}</td>
                          <td className="px-6 py-4 text-gray-700">{v.businessName}</td>
                          <td className="px-6 py-4 text-gray-700">{v.mobile}</td>
                          <td className="px-6 py-4 text-gray-700">{v.email}</td>
                          <td className="px-6 py-4 text-gray-700 max-w-xs truncate">{v.address}</td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                                v.status === "approved"
                                  ? "bg-green-100 text-green-700"
                                  : v.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {v.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                onClick={() => handleEdit(v)}
                                title="Edit Profile"
                              >
                                Edit
                              </button>
                              <button
                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                                onClick={() => handleChangePassword(v)}
                                title="Change Password"
                              >
                                Password
                              </button>
                              <button
                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                                onClick={() => handleDelete(v._id)}
                                title="Delete Vendor"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative animate-fade-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Edit Vendor Profile</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              {editVendor && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={editVendor.name}
                      onChange={(e) =>
                        setEditVendor({ ...editVendor, name: e.target.value })
                      }
                      placeholder="Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={editVendor.businessName}
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          businessName: e.target.value,
                        })
                      }
                      placeholder="Business Name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={editVendor.mobile}
                      onChange={(e) =>
                        setEditVendor({ ...editVendor, mobile: e.target.value })
                      }
                      placeholder="Mobile"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={editVendor.email}
                      onChange={(e) =>
                        setEditVendor({ ...editVendor, email: e.target.value })
                      }
                      placeholder="Email"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      value={editVendor.address}
                      onChange={(e) =>
                        setEditVendor({
                          ...editVendor,
                          address: e.target.value,
                        })
                      }
                      placeholder="Address"
                      rows="3"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition shadow-md"
                onClick={saveEdit}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-fade-in">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-800">Change Password</h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-gray-400 hover:text-gray-600 transition p-1"
              >
                <FaTimes className="text-xl" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                onClick={() => setShowPasswordModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition shadow-md"
                onClick={savePassword}
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;