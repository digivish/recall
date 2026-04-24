import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { clearTokens } from "../lib/api";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [sumRes, incRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/dashboard/incidents"),
      ]);
      setSummary(sumRes.data);
      setIncidents(incRes.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

const sourceIcons: Record<string, string> = {
    FDA_FOOD: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    FDA_DRUG: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    FDA_DEVICE: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    CPSC: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/US-ConsumerProductSafetyComm-logo.svg/128px-US-ConsumerProductSafetyComm-logo.svg.png",
    HEALTH_CANADA: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Health_Canada.svg/128px-Health_Canada.svg.png",
  };
  const sourceLabels: Record<string, string> = {
    FDA_FOOD: "FDA Food",
    FDA_DRUG: "FDA Drug",
    FDA_DEVICE: "FDA Device",
    CPSC: "CPSC Alert",
    HEALTH_CANADA: "Health Canada",
  };
  const healthScore = summary?.health_score ?? 82;
  const velocityPct = summary?.compliance_velocity ?? 70;
  const auditPct = summary?.audit_prep ?? (summary?.docs_ready ?? 98);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-on-surface-variant">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={true} searchPlaceholder="Search SKUs..." />

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", active: true },
            { icon: "inventory_2", label: "Inventory", href: "/inventory" },
            { icon: "warning", label: "Active Recalls", href: "/recalls" },
            { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
            { icon: "hub", label: "Integrations", href: "/settings/integrations" },
            { icon: "settings", label: "Settings", href: "/settings" },
          ]}
        />

        <main className="ml-64 flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-2">
              <span>Risk Management</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
              <span className="text-primary">Main Risk Dashboard</span>
            </div>

            <div className="flex justify-between items-end mb-10">
              <div>
                <h1 className="font-headline text-4xl font-extrabold text-primary mb-2">
                  Compliance Pulse
                </h1>
                <p className="text-on-surface-variant max-w-lg">
                  System-wide monitoring of SKU integrity across federal databases.
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-semibold border-b-2 border-transparent hover:border-primary">
                  Export Ledger
                </button>
                <button className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg shadow-md hover:translate-y-[-1px]">
                  Generate Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              {[
                { label: "Total SKUs Monitored", value: summary?.total_skus || "—", icon: "inventory", color: "primary" },
                { label: "Active Recalls", value: summary?.active_recalls || "0", icon: "emergency_home", color: "error", badge: "URGENT" },
                { label: "Resolved (30d)", value: summary?.resolved || "0", icon: "check_circle", color: "tertiary" },
                { label: "Documentation Ready", value: summary?.docs_ready || "—", icon: "description", color: "secondary" },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-surface-container-lowest p-6 rounded-xl border-l-4 border-primary transition-all hover:shadow-md"
                  style={{ borderLeftColor: `var(--color-${card.color})` }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`material-symbols-outlined text-${card.color}`}>{card.icon}</span>
                    {card.badge && (
                      <span className="text-[10px] font-bold text-error-container bg-error-container px-2 py-0.5 rounded-full">
                        {card.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    {card.label}
                  </p>
                  <p className="text-3xl font-extrabold text-primary font-headline">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm">
              <div className="px-8 py-6 flex justify-between items-center bg-surface-container-low border-b border-outline-variant/10">
                <h2 className="font-headline text-xl font-bold text-primary">Flagged SKUs Registry</h2>
                <div className="flex gap-4">
                  <div className="flex bg-surface-container p-1 rounded-md">
                    <button className="px-3 py-1 text-xs font-bold bg-white shadow-sm rounded">
                      High Risk
                    </button>
                    <button className="px-3 py-1 text-xs font-medium text-on-surface-variant">
                      All Units
                    </button>
                  </div>
                  <button className="material-symbols-outlined text-on-surface-variant p-1.5 hover:bg-surface-container rounded-md">
                    filter_list
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-surface-container-low/50 text-[11px] uppercase tracking-widest text-on-surface-variant font-bold">
                      <th className="px-8 py-4">SKU / ASIN</th>
                      <th className="px-6 py-4">Product Identity</th>
                      <th className="px-6 py-4">Recall Source</th>
                      <th className="px-6 py-4">Severity</th>
                      <th className="px-6 py-4">Filing Deadline</th>
                      <th className="px-8 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {incidents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-on-surface-variant">
                          No active alerts. Your catalog is clear.
                        </td>
                      </tr>
                    ) : (
                      incidents.slice(0, 5).map((inc: any) => (
                        <tr key={inc.id} className="hover:bg-surface-container-low/30">
                          <td className="px-8 py-6">
                            <p className="font-bold text-primary">{inc.sku?.asin || "—"}</p>
                          </td>
                          <td className="px-6 py-6">
                            <p className="font-semibold text-primary">{inc.sku?.name || "—"}</p>
                          </td>
                          <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center p-1.5">
                                <img
                                  alt={inc.recall?.source_name}
                                  className="w-full h-full object-contain"
                                  src={sourceIcons[inc.recall?.source_name] || sourceIcons.FDA_FOOD}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">
                                {sourceLabels[inc.recall?.source_name] || inc.recall?.source_name || "—"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span
                              className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${
                                inc.severity === "CRITICAL"
                                  ? "bg-error-container text-on-error-container border-error/20"
                                  : inc.severity === "AMBER"
                                  ? "bg-primary-container text-on-primary-container border-primary/20"
                                  : "bg-surface-container-high text-on-surface-variant border-outline/20"
                              }`}
                            >
                              {inc.severity}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            <p className="text-xs font-bold text-on-surface">
                              {inc.created_at ? new Date(inc.created_at).toLocaleDateString() : "—"}
                            </p>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <Link
                              to={`/dashboard/${inc.id}`}
                              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded shadow-sm hover:shadow-lg hover:translate-y-[-1px] transition-all"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-primary-container text-white p-8 rounded-2xl relative overflow-hidden group">
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all" />
                <h3 className="font-headline text-lg font-bold mb-6">Network Health Score</h3>
                <div className="flex flex-col items-center justify-center py-4">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle className="text-white/10" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8" />
                      <circle className="text-tertiary-fixed-dim" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.4" strokeDashoffset={364.4 * (1 - healthScore / 100)} strokeWidth="12" />
                    </svg>
                    <span className="absolute text-3xl font-extrabold font-headline">{healthScore}</span>
                  </div>
                  <p className="mt-6 text-sm font-semibold opacity-80 uppercase tracking-widest text-center">
                    Stability Index: {healthScore >= 80 ? "Healthy" : healthScore >= 60 ? "Moderate" : "At Risk"}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between border border-outline-variant/10">
                  <div>
                    <span className="material-symbols-outlined text-primary mb-2">history</span>
                    <h4 className="font-bold text-primary">Compliance Velocity</h4>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Average time to resolution for active recalls is currently {Math.round((velocityPct / 100) * 30)} days.
                    </p>
                  </div>
                  <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full ${velocityPct >= 80 ? "bg-on-tertiary-container" : "bg-error"}`} style={{ width: `${velocityPct}%` }} />
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col justify-between border border-outline-variant/10">
                  <div>
                    <span className="material-symbols-outlined text-primary mb-2">fact_check</span>
                    <h4 className="font-bold text-primary">Audit Preparedness</h4>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Documentation coverage at {summary?.docs_ready ?? 98.2}% across all active fulfillment centers.
                    </p>
                  </div>
                  <div className="mt-4 h-1 w-full bg-surface-container rounded-full overflow-hidden">
                    <div className="bg-on-tertiary-container h-full" style={{ width: `${summary?.docs_ready ?? 98}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}