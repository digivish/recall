import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../lib/api";

export default function ReportsEvidence() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [proofItems, setProofItems] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 Days");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, proofRes, reportsRes] = await Promise.all([
        api.get("/reports/stats"),
        api.get("/reports/proof-of-action"),
        api.get("/reports"),
      ]);
      setStats(statsRes.data);
      setProofItems(proofRes.data.items || []);
      setReports(reportsRes.data.reports || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await api.post("/reports", {
        date_range: dateRange,
      });
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleExportProof = async () => {
    try {
      const res = await api.get("/reports/export/proof-of-action");
      // Open in new window for printing/saving
      const blob = new Blob([res.data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportEvidence = async () => {
    try {
      const res = await api.get("/reports/export/evidence");
      const blob = new Blob([res.data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  const complianceHealth = stats?.compliance_health || 0;
  const exposureGauge = stats?.exposure_gauge || 100;

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={true} searchPlaceholder="Search evidence logs..." />

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "inventory_2", label: "Inventory", href: "/inventory" },
            { icon: "warning", label: "Active Recalls", href: "/recalls" },
            { icon: "assessment", label: "Risk Reports", active: true },
            { icon: "hub", label: "Integrations", href: "/settings/integrations" },
            { icon: "settings", label: "Settings", href: "/settings" },
          ]}
        />

        <main className="flex-1 min-h-screen bg-surface ml-64 pt-[57px]">
          <div className="p-8 max-w-screen-2xl mx-auto space-y-8">
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
              <div className="lg:col-span-8">
                <h1 className="text-4xl font-extrabold tracking-tight text-primary mb-2">
                  Compliance & Insurance Evidence
                </h1>
                <p className="text-lg text-on-surface-variant max-w-2xl leading-relaxed">
                  Audit-ready documentation for insurance claims and account health
                  appeals. Maintain a cryptographic ledger of all risk mitigation steps.
                </p>
              </div>
              <div className="lg:col-span-4 flex justify-start lg:justify-end">
                <div className="bg-primary-container text-on-primary-container p-6 rounded-xl shadow-lg flex items-center gap-4 w-full lg:w-auto">
                  <div className="w-12 h-12 bg-on-tertiary-container/20 rounded-full flex items-center justify-center text-on-tertiary-container">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                      Compliance Health
                    </p>
                    <p className="text-2xl font-black">
                      {complianceHealth}% Audit-Ready
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              <div className="md:col-span-2 lg:col-span-2 bg-surface-container-lowest p-8 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary">add_chart</span>
                    <h3 className="font-bold text-lg">Generate New Compliance Report</h3>
                  </div>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Aggregate SKU-level evidence and timestamps into a verified PDF dossier for
                    insurers.
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-on-surface-variant">
                          Date Range
                        </label>
                        <div className="relative">
                          <select
                            className="w-full bg-surface-container-high border-none rounded p-3 text-sm focus:ring-0"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                          >
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                            <option>Last 90 Days</option>
                            <option>Year to Date</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-3 text-sm text-outline">
                            calendar_today
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-on-surface-variant">
                          Entity Context
                        </label>
                        <input
                          className="w-full bg-surface-container-high border-none rounded p-3 text-sm focus:ring-0"
                          placeholder="SKU or Vendor ID"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="mt-8 w-full bg-primary text-on-primary py-4 rounded font-bold hover:bg-primary-container transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">history_edu</span>
                  {generating ? "Generating..." : "Compile Comprehensive Evidence"}
                </button>
              </div>

              <div className="bg-surface-container-lowest p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at center, #051125 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant mb-4 self-start">
                  Exposure Gauge
                </h3>
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      className="text-surface-variant"
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="8"
                    />
                    <circle
                      className="text-on-tertiary-container"
                      cx="80"
                      cy="80"
                      fill="transparent"
                      r="70"
                      stroke="currentColor"
                      strokeDasharray="440"
                      strokeDashoffset={440 * (1 - exposureGauge / 100)}
                      strokeWidth="12"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-black text-primary">{exposureGauge}</span>
                    <span className="text-[10px] font-bold text-on-tertiary-container uppercase tracking-tighter">
                      {exposureGauge >= 70 ? "Low Risk" : exposureGauge >= 40 ? "Medium" : "High"}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-center text-on-surface-variant mt-4 font-medium italic">
                  Current documentation covers {complianceHealth}% of open cases.
                </p>
              </div>

              <div className="bg-surface-container-lowest p-8 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-on-surface-variant">
                    Archival Snapshot
                  </h3>
                  <div className="space-y-3">
                    {reports.slice(0, 3).map((report: any) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 bg-surface-container-low rounded border-l-4 border-on-tertiary-container"
                      >
                        <span className="text-xs font-bold">{report.title}</span>
                        <span className="material-symbols-outlined text-sm">download</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="text-primary text-xs font-black uppercase tracking-widest hover:underline mt-4 text-left">
                  View All Archives
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">
                    shield_person
                  </span>
                  Export Center: Proof of Action
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={handleExportProof}
                    className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                  >
                    Export Proof of Action
                  </button>
                  <button
                    onClick={handleExportEvidence}
                    className="bg-secondary-container text-on-secondary-container px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90"
                  >
                    Export Evidence
                  </button>
                </div>
              </div>
              <div className="bg-surface-container-lowest shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant/10">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        SKU Identity
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Recall Source
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Action Taken
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                        Timestamp
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-right">
                        Verification
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center">
                          Loading...
                        </td>
                      </tr>
                    ) : proofItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                          No proof of action records found.
                        </td>
                      </tr>
                    ) : (
                      proofItems.map((item: any) => (
                        <tr
                          key={item.id}
                          className="hover:bg-surface-container-low/50 transition-colors"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400">
                                  image
                                </span>
                              </div>
                              <div>
                                <p className="font-bold text-sm leading-none">
                                  {item.sku?.asin || "—"}
                                </p>
                                <p className="text-[10px] text-on-surface-variant mt-1">
                                  {item.sku?.name || "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className="flex items-center gap-2 text-xs font-medium text-primary">
                              <span className="material-symbols-outlined text-sm">gavel</span>
                              {item.recall?.source_name || "Recall"}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <span
                              className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                                item.action_taken === "Recall Processed"
                                  ? "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                                  : item.action_taken === "Listing Paused"
                                  ? "bg-secondary-fixed text-on-secondary-fixed-variant"
                                  : "bg-surface-container-high text-on-surface-variant"
                              }`}
                            >
                              {item.action_taken}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <p className="text-xs font-medium">
                              {item.timestamp
                                ? new Date(item.timestamp).toLocaleDateString()
                                : "—"}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              {item.timestamp
                                ? new Date(item.timestamp).toLocaleTimeString()
                                : ""}
                            </p>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <button className="bg-primary text-on-primary text-[10px] font-bold px-4 py-2 rounded hover:opacity-90 transition-opacity uppercase tracking-tight flex items-center gap-2 ml-auto">
                              <span className="material-symbols-outlined text-sm">
                                download
                              </span>
                              Download PDF
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-black tracking-tight">
                  Compliance Archives
                </h2>
                <div className="flex gap-2">
                  <button className="text-xs font-bold px-3 py-1 bg-surface-container-high rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">filter_alt</span>{" "}
                    Filter
                  </button>
                  <button className="text-xs font-bold px-3 py-1 bg-surface-container-high rounded flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">sort</span> Date
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report: any) => (
                  <div
                    key={report.id}
                    className="bg-white p-6 shadow-sm border-t-2 border-primary group hover:bg-surface-container-low transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-primary-container/10 p-2 rounded">
                        <span className="material-symbols-outlined text-primary">
                          folder_zip
                        </span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-on-surface-variant bg-surface-container-high px-2 py-1">
                        {report.type}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm mb-1">{report.title}</h4>
                    <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                      {report.incident_count} incidents, {report.resolved_count} resolved
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        Last Modified: {report.last_modified}
                      </span>
                      <button className="text-primary hover:underline text-xs font-bold flex items-center gap-1">
                        Open Vault{" "}
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}