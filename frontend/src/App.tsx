import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import RecallDetail from "./pages/RecallDetail";
import Inventory from "./pages/Inventory";
import Integrations from "./pages/Integrations";
import ReportsEvidence from "./pages/ReportsEvidence";
import Settings from "./pages/Settings";
import ActiveRecalls from "./pages/ActiveRecalls";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:id" element={<RecallDetail />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/settings/integrations" element={<Integrations />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports/evidence" element={<ReportsEvidence />} />
        <Route path="/recalls" element={<ActiveRecalls />} />
        <Route path="/recalls/:id" element={<RecallDetail />} />
      </Routes>
    </BrowserRouter>
  );
}