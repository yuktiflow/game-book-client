import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Color palette - professional slate theme
const COLORS = [
  "#64748b", // slate-500
  "#475569", // slate-600
  "#334155", // slate-700
  "#1e293b", // slate-800
  "#0f172a", // slate-900
  "#94a3b8", // slate-400
  "#cbd5e1", // slate-300
];

// Custom tooltip styling
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
        <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
        {payload.map((entry, index) => {
          const entryName = entry.name || entry.dataKey || "";
          const isCountField = typeof entryName === "string" && 
            (entryName.toLowerCase().includes("count") || entryName.toLowerCase().includes("receipts"));
          
          return (
            <p key={index} className="text-xs text-slate-600">
              <span style={{ color: entry.color }}>{entryName}: </span>
              <span className="font-semibold">
                {isCountField
                  ? entry.value
                  : `₹${Math.round(entry.value).toLocaleString("en-IN")}`}
              </span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

// Monthly Trends Chart (Line + Bar)
export const MonthlyTrendsChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg animate-pulse">
        <p className="text-slate-500">Loading chart data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
        Monthly Income & Profit Trends
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={70}
          />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line
            type="monotone"
            dataKey="income"
            name="Income"
            stroke="#475569"
            strokeWidth={2}
            dot={{ fill: "#475569", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name="Profit"
            stroke="#64748b"
            strokeWidth={2}
            dot={{ fill: "#64748b", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Top Customers Chart (Bar)
export const TopCustomersChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg animate-pulse">
        <p className="text-slate-500">Loading chart data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
        Top 10 Customers by Income
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Bar dataKey="totalIncome" name="Total Income" fill="#475569" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// Income by Game Type Chart (Pie)
export const IncomeByGameTypeChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg animate-pulse">
        <p className="text-slate-500">Loading chart data...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Hide labels for slices < 5%

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-semibold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
        Income Distribution by Game Type
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="income"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(value, entry) => entry.payload.type}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// Payment Statistics Chart (Bar)
export const PaymentStatsChart = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg animate-pulse">
        <p className="text-slate-500">Loading chart data...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-80 bg-slate-50 rounded-lg">
        <p className="text-slate-500">No data available</p>
      </div>
    );
  }

  const chartData = [
    { name: "Total Income", value: data.totalIncome, fill: "#475569" },
    { name: "Payment Received", value: data.totalPayment, fill: "#64748b" },
    { name: "Pending Payment", value: data.totalPending, fill: "#94a3b8" },
  ];

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg border border-slate-200">
      <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">
        Payment Statistics
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" name="Amount" radius={[8, 8, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
