import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../lib/api";

const sourceIcons: Record<string, string> = {
  AMAZON_SP_API: "shopping_bag",
  SHOPIFY: "storefront",
};

export default function Inventory() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingShopify, setSyncingShopify] = useState(false);
  const [source, setSource] = useState("All Platforms");
  const [status, setStatus] = useState("All Statuses");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 15;

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    loadItems();
  }, [source, status, search, page]);

  const loadStats = async () => {
    try {
      const res = await api.get("/inventory/stats");
      setStats(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (source && source !== "All Platforms") params.append("source", source);
      if (status && status !== "All Statuses") params.append("status", status);
      if (search) params.append("search", search);
      params.append("limit", String(limit));
      params.append("offset", String((page - 1) * limit));

      const res = await api.get(`/inventory?${params}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // Sync from integrations
      const res = await api.post("/integrations/shopify/sync");
      alert(`Synced ${res.data.synced} products`);
      loadStats();
      loadItems();
    } catch (e: any) {
      alert("Sync failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={true} searchPlaceholder="Search SKU, ASIN, brand..." />

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "inventory_2", label: "Inventory", active: true },
            { icon: "warning", label: "Active Recalls", href: "/recalls" },
            { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
            { icon: "hub", label: "Integrations", href: "/settings/integrations" },
            { icon: "settings", label: "Settings", href: "/settings" },
          ]}
        />

        <main className="flex-1 min-h-screen bg-surface ml-64 pt-[57px]">
          <div className="p-8 space-y-8 max-w-7xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-black text-primary tracking-tighter">
                  Inventory Catalog
                </h1>
                <p className="text-on-surface-variant text-sm font-medium">
                  {total} products tracked across platforms
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  className="bg-surface-container-lowest border border-outline-variant px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-surface-container-high transition-all"
                >
                  <span className="material-symbols-outlined text-sm">download</span>
                  Export
                </button>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
                >
                  <span className={`material-symbols-outlined text-sm ${syncing ? "animate-spin" : ""}`}>
                    {syncing ? "progress_activity" : "sync"}
                  </span>
                  {syncing ? "Syncing..." : "Sync Now"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete all SKUs? This cannot be undone.")) return;
                    try {
                      await api.delete("/debug/skus");
                      loadStats();
                      loadItems();
                      alert("All SKUs deleted");
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  className="bg-error-container text-error px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:opacity-90 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">delete_forever</span>
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_0_24px_rgba(5,17,37,0.04)] relative overflow-hidden">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">Total Managed SKUs</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-primary tracking-tighter">
                    {stats?.total_skus || 0}
                  </span>
                  <span className="text-xs font-bold text-on-tertiary-container">+12% vs last month</span>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_0_24px_rgba(5,17,37,0.04)] flex flex-col justify-between">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-4">Source Breakdown</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-semibold">Amazon</span>
                    </div>
                    <span className="text-sm font-bold">
                      {stats?.amazon_skus || 0}{" "}
                      <span className="text-[10px] text-on-surface-variant font-normal">SKUs</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${stats ? (stats.amazon_skus / Math.max(stats.total_skus, 1)) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-tertiary" />
                      <span className="text-sm font-semibold">Shopify</span>
                    </div>
                    <span className="text-sm font-bold">
                      {stats?.shopify_skus || 0}{" "}
                      <span className="text-[10px] text-on-surface-variant font-normal">SKUs</span>
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-tertiary rounded-full transition-all duration-700"
                      style={{ width: `${stats ? (stats.shopify_skus / Math.max(stats.total_skus, 1)) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-6 rounded-xl shadow-[0_0_24px_rgba(5,17,37,0.04)] flex flex-col justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-error" />
                    <span className="text-sm font-semibold">Flagged Products</span>
                  </div>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <span className="text-3xl font-extrabold text-error">{stats?.flagged_count || 0}</span>
                  <span className="text-sm font-medium text-on-surface-variant">
                    {stats?.health_score || 100}% health score
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
                  search
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, ASIN, brand..."
                  className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant focus:border-primary focus:outline-none text-sm"
                />
              </div>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="px-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant focus:outline-none text-sm"
              >
                <option>All Platforms</option>
                <option>Amazon FBA</option>
                <option>Shopify Plus</option>
              </select>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-3 bg-surface-container-lowest rounded-lg border border-outline-variant focus:outline-none text-sm"
              >
                <option>All Statuses</option>
                <option>Safe</option>
                <option>Flagged</option>
                <option>Monitoring</option>
              </select>
            </div>

            <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline-variant">
                    <th className="text-left px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Product</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">ASIN</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Brand</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Source</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Last Sync</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
                        <p className="mt-2">Loading...</p>
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl">inventory_2</span>
                        <p className="mt-2">No SKUs found</p>
                        <p className="text-xs">Connect an integration to import your catalog</p>
                      </td>
                    </tr>
                  ) : (
                    items.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center">
                              <span className="material-symbols-outlined text-on-surface-variant text-xl">
                                {sourceIcons[item.source] || "inventory_2"}
                              </span>
                            </div>
                            <span className="font-medium text-sm">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant font-mono">{item.asin || "—"}</td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant">{item.brand || "—"}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            item.source === "SHOPIFY" ? "bg-tertiary-container text-on-tertiary-container" : "bg-primary-container text-on-primary-container"
                          }`}>
                            {item.source === "SHOPIFY" ? "Shopify" : "Amazon"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === "Flagged" ? "bg-error text-on-error" :
                            item.status === "Monitoring" ? "bg-warning text-on-warning" :
                            "bg-tertiary-container text-on-tertiary-container"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-on-surface-variant text-right">
                          {item.last_sync ? new Date(item.last_sync).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {total > limit && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-surface-container-lowest rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-4 py-2">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(total / limit)}
                  className="px-4 py-2 bg-surface-container-lowest rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <footer className="w-full py-12 px-8 bg-slate-50 text-slate-900 border-t border-slate-200 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
              <div className="flex flex-col items-center md:items-start gap-1">
                <p className="font-headline font-bold text-slate-900">Recall Hero</p>
                <p className="text-xs text-slate-500">Automated recall detection & alerting</p>
              </div>
              <div className="flex gap-8">
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">Terms of Service</a>
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">Privacy Policy</a>
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">Security</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}