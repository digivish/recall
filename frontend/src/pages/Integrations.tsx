import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../lib/api";

const AVAILABLE_INTEGRATIONS = [
  {
    type: "AMAZON_SP_API",
    name: "Amazon Seller Central",
    description: "Connect your Amazon Seller Central account for inventory sync",
    icon: "shopping_bag",
    status: "live",
  },
  {
    type: "SHOPIFY",
    name: "Shopify Storefront",
    description: "Sync products from your Shopify store",
    icon: "storefront",
    status: "live",
  },
];

const COMING_SOON = [
  { name: "eBay Marketplace", description: "Secondary market monitoring", icon: "sell" },
  { name: "Walmart Connect", description: "Big-box retail data sync", icon: "sell" },
  { name: "Etsy Shop", description: "Handmade & vintage tracking", icon: "sell" },
  { name: "Health Canada", description: "Direct Regulatory API", icon: "account_balance" },
];

export default function Integrations() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyShop, setShopifyShop] = useState("");
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();

    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    if (connected === "shopify" || connected === "amazon") {
      window.history.replaceState({}, "", "/settings/integrations");
      if (connected === "shopify") {
        triggerShopifySync();
      } else {
        triggerAmazonSync();
      }
    }
  }, []);

  const loadIntegrations = async () => {
    try {
      const res = await api.get("/integrations");
      console.log("Integrations FULL:", JSON.stringify(res.data, null, 2));
      setIntegrations(res.data || []);
    } catch (e) {
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = async () => {
    if (!shopifyShop.trim()) return;
    setConnecting("SHOPIFY");
    try {
      const shop = shopifyShop.trim().replace(".myshopify.com", "");
      const res = await api.get(`/integrations/shopify/connect?shop=${encodeURIComponent(shop)}`);
      window.location.href = res.data.auth_url;
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to start Shopify OAuth");
      setConnecting(null);
    }
  };

  const triggerShopifySync = async () => {
    setSyncing("SHOPIFY");
    try {
      const res = await api.post("/integrations/shopify/sync");
      console.log("Sync response:", res.data);
      alert(`Synced ${res.data.synced} products from ${res.data.shop}`);
    } catch (e: any) {
      console.error("Shopify sync error:", e);
      alert("Sync error: " + (e.response?.data?.detail || e.message));
    } finally {
      setSyncing(null);
      loadIntegrations();
    }
  };

  const triggerAmazonSync = async () => {
    setSyncing("AMAZON_SP_API");
    try {
      const res = await api.post("/integrations/amazon/sync");
      alert(`Synced ${res.data.synced} products from Amazon`);
    } catch (e: any) {
      console.error("Amazon sync error:", e);
    } finally {
      setSyncing(null);
      loadIntegrations();
    }
  };

  const handleConnectAmazon = async () => {
    setConnecting("AMAZON_SP_API");
    try {
      const res = await api.get("/integrations/amazon/connect");
      window.location.href = res.data.auth_url;
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to start Amazon OAuth");
      setConnecting(null);
    }
  };

  const handleDisconnect = async (id: string, type: string) => {
    if (!confirm(`Disconnect ${type}?`)) return;
    try {
      if (type === "SHOPIFY") {
        await api.delete("/integrations/shopify/disconnect");
      } else if (type === "AMAZON_SP_API") {
        await api.delete("/integrations/amazon/disconnect");
      } else {
        await api.delete(`/integrations/${id}`);
      }
    } catch (e) {
      console.error(e);
      alert("Error disconnecting: " + (e as any).message);
    }
    window.location.reload();
  };

  const connectedTypes = new Set(integrations.filter((i: any) => i.status === "CONNECTED").map((i: any) => i.type));
  console.log("connectedTypes:", Array.from(connectedTypes));
  console.log("integrations:", integrations);

  const filteredAvailable = AVAILABLE_INTEGRATIONS.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) &&
      !connectedTypes.has(i.type)
  );

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={true} searchPlaceholder="Search data sources..." />

      {showShopifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-2">Connect Shopify Store</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Enter your Shopify store URL to begin the OAuth connection.
            </p>
            <div className="flex gap-3">
              <input
                type="text"
                value={shopifyShop}
                onChange={(e) => setShopifyShop(e.target.value)}
                placeholder="mystore (without .myshopify.com)"
                className="flex-1 px-4 py-3 rounded-lg border border-outline-variant bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === "Enter" && handleConnectShopify()}
              />
              <button
                onClick={handleConnectShopify}
                disabled={connecting === "SHOPIFY" || !shopifyShop.trim()}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {connecting === "SHOPIFY" ? "..." : "Connect"}
              </button>
            </div>
            <button
              onClick={() => setShowShopifyModal(false)}
              className="mt-4 text-on-surface-variant text-sm hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "inventory_2", label: "Inventory", href: "/inventory" },
            { icon: "warning", label: "Active Recalls", href: "/recalls" },
            { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
            { icon: "hub", label: "Integrations", active: true },
            { icon: "settings", label: "Settings", href: "/settings" },
          ]}
        />

        <main className="flex-1 min-h-screen bg-surface ml-64 pt-[57px]">
          <div className="p-8 space-y-10 max-w-7xl">
            <div className="mb-10">
              <h1 className="text-3xl font-black text-primary tracking-tighter mb-1">
                Integrations & Data Sources
              </h1>
              <p className="text-on-surface-variant font-medium">
                Centralized control for cross-platform data ingestion
              </p>
            </div>

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">lan</span>
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    Active Connections
                  </h2>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-3 py-1 bg-surface-container-high rounded">
                  {connectedTypes.size} Live Streams
                </span>
              </div>

              {loading ? (
                <p className="text-on-surface-variant">Loading...</p>
              ) : integrations.length === 0 ? (
                <div className="bg-surface-container-lowest p-12 rounded-xl text-center">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-4 block">
                    hub
                  </span>
                  <p className="text-on-surface-variant mb-4">
                    No integrations connected yet
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Connect Amazon or Shopify to start syncing your inventory
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {integrations.map((integ: any) => (
                    <div
                      key={integ.id}
                      className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center">
                            <span className="material-symbols-outlined text-slate-700 text-3xl">
                              {integ.type === "AMAZON_SP_API" ? "shopping_bag" : "storefront"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900">
                              {integ.type === "AMAZON_SP_API" ? "Amazon Seller Central" : "Shopify Storefront"}
                            </h3>
                            <p className="text-xs text-on-surface-variant">
                              {integ.type === "AMAZON_SP_API" ? "North America Division" : "Global Retail Operations"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant font-bold text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-fixed-variant"></span>
                          HEALTHY
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-3 bg-surface-container-low rounded-lg">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                            Status
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {integ.status}
                          </p>
                        </div>
                        <div className="p-3 bg-surface-container-low rounded-lg">
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                            Last Sync
                          </p>
                          <p className="text-sm font-semibold text-primary">
                            {integ.connected_at
                              ? new Date(integ.connected_at).toLocaleDateString()
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                        <button
                          onClick={() => handleDisconnect(integ.id, integ.type)}
                          className="text-xs font-bold text-error hover:underline transition-all"
                        >
                          Disconnect
                        </button>
                        <button
                          onClick={() => {
                            if (integ.type === "SHOPIFY") {
                              triggerShopifySync();
                            } else if (integ.type === "AMAZON_SP_API") {
                              triggerAmazonSync();
                            } else {
                              api.post("/inventory/sync");
                            }
                          }}
                          disabled={syncing === integ.type}
                          className="text-xs font-bold text-primary hover:underline transition-all disabled:opacity-50"
                        >
                          {syncing === integ.type ? "Syncing..." : "Sync Now"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-primary">explore</span>
                <h2 className="text-xl font-bold tracking-tight text-primary">
                  Available Integrations
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {AVAILABLE_INTEGRATIONS.map((integ) => (
                  <div
                    key={integ.type}
                    className={`bg-surface-container p-6 rounded-xl border border-outline-variant/10 flex flex-col items-center text-center ${
                      connectedTypes.has(integ.type) ? "opacity-50" : ""
                    }`}
                  >
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">
                      {integ.icon}
                    </span>
                    <h4 className="font-bold text-slate-900 mb-1">{integ.name}</h4>
                    <p className="text-xs text-on-surface-variant mb-6">
                      {integ.description}
                    </p>
                    {connectedTypes.has(integ.type) ? (
                      <span className="text-xs font-bold text-on-tertiary-container">
                        Connected
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (integ.type === "SHOPIFY") {
                            setShowShopifyModal(true);
                          } else {
                            handleConnectAmazon();
                          }
                        }}
                        disabled={connecting === integ.type}
                        className="w-full py-2 bg-primary text-white font-bold text-xs rounded transition-all active:scale-95 disabled:opacity-50"
                      >
                        {connecting === integ.type ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>
                ))}

                {COMING_SOON.map((item) => (
                  <div
                    key={item.name}
                    className="bg-surface-container p-6 rounded-xl border border-outline-variant/10 flex flex-col items-center text-center"
                  >
                    <span className="material-symbols-outlined text-4xl text-slate-400 mb-4">
                      {item.icon}
                    </span>
                    <h4 className="font-bold text-slate-900 mb-1">{item.name}</h4>
                    <p className="text-xs text-on-surface-variant mb-6">{item.description}</p>
                    <button className="w-full py-2 bg-white text-slate-500 font-bold text-xs rounded border border-slate-200 cursor-not-allowed">
                      Coming Soon
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <footer className="w-full py-12 px-8 bg-slate-50 text-slate-900 border-t border-slate-200 mt-12">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-7xl mx-auto">
              <div className="flex flex-col items-center md:items-start gap-1">
                <p className="font-headline font-bold text-slate-900">
                  Recall Hero
                </p>
                <p className="text-xs text-slate-500">
                  Automated recall detection & alerting
                </p>
              </div>
              <div className="flex gap-8">
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">
                  Terms of Service
                </a>
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">
                  Privacy Policy
                </a>
                <a className="text-xs text-slate-500 hover:text-slate-900 transition-colors" href="#">
                  Security
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}