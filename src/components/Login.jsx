import React, { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";

const API_BASE_URI = import.meta.env.VITE_API_BASE_URL;

const Login = () => {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error(t('auth.enterUsername'));
      return;
    }
    if (!password.trim()) {
      toast.error(t('auth.enterPassword'));
      return;
    }

    try {
      localStorage.clear();

      // Send login request with identifier (username or mobile)
      const { data } = await axios.post(`${API_BASE_URI}/api/auth/login`, {
        identifier,
        password,
      });

      // Store token and role
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

      // Route based on user role
      if (data.user.role === "admin") {
        toast.success(t('auth.loginSuccess'));
        navigate("/admin", { replace: true });
      } else if (data.user.role === "vendor") {
        // For vendors, fetch full profile
        try {
          const profileRes = await axios.get(`${API_BASE_URI}/api/vendors/me`, {
            headers: { Authorization: `Bearer ${data.token}` },
          });

          localStorage.setItem("vendorId", profileRes.data.vendor.id);
          localStorage.setItem(
            "vendorProfile",
            JSON.stringify(profileRes.data.vendor)
          );

          toast.success(t('auth.loginSuccess'));
          navigate("/vendor", { replace: true });
        } catch (err) {
          console.error("Failed to fetch vendor profile:", err.response?.data || err.message);
          localStorage.clear();
          toast.error(t('auth.loginError'));
        }
      }
    } catch (err) {
      // Log the full error for debugging
      console.error("Login failed:", err.response || err);

      // Get the error message from the server's response, if it exists
      const message = err.response?.data?.message || err.message;

      // Show a more informative toast notification
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 px-4 py-8">
      {/* Language Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageToggle variant="compact" />
      </div>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center gap-8 lg:gap-12">

        {/* Left side - Branding */}
        <div className="flex-1 w-full lg:w-auto text-center lg:text-left">
          <div className="space-y-6">
            {/* Logo/Icon */}
            <div className="flex justify-center lg:justify-start">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>

            {/* Title */}
            <div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-800 mb-4">
                {t('app.name')}
              </h1>
              <p className="text-lg lg:text-xl text-slate-600 max-w-md mx-auto lg:mx-0">
                {t('app.tagline')}
              </p>
            </div>

            {/* Features */}
            <div className="hidden lg:flex flex-col gap-4 pt-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">{t('auth.features.receiptManagement')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">{t('auth.features.analytics')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-slate-700 font-medium">{t('auth.features.secure')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-auto lg:flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 sm:p-10 lg:p-12 w-full lg:w-[480px]">
            {/* Form Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                {t('auth.welcomeBack')}
              </h2>
              <p className="text-slate-500">
                {t('auth.signInMessage')}
              </p>
            </div>

            {/* Form */}
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Username/Mobile Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  {t('auth.usernameOrMobile')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t('auth.usernamePlaceholder')}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={t('auth.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-4 bg-gradient-to-br from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 mt-6"
              >
                {t('auth.signIn')}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('auth.securityMessage')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
