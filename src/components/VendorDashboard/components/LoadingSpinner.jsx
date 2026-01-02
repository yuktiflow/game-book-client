import React from "react";

const LoadingSpinner = ({ message = "Loading...", fullScreen = true }) => {
  const containerClasses = fullScreen
    ? "flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100"
    : "flex items-center justify-center p-8";

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Modern Pulsing Dots Loader */}
        <div className="flex justify-center items-center gap-3 mb-6">
          <div
            className="w-4 h-4 bg-slate-600 rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          ></div>
          <div
            className="w-4 h-4 bg-slate-500 rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          ></div>
          <div
            className="w-4 h-4 bg-slate-400 rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          ></div>
        </div>
        <p className="text-gray-700 font-semibold text-lg animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
