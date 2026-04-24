import { Link } from "react-router-dom";
import { getOrgName } from "../lib/api";

interface NavItem {
  icon: string;
  label: string;
  href?: string;
  active?: boolean;
  badge?: number | null;
}

interface SidebarProps {
  customerName?: string;
  navItems?: NavItem[];
}

export default function Sidebar({ customerName, navItems }: SidebarProps) {
  const name = customerName || getOrgName();

  const defaultNavItems: NavItem[] = [
    { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
    { icon: "inventory_2", label: "Inventory", href: "/inventory" },
    { icon: "warning", label: "Active Recalls", href: "/recalls" },
    { icon: "assessment", label: "Risk Reports", href: "/reports/evidence" },
    { icon: "hub", label: "Integrations", href: "/settings/integrations" },
    { icon: "settings", label: "Settings", href: "/settings" },
  ];

  const items = navItems || defaultNavItems;

  return (
    <aside className="h-screen w-64 fixed left-0 top-[57px] overflow-y-auto bg-slate-50 text-slate-900 font-inter text-sm font-medium flex flex-col gap-y-4 p-4 border-r border-slate-200/50 z-30">
      <div className="mb-4 px-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-bold text-sm">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 leading-tight">{name}</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Risk Management</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.label}
            to={item.href || "#"}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${
              item.active
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:bg-slate-200/50"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="bg-error text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {item.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
    </aside>
  );
}