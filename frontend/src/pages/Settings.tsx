import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import api from "../lib/api";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
      setFormData({
        full_name: res.data.full_name || "",
        email: res.data.email || "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      <Header showSearch={false} />

      <div className="flex">
        <Sidebar
          customerName="Recall Hero"
          navItems={[
            { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
            { icon: "inventory_2", label: "Inventory", href: "/inventory" },
            { icon: "warning", label: "Active Recalls", href: "/recalls" },
            { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
            { icon: "hub", label: "Integrations", href: "/settings/integrations" },
          ]}
        />

        <main className="flex-1 min-h-screen bg-surface ml-64 pt-[57px]">
          <div className="p-8 max-w-5xl mx-auto space-y-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-extrabold tracking-tight text-primary">
                User Settings
              </h1>
              <p className="text-on-surface-variant font-medium">
                Manage your account and system access protocols.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <section className="lg:col-span-2 bg-surface-container-low rounded-xl p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    Account Profile
                  </h2>
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Profile Entity
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      className="w-full bg-surface-container-high border-b-2 border-primary border-t-0 border-x-0 focus:ring-0 text-sm font-medium h-12 px-4 rounded-t-sm"
                      type="text"
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      className="w-full bg-surface-container-high border-b-2 border-primary border-t-0 border-x-0 focus:ring-0 text-sm font-medium h-12 px-4 rounded-t-sm"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded text-sm font-bold flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                    {saving ? "Saving..." : "Change Password"}
                  </button>
                </div>
              </section>

              <section className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="h-12 w-12 bg-primary/5 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">verified</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">
                      Active Tier
                    </h3>
                    <p className="text-2xl font-extrabold text-primary">Professional</p>
                    <p className="text-on-surface-variant text-sm">$299/mo (Billed Monthly)</p>
                  </div>
                </div>
                <button className="w-full mt-8 border border-primary text-primary py-2.5 rounded text-sm font-bold hover:bg-primary hover:text-on-primary transition-all">
                  Upgrade Tier
                </button>
              </section>

              <section className="lg:col-span-3 bg-surface-container-low rounded-xl p-8 space-y-8">
                <div className="flex items-center justify-between border-b border-outline-variant/15 pb-4">
                  <h2 className="text-xl font-bold tracking-tight text-primary">
                    Billing & Payments
                  </h2>
                  <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                    Ledger Transcripts
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        Primary Payment Method
                      </label>
                      <div className="bg-surface-container-lowest p-6 rounded-lg flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-8 bg-slate-100 rounded flex items-center justify-center">
                            <span className="font-bold text-slate-400 italic">VISA</span>
                          </div>
                          <div>
                            <p className="font-bold text-primary">Visa ending in 4242</p>
                            <p className="text-xs text-on-surface-variant">Expires 12/26</p>
                          </div>
                        </div>
                        <button className="text-primary font-bold text-sm underline-offset-4 hover:underline">
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Recent Ledger Entries
                    </label>
                    <div className="overflow-hidden rounded-lg">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-surface-container-high">
                          <tr>
                            <th className="px-4 py-3 font-bold text-primary">Invoice</th>
                            <th className="px-4 py-3 font-bold text-primary">Date</th>
                            <th className="px-4 py-3 font-bold text-primary">Amount</th>
                            <th className="px-4 py-3 font-bold text-primary text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-surface-container-lowest divide-y divide-surface-container">
                          <tr>
                            <td className="px-4 py-3 font-medium">INV-0092</td>
                            <td className="px-4 py-3 text-on-surface-variant">Oct 01, 2023</td>
                            <td className="px-4 py-3 text-primary">$299.00</td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-block px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">Paid</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-medium">INV-0084</td>
                            <td className="px-4 py-3 text-on-surface-variant">Sep 01, 2023</td>
                            <td className="px-4 py-3 text-primary">$299.00</td>
                            <td className="px-4 py-3 text-right">
                              <span className="inline-block px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">Paid</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <button className="text-xs font-bold text-primary hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      View all invoices <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </section>

              <section className="lg:col-span-3 bg-error-container/20 rounded-xl p-8 border border-error/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-error">
                      <span className="material-symbols-outlined">warning</span>
                      <h2 className="text-xl font-bold tracking-tight">Danger Zone</h2>
                    </div>
                    <p className="text-on-error-container/80 text-sm max-w-2xl">
                      Deleting your account is an irreversible procedural action. All stored data and ledger history associated with <span className="font-bold">Recall Hero</span> will be permanently purged from our secure servers.
                    </p>
                  </div>
                  <button className="whitespace-nowrap bg-error text-on-error px-8 py-3 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors shadow-sm">
                    Delete Account
                  </button>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}