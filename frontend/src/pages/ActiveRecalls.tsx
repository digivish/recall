import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../lib/api";

const sourceIcons: Record<string, string> = {
  FDA_FOOD: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/64px/US-FoodAndDrugAdmin-logo.svg.png",
  FDA_DRUG: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/64px/US-FoodAndDrugAdmin-logo.svg.png",
  FDA_DEVICE: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/US-FoodAndDrugAdmin-logo.svg/64px/US-FoodAndDrugAdmin-logo.svg.png",
  CPSC: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/US-ConsumerProductSafetyComm-logo.svg/64px/US-ConsumerProductSafetyComm-logo.svg.png",
  HEALTH_CANADA: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Health_Canada.svg/64px/Health_Canada.svg.png",
};

export default function ActiveRecalls() {
  const [recalls, setRecalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    agency: "All Agencies",
    category: "All Categories",
    status: "Active & Ongoing",
    search: "",
  });
  const [page, setPage] = useState(1);
  const limit = 15;

  useEffect(() => {
    loadRecalls();
  }, []);

  const loadRecalls = async () => {
    try {
      const res = await api.get("/recalls", { params: { limit: 100 } });
      setRecalls(res.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecalls = recalls.filter((r: any) => {
    if (filters.agency !== "All Agencies") {
      const agencyMap: Record<string, string[]> = {
        FDA: ["FDA_FOOD", "FDA_DRUG", "FDA_DEVICE"],
        CPSC: ["CPSC"],
        "Health Canada": ["HEALTH_CANADA"],
      };
      if (!agencyMap[filters.agency]?.includes(r.source_name)) return false;
    }
    if (filters.search && !r.product_name?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

  const total = filteredRecalls.length;
  const totalPages = Math.ceil(total / limit);

  const agencyStats = {
    FDA: recalls.filter((r) => r.source_name?.startsWith("FDA")).length,
    CPSC: recalls.filter((r) => r.source_name === "CPSC").length,
    "Health Canada": recalls.filter((r) => r.source_name === "HEALTH_CANADA").length,
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={true} searchPlaceholder="Quick search recalls..." />

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "inventory_2", label: "Inventory", href: "/inventory" },
            { icon: "warning", label: "Active Recalls", active: true },
            { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
            { icon: "hub", label: "Integrations", href: "/settings/integrations" },
            { icon: "settings", label: "Settings", href: "/settings" },
          ]}
        />

        <main className="flex-1 min-h-screen bg-surface ml-64 pt-[57px]">
          <section className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tighter text-primary">
                  Active Recalls Feed
                </h2>
                <p className="text-on-surface-variant font-medium mt-1">
                  Real-time regulatory intelligence streams.
                </p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center px-4 py-2 bg-primary text-on-primary rounded-lg font-semibold shadow-lg hover:opacity-90 transition-all">
                  <span className="material-symbols-outlined text-sm mr-2">file_download</span>
                  Export Report
                </button>
              </div>
            </div>

            <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-sm text-primary">filter_list</span>
                <span className="text-xs font-bold tracking-widest uppercase text-primary">
                  Filter Repository
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                    Agency
                  </label>
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-4 py-2.5 focus:ring-1 focus:ring-primary shadow-sm"
                    value={filters.agency}
                    onChange={(e) => setFilters({ ...filters, agency: e.target.value })}
                  >
                    <option>All Agencies</option>
                    <option>FDA</option>
                    <option>CPSC</option>
                    <option>Health Canada</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                    Category
                  </label>
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-4 py-2.5 focus:ring-1 focus:ring-primary shadow-sm"
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  >
                    <option>All Categories</option>
                    <option>Food & Beverage</option>
                    <option>Consumer Goods</option>
                    <option>Electronics</option>
                    <option>Medical Devices</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                    Status
                  </label>
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-4 py-2.5 focus:ring-1 focus:ring-primary shadow-sm"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  >
                    <option>Active & Ongoing</option>
                    <option>New Notices</option>
                    <option>Archived</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-on-surface-variant uppercase ml-1">
                    Date Range
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-surface-container-lowest border-none rounded-lg text-sm px-4 py-2.5 focus:ring-1 focus:ring-primary shadow-sm"
                      placeholder="Last 30 Days"
                      type="text"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-on-surface-variant pointer-events-none">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low border-b border-outline-variant/10">
                  <tr>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                      Date Published
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                      Source Agency
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                      Product Details
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-primary">
                      Risk Rating
                    </th>
                    <th className="px-6 py-4 text-[11px] font-extrabold uppercase tracking-widest text-primary text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        Loading...
                      </td>
                    </tr>
                  ) : filteredRecalls.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                        No recalls found.
                      </td>
                    </tr>
                  ) : (
                    filteredRecalls.slice((page - 1) * limit, page * limit).map((recall: any) => (
                      <tr key={recall.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-5 align-top">
                          <span className="text-sm font-semibold text-primary">
                            {recall.published_date
                              ? new Date(recall.published_date).toLocaleDateString()
                              : "—"}
                          </span>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-surface-container-highest rounded flex items-center justify-center">
                              <span className="text-[10px] font-black text-primary">
                                {recall.source_name?.slice(0, 3) || "REC"}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant">
                              {recall.source_name === "FDA_FOOD" || recall.source_name === "FDA_DRUG" || recall.source_name === "FDA_DEVICE"
                                ? "U.S. FDA"
                                : recall.source_name === "CPSC"
                                ? "U.S. CPSC"
                                : recall.source_name === "HEALTH_CANADA"
                                ? "Health Canada"
                                : recall.source_name || "Recall"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <div>
                            <h4 className="text-sm font-bold text-primary leading-tight">
                              {recall.product_name || "Unknown Product"}
                            </h4>
                            <p className="text-xs text-on-surface-variant mt-1 max-w-md">
                              {recall.hazard_description?.slice(0, 100) || "No description"}
                            </p>
                            <div className="mt-2 flex gap-2">
                              <span className="px-2 py-0.5 bg-surface-container-high rounded text-[10px] font-bold text-on-surface-variant">
                                {recall.category || "General"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 align-top">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              recall.severity === "CRITICAL"
                                ? "bg-error-container text-on-error-container"
                                : recall.severity === "HIGH"
                                ? "bg-error-container text-on-error-container"
                                : recall.severity === "MEDIUM"
                                ? "bg-secondary-container text-on-secondary-container"
                                : "bg-tertiary-fixed text-on-tertiary-fixed-variant"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                recall.severity === "CRITICAL" || recall.severity === "HIGH"
                                  ? "bg-error"
                                  : recall.severity === "MEDIUM"
                                  ? "bg-secondary"
                                  : "bg-on-tertiary-container"
                              }`}
                            />
                            {recall.severity || "LOW"}
                          </span>
                        </td>
                        <td className="px-6 py-5 align-top text-right">
                          <a
                            className="text-primary text-xs font-bold underline underline-offset-4 hover:text-on-primary-container transition-colors inline-flex items-center"
                            href={recall.source_url || "#"}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Original
                            <span className="material-symbols-outlined text-sm ml-1">
                              open_in_new
                            </span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="px-6 py-4 bg-surface-container-low flex items-center justify-between">
                <span className="text-xs text-on-surface-variant font-medium">
                  Showing {Math.min((page - 1) * limit + 1, total)}-{Math.min(page * limit, total)} of {total} notices
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded ${
                        page === i + 1
                          ? "bg-primary text-on-primary"
                          : "text-primary hover:bg-surface-container-high"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  {totalPages > 3 && (
                    <>
                      <span className="text-xs text-primary">...</span>
                      <button
                        onClick={() => setPage(totalPages)}
                        className="w-8 h-8 flex items-center justify-center text-xs font-bold text-primary hover:bg-surface-container-high rounded"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-surface-container-low rounded-xl p-6 relative overflow-hidden h-64 flex flex-col justify-end">
                <div className="absolute inset-0 z-0 opacity-20">
                  <div className="w-full h-full bg-gradient-to-t from-primary/10 to-transparent" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-primary tracking-tight">
                    Geographic Clusters
                  </h3>
                  <p className="text-on-surface-variant text-sm font-medium">
                    {agencyStats.FDA + agencyStats.CPSC + agencyStats["Health Canada"]} active recalls across regulatory agencies.
                  </p>
                </div>
              </div>
              <div className="bg-surface-container-highest/30 backdrop-blur-md rounded-xl p-6 border border-outline-variant/10">
                <h3 className="text-sm font-extrabold uppercase tracking-widest text-primary mb-6">
                  Volume by Agency
                </h3>
                <div className="space-y-4">
                  {Object.entries(agencyStats).map(([agency, count]) => (
                    <div key={agency} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                        <span>{agency}</span>
                        <span>{total > 0 ? Math.round((count / total) * 100) : 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}