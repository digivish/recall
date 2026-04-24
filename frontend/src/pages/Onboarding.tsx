import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [connecting, setConnecting] = useState(false);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShopifyModal, setShowShopifyModal] = useState(false);
  const [shopifyShop, setShopifyShop] = useState("");

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const res = await api.get("/integrations");
      setIntegrations(res.data || []);
    } catch (e) {
      // Not logged in yet
    } finally {
      setLoading(false);
    }
  };

  const connectShopify = async () => {
    if (!shopifyShop.trim()) return;
    setConnecting(true);
    try {
      const shop = shopifyShop.trim().replace(".myshopify.com", "");
      const res = await api.get(`/integrations/shopify/connect?shop=${encodeURIComponent(shop)}`);
      window.location.href = res.data.auth_url;
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to start Shopify OAuth");
      setConnecting(false);
    }
  };

  const connectAmazon = async () => {
    setConnecting(true);
    try {
      const res = await api.get("/integrations/amazon/connect");
      window.location.href = res.data.auth_url;
    } catch (e: any) {
      alert(e.response?.data?.detail || "Failed to start Amazon OAuth");
      setConnecting(false);
    }
  };

  const importCatalog = async () => {
    setConnecting(true);
    try {
      const res = await api.post("/catalog/import");
      alert(`Imported ${res.data.imported} SKUs`);
      setStep(3);
    } catch (e: any) {
      alert(e.response?.data?.detail || "Import failed");
    } finally {
      setConnecting(false);
    }
  };

  const complete = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-on-surface-variant">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body">
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
                onKeyDown={(e) => e.key === "Enter" && connectShopify()}
              />
              <button
                onClick={connectShopify}
                disabled={connecting || !shopifyShop.trim()}
                className="px-6 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50"
              >
                {connecting ? "..." : "Connect"}
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

      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img src="/logo.png" alt="Recall Hero" className="h-8" />
          <div className="flex items-center gap-4">
            <Link to="/" className="text-slate-500 hover:text-slate-900 text-sm font-medium">
              Logout
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto pt-16 pb-24 px-6">
        <div className="text-center mb-12">
          <h1 className="font-headline text-4xl font-extrabold text-primary mb-4">Initialize Your Ledger</h1>
          <p className="text-on-surface-variant text-lg">Secure your architectural supply chain by connecting your primary data sources.</p>
        </div>

        <div className="max-w-4xl mx-auto mb-12 flex justify-between items-start relative px-4">
          <div className="absolute top-5 left-12 right-12 h-[2px] bg-surface-container-high -z-10">
            <div className={`h-full bg-primary transition-all ${step >= 2 ? "w-1/2" : "w-0"}`} />
          </div>

          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ring-4 ring-background ${
                  step >= s ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant"
                }`}
              >
                {s}
              </div>
              <span
                className={`font-headline font-semibold text-sm ${
                  step >= s ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {s === 1 ? "Connect Store" : s === 2 ? "Import Catalog" : "Setup Alerts"}
              </span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
              <h2 className="font-headline text-2xl font-bold text-primary mb-2">Primary Integration</h2>
              <p className="text-on-surface-variant mb-8">Link your e-commerce storefront to enable real-time risk monitoring.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={connectAmazon}
                  disabled={connecting}
                  className="group flex flex-col items-start p-6 rounded-lg bg-surface-container-low hover:bg-primary-container transition-all duration-300 border-b-2 border-transparent hover:border-primary disabled:opacity-50"
                >
                  <span className="mb-4 text-primary group-hover:text-white text-4xl material-symbols-outlined">
                    shopping_cart
                  </span>
                  <span className="font-headline font-extrabold text-lg text-primary group-hover:text-white mb-1">
                    Connect Amazon SP-API
                  </span>
                  <span className="text-xs text-on-surface-variant group-hover:text-on-primary-container text-left">
                    Full sync including SKU metadata.
                  </span>
                </button>

                <button
                  onClick={() => setShowShopifyModal(true)}
                  disabled={connecting}
                  className="group flex flex-col items-start p-6 rounded-lg bg-surface-container-low hover:bg-primary-container transition-all duration-300 border-b-2 border-transparent hover:border-primary disabled:opacity-50"
                >
                  <span className="mb-4 text-primary group-hover:text-white text-4xl material-symbols-outlined">
                    webhook
                  </span>
                  <span className="font-headline font-extrabold text-lg text-primary group-hover:text-white mb-1">
                    Connect Shopify
                  </span>
                  <span className="text-xs text-on-surface-variant group-hover:text-on-primary-container text-left">
                    Instant event-driven alerts.
                  </span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-outline-variant/20 flex items-center justify-between">
                <span className="text-xs font-medium text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  Encrypted SOC2 Compliant
                </span>
                <button
                  onClick={() => setStep(2)}
                  className="text-primary font-bold text-sm hover:underline flex items-center gap-1"
                >
                  Skip for now
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col gap-6">
              <div className="bg-surface-container-lowest/70 backdrop-blur-xl rounded-xl p-6 border border-outline-variant/10">
                <h3 className="font-headline font-bold text-primary mb-3">Why connect?</h3>
                <ul className="flex flex-col gap-4">
                  {[
                    "Automated daily catalog reconciliation",
                    "Zero-latency recall detection",
                    "One-click audit reports",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="material-symbols-outlined text-tertiary-container text-sm">
                        check_circle
                      </span>
                      <span className="text-xs font-medium text-on-surface">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
              <h2 className="font-headline text-2xl font-bold text-primary mb-2">Import Your Catalog</h2>
              <p className="text-on-surface-variant mb-8">
                Import SKUs from your connected store for recall matching.
              </p>

              <button
                onClick={importCatalog}
                disabled={connecting}
                className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-4 rounded-lg font-headline font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {connecting ? "Importing..." : "Import Catalog"}
              </button>

              <div className="mt-8 pt-6 border-t border-outline-variant/20 flex justify-between">
                <button onClick={() => setStep(1)} className="text-on-surface-variant font-medium hover:text-primary">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="text-primary font-bold hover:underline">
                  Skip Import
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="bg-tertiary-container/10 rounded-xl p-6 text-on-tertiary-container">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined">info</span>
                  <span className="font-bold text-sm">How it works</span>
                </div>
                <p className="text-xs">
                  We'll sync your product catalog and match it against FDA, CPSC, and Health Canada recall databases
                  using our AI-powered matching engine.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
              <h2 className="font-headline text-2xl font-bold text-primary mb-2">Configure Alerts</h2>
              <p className="text-on-surface-variant mb-8">
                Set how you want to be notified about recall alerts.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { id: "email", label: "Email Alerts", checked: true },
                  { id: "sms", label: "SMS Alerts", checked: false },
                  { id: "slack", label: "Slack Integration", checked: false },
                ].map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center gap-4 p-4 bg-surface-container-low rounded-lg cursor-pointer hover:bg-surface-container-high transition-colors"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={opt.checked}
                      className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                    />
                    <span className="font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="text-on-surface-variant font-medium hover:text-primary">
                  Back
                </button>
                <button
                  onClick={complete}
                  className="bg-primary text-white px-8 py-3 rounded-lg font-headline font-bold hover:bg-primary-container transition-colors"
                >
                  Complete Setup
                </button>
              </div>
            </div>

            <div className="md:col-span-4">
              <div className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/10">
                <h3 className="font-headline font-bold text-primary mb-3">Alert Tiers</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Critical</span>
                    <span className="text-error font-bold">Auto-pause</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Amber</span>
                    <span className="text-amber-600 font-bold">Notify only</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Monitoring</span>
                    <span className="text-on-surface-variant">Log only</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}