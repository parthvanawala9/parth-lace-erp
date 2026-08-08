import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "./layouts/MainLayout";

import Parties from "./Parties";
import Designs from "./Designs";
import Colours from "./Colours";
import Machines from "./Machines";
import Orders from "./Orders";
import OrdersList from "./OrdersList";
import ViewOrder from "./ViewOrder";
import ProductionPlanning from "./ProductionPlanning";
import ProductionDashboard from "./ProductionDashboard";
import Dispatch from "./Dispatch";
import DispatchSlip from "./DispatchSlip";
import PrintMachineProgram from "./PrintMachineProgram";
import PartyProgramLayout from "./PartyProgramLayout";

function Dashboard() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-slate-600">Welcome to Parth Lace ERP.</p>
    </div>
  );
}

function Reports() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Reports</h1>
      <p className="text-slate-600">Coming Soon...</p>
    </div>
  );
}

function Settings() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>
      <p className="text-slate-600">Coming Soon...</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/orders" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/parties" element={<Parties />} />

          <Route path="/designs" element={<Designs />} />

          <Route path="/colours" element={<Colours />} />

          <Route path="/machines" element={<Machines />} />

          <Route path="/orders" element={<OrdersList />} />

          <Route path="/orders/new" element={<Orders />} />

          <Route path="/orders/:id" element={<ViewOrder />} />

          <Route
            path="/production-planning"
            element={<ProductionPlanning />}
          />

          <Route
            path="/party-program-layout"
            element={<PartyProgramLayout />}
          />

          <Route
            path="/production-dashboard"
            element={<ProductionDashboard />}
          />

          <Route path="/dispatch" element={<Dispatch />} />

          {/* Existing dispatch slip route */}
          <Route
            path="/dispatch/slip/:id"
            element={<DispatchSlip />}
          />

          {/* Manual challan route used by Dispatch.tsx */}
          <Route
            path="/dispatch-slip"
            element={<DispatchSlip />}
          />

          <Route
            path="/print-machine-program"
            element={<PrintMachineProgram />}
          />

          <Route path="/reports" element={<Reports />} />

          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
