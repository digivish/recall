import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api, { clearTokens } from "../lib/api";

export default function RecallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [autoPause, setAutoPause] = useState(true);

  useEffect(() => {
    loadIncident();
  }, [id]);

  const loadIncident = async () => {
    try {
      const res = await api.get(`/dashboard/${id}`);
      setIncident(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async () => {
    try {
      await api.post(`/dashboard/${id}/acknowledge`);
      loadIncident();
    } catch (e) {
      console.error(e);
    }
  };

  const handleResolve = async () => {
    try {
      await api.post(`/dashboard/${id}/resolve`);
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

  if (loading || !incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-on-surface-variant">Loading...</span>
      </div>
    );
  }

  const sourceIcons: Record<string, string> = {
    FDA_FOOD: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    FDA_DRUG: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    FDA_DEVICE: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/128px-US-FoodAndDrugAdmin-logo.svg.png",
    CPSC: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/US-ConsumerProductSafetyComm-logo.svg/128px-US-ConsumerProductSafetyComm-logo.svg.png",
    HEALTH_CANADA: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Health_Canada.svg/128px-Health_Canada.svg.png",
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-900 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={handleLogout} className="text-slate-500 hover:text-slate-900">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="h-screen w-64 fixed left-0 top-[57px] overflow-y-auto bg-slate-50 border-r border-slate-200/50 p-4 z-30">
          <div className="mb-6 px-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-sm">
                AL
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 leading-tight">Your Company</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Risk Management</p>
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-1">
            {[
              { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
              { icon: "inventory_2", label: "Inventory", href: "/inventory" },
              { icon: "warning", label: "Alerts", href: "/alerts", badge: true },
              { icon: "hub", label: "Integrations", href: "/settings/integrations" },
              { icon: "settings", label: "Settings", href: "/settings" },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
                  item.href === "/dashboard" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:bg-slate-200/50"
                }`}
              >
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-error text-white text-[10px] px-1.5 py-0.5 rounded-full">3</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="ml-64 flex-1">
          <div className="px-8 pt-8 pb-6 bg-white border-b border-slate-200/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold tracking-[0.2em] text-on-surface-variant uppercase">
                    Case ID: {incident.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      incident.severity === "CRITICAL"
                        ? "bg-error-container text-on-error-container"
                        : incident.severity === "AMBER"
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {incident.severity}
                  </span>
                </div>
                <h1 className="text-3xl font-extrabold text-primary -tracking-tight">
                  {incident.recall.title}
                </h1>
                <p className="text-on-surface-variant mt-1 font-medium">
                  Source: {incident.recall.source_name}
                </p>
              </div>
              <div className="flex gap-3">
                <button className="px-6 py-2.5 text-sm font-bold text-primary border-b-2 border-primary hover:bg-surface-container-high transition-colors">
                  Export Notice
                </button>
                <button
                  onClick={handleAcknowledge}
                  disabled={incident.status === "ACKNOWLEDGED" || incident.status === "RESOLVED"}
                  className="px-6 py-2.5 text-sm font-bold bg-gradient-to-r from-primary to-primary-container text-white rounded-md shadow-md disabled:opacity-50"
                >
                  {incident.status === "ACKNOWLEDGED" || incident.status === "RESOLVED"
                    ? "Acknowledged"
                    : "Acknowledge Receipt"}
                </button>
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border-l-4 border-primary">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-primary">description</span>
                    <h2 className="text-xl font-bold tracking-tight text-primary">Official Recall Notice</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-12 mb-8">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Issue Date</p>
                      <p className="text-sm font-semibold text-on-surface">
                        {incident.recall.published_at ? new Date(incident.recall.published_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Recall Class</p>
                      <p className="text-sm font-bold text-error">{incident.severity}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">SKU / ASIN</p>
                      <p className="text-sm font-semibold text-on-surface">{incident.sku.asin}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Product Name</p>
                      <p className="text-sm font-semibold text-on-surface">{incident.sku.name}</p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-tight mb-2">Reason for Recall</h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant">
                        {incident.recall.hazard_description || "No description available."}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary uppercase tracking-tight mb-2">Recommendation</h3>
                      <ul className="list-disc list-inside text-sm space-y-2 text-on-surface-variant">
                        {incident.recall.recommended_action
                          ? incident.recall.recommended_action.split("\n").map((line: string, i: number) => (
                              <li key={i}>{line}</li>
                            ))
                          : ["Contact affected customers immediately.", "Quarantine affected inventory."].map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <section className="bg-white/70 backdrop-blur-xl p-8 rounded-xl border border-white/40 shadow-sm sticky top-[100px]">
                  <div className="flex items-center gap-3 mb-8">
                    <span className="material-symbols-outlined text-primary">task_alt</span>
                    <h2 className="text-xl font-bold tracking-tight text-primary">Recommended Actions</h2>
                  </div>

                  <div className="flex items-start justify-between p-4 rounded-lg bg-surface-container-lowest border-b-2 border-primary mb-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white">
                        <span className="material-symbols-outlined">pause_circle</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface leading-none mb-1">Auto-pause Listings</p>
                        <p className="text-xs text-on-surface-variant font-medium">Prevent further sales instantly</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={autoPause}
                        onChange={(e) => setAutoPause(e.target.checked)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  <div className="p-4 rounded-lg bg-surface-container-lowest border-b-2 border-slate-200 mb-4">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined">search_check</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-on-surface leading-none mb-1">Identify Affected Batches</p>
                          <span className="text-[10px] font-bold text-error uppercase tracking-tighter">Required</span>
                        </div>
                        <p className="text-xs text-on-surface-variant font-medium">Cross-reference with inventory</p>
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="bg-primary w-[65%] h-full"></div>
                          </div>
                          <span className="text-[10px] font-bold text-primary">65%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-surface-container-lowest border-b-2 border-slate-200 mb-8">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined">analytics</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface leading-none mb-1">Generate Insurance Audit Log</p>
                        <p className="text-xs text-on-surface-variant font-medium">Export encrypted compliance proof</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary-container rounded-xl p-6 text-white overflow-hidden relative">
                    <div className="relative z-10">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-primary-container mb-4">Compliance Status Score</p>
                      <div className="flex items-center gap-6">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle className="text-white/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8" />
                            <circle className="text-tertiary-fixed" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="62.8" strokeWidth="8" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black">75</span>
                            <span className="text-[8px] font-bold uppercase">Safe</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium leading-relaxed text-on-primary-container">
                            System has isolated <span className="text-white font-bold">14/20</span> active risks associated with this notice.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                  </div>
                </section>

                <button
                  onClick={handleResolve}
                  disabled={incident.status === "RESOLVED"}
                  className="w-full bg-primary text-white text-sm font-bold px-4 py-3 rounded-lg shadow-md hover:shadow-lg hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {incident.status === "RESOLVED" ? "Resolved" : "Mark as Resolved"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}