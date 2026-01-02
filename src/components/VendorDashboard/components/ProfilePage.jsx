import React, { useState } from "react";
import {
  FaUserCircle,
  FaBuilding,
  FaUser,
  FaEnvelope,
  FaMobileAlt,
  FaMapMarkerAlt,
  FaEdit,
  FaShieldAlt,
  FaCheckCircle,
  FaInfoCircle,
  FaCalendarAlt,
  FaClock,
  FaIdCard,
  FaKey,
  FaLock,
  FaSave,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { formatDate } from "../utils/formatters";
import { API_BASE_URI } from "../utils/constants";

const ProfilePage = ({ vendor, onProfileUpdate }) => {
  const [editMode, setEditMode] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formData, setFormData] = useState({
    businessName: vendor?.businessName || "",
    name: vendor?.name || "",
    email: vendor?.email || "",
    mobile: vendor?.mobile || "",
    address: vendor?.address || "",
  });

  const handleEditClick = () => {
    if (vendor) {
      setFormData({
        businessName: vendor.businessName,
        name: vendor.name,
        email: vendor.email,
        mobile: vendor.mobile,
        address: vendor.address,
      });
      setEditMode(true);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Not logged in!");

      const res = await fetch(`${API_BASE_URI}/api/vendors/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      
      toast.success("Profile updated successfully!");
      onProfileUpdate(data.vendor);
      setEditMode(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSave = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    try {
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        setPasswordError("Please fill all password fields");
        toast.error("Please fill all password fields");
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setPasswordError("New passwords do not match");
        toast.error("New passwords do not match");
        return;
      }

      if (passwordData.newPassword.length < 6) {
        setPasswordError("New password must be at least 6 characters");
        toast.error("New password must be at least 6 characters");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        setPasswordError("Not logged in!");
        toast.error("Not logged in!");
        return;
      }

      setIsChangingPassword(true);

      const res = await fetch(`${API_BASE_URI}/api/vendors/me/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setPasswordError(data.message || "Failed to change password");
        toast.error(data.message || "Failed to change password");
        setIsChangingPassword(false);
        return;
      }
      
      setPasswordSuccess("Password changed successfully!");
      toast.success("Password changed successfully!");
      
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setPasswordSuccess("");
        setPasswordError("");
        setIsChangingPassword(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err.message || "An error occurred");
      toast.error(err.message || "An error occurred");
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-8 md:p-10 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 bg-white border-4 border-blue-200 rounded-full flex items-center justify-center shadow-xl">
                <FaUserCircle className="text-8xl text-gray-400" />
              </div>
              <div className="absolute bottom-0 right-0 w-12 h-12 bg-green-500 border-4 border-white rounded-full flex items-center justify-center shadow-lg">
                <FaCheckCircle className="text-white text-lg" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-3">
                {vendor?.name}
              </h1>
              <p className="text-xl text-gray-600 mb-4 flex items-center gap-2 justify-center md:justify-start">
                <FaBuilding className="text-2xl text-slate-600" />
                {vendor?.businessName}
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="px-5 py-2 bg-white border-2 border-gray-300 rounded-full text-gray-700 text-sm font-semibold flex items-center gap-2 shadow-sm">
                  <FaShieldAlt />
                  Vendor Account
                </span>
                <span className="px-5 py-2 bg-green-50 border-2 border-green-300 rounded-full text-green-700 text-sm font-semibold flex items-center gap-2 shadow-sm">
                  <FaCheckCircle />
                  Verified
                </span>
              </div>
            </div>
            
            {!editMode && (
              <button
                onClick={handleEditClick}
                className="md:self-start bg-slate-600 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 transform hover:scale-105"
              >
                <FaEdit /> Edit Profile
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Information */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-5 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <FaInfoCircle className="text-slate-600 text-xl" />
                Business Information
              </h3>
            </div>
            
            <div className="p-6">
              {editMode ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FaBuilding className="inline text-slate-600 mr-2" />
                        Business Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                        placeholder="Enter business name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FaUser className="inline text-slate-600 mr-2" />
                        Owner Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                        placeholder="Enter owner name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FaEnvelope className="inline text-slate-600 mr-2" />
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FaMobileAlt className="inline text-slate-600 mr-2" />
                        Mobile Number
                      </label>
                      <input
                        type="text"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleChange}
                        className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        <FaMapMarkerAlt className="inline text-slate-600 mr-2" />
                      Business Address
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows="4"
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition resize-none"
                      placeholder="Enter complete business address"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setEditMode(false)}
                      className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-8 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <FaBuilding className="text-gray-600 text-2xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-600 mb-2">Business Name</p>
                        <p className="text-xl font-bold text-gray-900">{vendor?.businessName || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <FaUser className="text-gray-600 text-2xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-600 mb-2">Owner Name</p>
                        <p className="text-xl font-bold text-gray-900">{vendor?.name || 'Not provided'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FaEnvelope className="text-gray-600 text-lg" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-600 mb-2">Email Address</p>
                          <p className="text-sm font-bold text-gray-900 truncate">{vendor?.email || 'Not provided'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                          <FaMobileAlt className="text-gray-600 text-lg" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-600 mb-2">Mobile Number</p>
                          <p className="text-sm font-bold text-gray-900">{vendor?.mobile || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-4 p-6 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <FaMapMarkerAlt className="text-gray-600 text-2xl" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-600 mb-2">Business Address</p>
                        <p className="text-base font-semibold text-gray-900 leading-relaxed">{vendor?.address || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information Sidebar */}
        <div className="space-y-6">
          {/* Security & Password */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-blue-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaShieldAlt className="text-blue-600" />
                Security Settings
              </h3>
            </div>
            <div className="p-6">
              {!showPasswordChange ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-white rounded-xl border border-blue-200">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md">
                      <FaLock className="text-white text-xl" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-900">Password Protection</p>
                      <p className="text-xs text-gray-600">Secure your account</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPasswordChange(true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <FaKey className="text-lg" />
                    Change Password
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaLock className="text-blue-600 text-xs" />
                      Current Password
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Enter current password"
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaKey className="text-blue-600 text-xs" />
                      New Password
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Min 6 characters"
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <FaCheckCircle className="text-blue-600 text-xs" />
                      Confirm Password
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Re-enter new password"
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      required
                    />
                  </div>
                  
                  {/* Error Message */}
                  {passwordError && (
                    <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaTimes className="text-white text-xs" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800">{passwordError}</p>
                      </div>
                    </div>
                  )}

                  {/* Success Message */}
                  {passwordSuccess && (
                    <div className="p-4 bg-green-50 border-2 border-green-300 rounded-xl flex items-start gap-3">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <FaCheckCircle className="text-white text-xs" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-green-800">{passwordSuccess}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2.5 pt-4 border-t border-gray-200">
                    <button
                      onClick={handlePasswordSave}
                      disabled={isChangingPassword}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <FaSave />
                          Update Password
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordChange(false);
                        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                        setPasswordError("");
                        setPasswordSuccess("");
                      }}
                      disabled={isChangingPassword}
                      className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 flex items-center justify-center gap-2 border-2 border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <FaTimes />
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-green-50 px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaShieldAlt className="text-green-600" />
                Account Status
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-white border-2 border-green-300 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center shadow-md">
                    <FaCheckCircle className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Status</p>
                    <p className="text-xs text-gray-600 font-semibold">Active</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-300 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center shadow-md">
                    <FaShieldAlt className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Account Type</p>
                    <p className="text-xs text-gray-600 font-semibold">Vendor</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-white border-2 border-blue-300 rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                    <FaCheckCircle className="text-white text-xl" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Verification</p>
                    <p className="text-xs text-gray-600 font-semibold">Verified</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Dates */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FaCalendarAlt className="text-slate-600" />
                Account Details
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-gray-100 border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaCalendarAlt className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-semibold">Member Since</p>
                  <p className="text-sm font-bold text-gray-900">
                    {vendor?.createdAt ? formatDate(vendor.createdAt) : 'N/A'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-gray-100 border-2 border-gray-300 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FaClock className="text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-semibold">Last Updated</p>
                  <p className="text-sm font-bold text-gray-900">
                    {vendor?.updatedAt ? formatDate(vendor.updatedAt) : 'N/A'}
                  </p>
                </div>
              </div>
              
               
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
