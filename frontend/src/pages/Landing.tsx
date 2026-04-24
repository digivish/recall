// NOTE: JSX is handled by vite's esbuild plugin, no explicit React import needed
import { Link } from "react-router-dom";
import "../styles/index.css";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-on-background font-body">
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-lg border-none shadow-none">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-6">
          <img src="/logo.png" alt="Recall Hero" className="h-10" />
          <div className="hidden md:flex gap-x-12 items-center">
            <a className="text-slate-500 hover:text-slate-900 font-headline font-semibold transition-opacity opacity-80 hover:opacity-100" href="#">Product</a>
            <a className="text-slate-500 hover:text-slate-900 font-headline font-semibold transition-opacity opacity-80 hover:opacity-100" href="#">Solutions</a>
            <a className="text-slate-500 hover:text-slate-900 font-headline font-semibold transition-opacity opacity-80 hover:opacity-100" href="#">Pricing</a>
            <a className="text-slate-500 hover:text-slate-900 font-headline font-semibold transition-opacity opacity-80 hover:opacity-100" href="#">Resources</a>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="text-slate-500 hover:text-slate-900 font-headline font-semibold">Login</Link>
            <Link to="/register" className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2.5 rounded-lg font-headline font-semibold transition-all">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-24">
        <section className="relative min-h-[870px] flex items-center overflow-hidden px-8">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-high rounded-full mb-8">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                <span className="text-xs font-bold font-headline uppercase tracking-widest text-on-surface-variant">
                  Live Regulatory Alert System
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-primary font-headline editorial-tight leading-[1.05] mb-6">
                Automation is coming for your seller account.
                <br />
                <span className="text-on-secondary-container">Run your own automation first.</span>
              </h1>
              <p className="text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
                Precision monitoring across FDA, CPSC, and Health Canada. Detect recall signals before market platforms flag your catalog.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="bg-gradient-to-r from-primary to-primary-container text-on-primary px-8 py-4 rounded-lg font-headline font-bold text-lg shadow-xl shadow-primary/10 hover:scale-[1.02] active:scale-100 transition-transform">
                  Protect My Catalog
                </button>
                <button className="border-b-2 border-transparent hover:border-primary text-primary px-8 py-4 font-headline font-bold text-lg transition-all">
                  View Live Feeds
                </button>
              </div>
            </div>
            <div className="lg:col-span-5 relative">
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-2xl shadow-primary/5 border border-outline-variant/10 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <span className="font-headline font-bold text-sm tracking-tight">REAL-TIME RISK INDEX</span>
                  <span className="text-error font-bold text-sm flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">trending_up</span>
                    90.6% Surge
                  </span>
                </div>
                <div className="relative flex justify-center py-8">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle className="text-surface-variant" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                    <circle className="text-error" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeDasharray="552.92" strokeDashoffset="110.58" strokeWidth="12" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
                    <span className="text-4xl font-extrabold font-headline text-primary">CRITICAL</span>
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Market Volatility</span>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <div className="p-3 bg-surface-container-low rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-tertiary-container">check_circle</span>
                    <span className="text-sm font-medium">FDA Food Safety Feed: Active</span>
                  </div>
                  <div className="p-3 bg-error-container/50 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-error">warning</span>
                    <span className="text-sm font-medium text-on-error-container">CPSC Product Recall: 12 New Matches</span>
                  </div>
                </div>
              </div>
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-20 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left items-center">
              <div>
                <h3 className="text-sm font-bold font-headline uppercase tracking-widest text-on-surface-variant mb-4">The Compliance Crisis</h3>
                <p className="text-3xl font-headline font-bold text-primary editorial-tight">Recall surges are the #1 cause of sudden seller suspensions in 2024.</p>
              </div>
              <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm border border-outline-variant/10">
                <div className="text-5xl font-black font-headline text-error mb-2">90.6%</div>
                <p className="text-on-surface-variant font-medium">Increase in regulatory recall actions year-over-year.</p>
              </div>
              <div className="bg-surface-container-lowest p-10 rounded-xl shadow-sm border border-outline-variant/10">
                <div className="text-5xl font-black font-headline text-primary mb-2">12s</div>
                <p className="text-on-surface-variant font-medium">Average latency between official feed publication and notification.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-extrabold font-headline text-primary editorial-tight mb-4">Structural Intelligence. Automated Defense.</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto text-lg">Recall Hero operates as your 24/7 digital legal terminal, monitoring the sources that matter most.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[240px]">
              <div className="md:col-span-8 bg-primary text-on-primary p-10 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-2xl font-bold font-headline mb-2">FDA Real-Time Feed</h4>
                  <p className="text-on-primary-container max-w-md">Deep integration with FDA enforcement reports. Instant catalog cross-referencing for Food, Drug, and Cosmetic categories.</p>
                </div>
                <div className="flex gap-4">
                  <div className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">Enforcement Monitoring</div>
                  <div className="px-4 py-2 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">Live API Sync</div>
                </div>
              </div>
              <div className="md:col-span-4 bg-surface-container-high p-10 rounded-xl flex flex-col justify-between">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center text-white mb-4">
                  <span className="material-symbols-outlined">public</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold font-headline mb-2 text-primary">Health Canada</h4>
                  <p className="text-sm text-on-surface-variant">Expansion to North American safety standards including Health Canada's recall and safety alerts.</p>
                </div>
              </div>
              <div className="md:col-span-4 bg-surface-container-lowest border border-outline-variant/20 p-10 rounded-xl flex flex-col justify-between">
                <div className="w-12 h-12 bg-error rounded-lg flex items-center justify-center text-white mb-4">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                </div>
                <div>
                  <h4 className="text-xl font-bold font-headline mb-2 text-primary">CPSC Sentinel</h4>
                  <p className="text-sm text-on-surface-variant">Consumer Product Safety Commission monitoring for toys, household goods, and electronics.</p>
                </div>
              </div>
              <div className="md:col-span-8 bg-white border border-outline-variant/20 p-10 rounded-xl flex items-center justify-between overflow-hidden relative">
                <div className="max-w-sm">
                  <h4 className="text-2xl font-bold font-headline mb-2 text-primary">Pre-emptive Suspension Defense</h4>
                  <p className="text-on-surface-variant">Our radar scans and identifies risks before market bots can trigger a performance notification on your account.</p>
                </div>
                <div className="hidden lg:block relative w-48 h-48 z-10">
                  <div className="absolute inset-0 bg-primary/5 rounded-full border border-primary/10 animate-ping" />
                  <div className="absolute inset-4 bg-primary/10 rounded-full border border-primary/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-5xl">shield_person</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-extrabold font-headline text-primary editorial-tight mb-4">Investment in Operational Integrity</h2>
              <p className="text-on-surface-variant">Choose the scale of protection your enterprise requires.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { tier: "Standard", price: "$99", features: ["FDA & CPSC Monitoring", "Up to 500 ASINs", "Email Alerts"] },
                { tier: "Professional", price: "$299", recommended: true, features: ["Priority Real-Time Feeds", "Up to 5,000 ASINs", "SMS & Slack Integration", "Health Canada Support"] },
                { tier: "Enterprise", price: "$999", features: ["Infinite ASIN Catalog", "Custom Webhooks", "Dedicated Compliance Officer", "White-labeled Reporting"] },
              ].map(({ tier, price, features, recommended }) => (
                <div key={tier} className={`p-10 rounded-xl flex flex-col ${recommended ? "bg-primary text-on-primary scale-105 shadow-2xl shadow-primary/20 relative" : "bg-surface-container-lowest border border-outline-variant/10"}`}>
                  {recommended && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-error text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">Recommended</div>}
                  <h4 className={`text-sm font-bold font-headline uppercase tracking-widest mb-6 ${recommended ? "text-on-primary-container" : "text-on-surface-variant"}`}>{tier}</h4>
                  <div className="mb-8">
                    <span className={`text-5xl font-black font-headline ${recommended ? "text-white" : "text-primary"}`}>{price}</span>
                    <span className={`font-medium ${recommended ? "text-on-primary-container" : "text-on-surface-variant"}`}>/mo</span>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm font-medium">
                        <span className="material-symbols-outlined text-sm">{recommended ? "check" : "check"}</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-4 font-bold font-headline rounded-lg ${recommended ? "bg-on-primary text-primary shadow-lg" : "border-2 border-primary text-primary hover:bg-primary hover:text-white"}`}>
                    {tier === "Enterprise" ? "Contact Sales" : `Start ${tier}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-32 px-8 overflow-hidden relative">
          <div className="max-w-5xl mx-auto bg-surface-container-highest p-16 rounded-[2rem] text-center relative z-10 border border-white">
            <h2 className="text-4xl lg:text-5xl font-extrabold font-headline text-primary mb-8 leading-tight">
              Don't let a database update<br className="hidden md:block" /> destroy your brand overnight.
            </h2>
            <button className="bg-primary text-on-primary px-10 py-5 rounded-xl font-headline font-bold text-xl shadow-2xl shadow-primary/20 hover:scale-105 active:scale-100 transition-all">
              Protect My Catalog
            </button>
            <p className="mt-8 text-on-surface-variant font-medium flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-tertiary-container">verified_user</span>
              Setup in under 5 minutes. No technical team required.
            </p>
          </div>
        </section>
      </main>

      <footer className="bg-slate-50 py-12 px-8 border-t border-slate-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col gap-2">
            <span className="font-manrope font-bold text-slate-900 text-xl">Recall Ledger</span>
            <p className="text-xs text-slate-500 font-inter">© 2024 Architectural Ledger. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs text-slate-500 font-inter uppercase tracking-widest font-bold">
            {["Terms of Service", "Privacy Policy", "Security", "Compliance"].map((link) => (
              <a key={link} className="no-underline hover:text-slate-900 transition-opacity" href="#">{link}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}