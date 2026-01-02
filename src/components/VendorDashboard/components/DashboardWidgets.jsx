import React from "react";
import { FaReceipt, FaUser, FaClipboardList } from "react-icons/fa";
import { formatCurrency, formatDate } from "../utils/formatters";

const RecentReceipts = ({ receipts, onViewAll }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shadow-sm">
          <FaReceipt className="text-slate-600 text-lg" />
        </div>
        Recent Receipts
      </h3>
      {receipts.length > 0 ? (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <div
              key={receipt._id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:from-slate-50 hover:to-white border border-gray-100 hover:border-slate-200 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="bg-slate-100 p-3 rounded-xl shadow-sm">
                  <FaReceipt className="text-slate-600 text-lg" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{receipt.customerName}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatDate(receipt.date)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-800 text-lg">{formatCurrency(receipt.totalIncome)}</p>
                <p className="text-xs text-gray-500 mt-1">Income</p>
              </div>
            </div>
          ))}
          <button
            onClick={onViewAll}
            className="w-full mt-4 text-slate-600 hover:text-slate-700 font-semibold text-sm py-3 hover:bg-slate-50 rounded-xl transition-all border border-slate-200 hover:border-slate-400"
          >
            View All Receipts →
          </button>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaReceipt className="text-4xl text-gray-300" />
          </div>
          <p className="font-semibold text-lg">No receipts yet</p>
          <p className="text-sm mt-2 text-gray-400">Create your first receipt to get started</p>
        </div>
      )}
    </div>
  );
};

const TopCustomers = ({ customers, onViewAll }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shadow-sm">
          <FaUser className="text-green-600 text-lg" />
        </div>
        Top Customers by Balance
      </h3>
      {customers.length > 0 ? (
        <div className="space-y-3">
          {customers.map((customer, index) => (
            <div
              key={customer._id || index}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl hover:from-green-50 hover:to-white border border-gray-100 hover:border-green-200 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-green-100 to-green-200 w-12 h-12 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="font-bold text-green-700 text-lg">{index + 1}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{customer.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {customer.receiptsCount || 0} receipts
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-bold text-lg ${customer.latestBalance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(Math.abs(customer.latestBalance))}
                </p>
                <p className={`text-xs font-medium ${customer.latestBalance > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {customer.latestBalance > 0 ? 'Credit' : 'Debit'}
                </p>
              </div>
            </div>
          ))}
          <button
            onClick={onViewAll}
            className="w-full mt-4 text-green-600 hover:text-green-700 font-semibold text-sm py-3 hover:bg-green-50 rounded-xl transition-all border border-green-200 hover:border-green-400"
          >
            View All Customers →
          </button>
        </div>
      ) : (
        <div className="text-center py-16 text-gray-500">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaUser className="text-4xl text-gray-300" />
          </div>
          <p className="font-semibold text-lg">No customer data yet</p>
          <p className="text-sm mt-2 text-gray-400">Add customers to see insights</p>
        </div>
      )}
    </div>
  );
};

const RecentActivities = ({ activities, getActivityIcon }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shadow-sm">
          <FaClipboardList className="text-indigo-600 text-lg" />
        </div>
        Recent Activities
      </h3>
      <div className="space-y-3">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div 
              key={activity._id} 
              className="flex items-start gap-4 p-4 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-white rounded-xl transition-all border border-transparent hover:border-indigo-200 duration-300"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800">{activity.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaClipboardList className="text-4xl text-gray-300" />
            </div>
            <p className="font-semibold text-lg">No recent activities</p>
            <p className="text-sm mt-2 text-gray-400">Your activity will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

export { RecentReceipts, TopCustomers, RecentActivities };
