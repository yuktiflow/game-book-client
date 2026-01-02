import React from "react";
import { FaBars, FaBuilding } from "react-icons/fa";

const MobileHeader = ({ vendor, onToggleMobileMenu }) => {
  return (
    <header className="md:hidden bg-gradient-to-r from-slate-700 to-slate-800 shadow-lg p-4 flex justify-between items-center border-b border-slate-900">
      <button
        onClick={onToggleMobileMenu}
        className="p-2 rounded-lg hover:bg-slate-900 text-white transition-colors"
      >
        <FaBars className="text-xl" />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md">
          <FaBuilding className="text-slate-700" />
        </div>
        <h2 className="font-bold text-white truncate max-w-[180px]">
          {vendor?.businessName || "Vendor Dashboard"}
        </h2>
      </div>
      <div className="w-10"></div> {/* Spacer for centering */}
    </header>
  );
};

export default MobileHeader;
