import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { clearTokens, setOrgName } from "../lib/api";

interface HeaderProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
}

export default function Header({ showSearch = true, searchPlaceholder = "Search...", onSearch }: HeaderProps) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get("/auth/me");
      setUser(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearTokens();
    navigate("/");
  };

  const handleSettings = () => {
    navigate("/settings");
    setDropdownOpen(false);
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <img src="/logo.png" alt="Recall Hero" className="h-8" />
        <div className="flex items-center gap-6">
          {showSearch && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                search
              </span>
              <input
                className="bg-surface-container-high border-none rounded-lg pl-10 pr-4 py-1.5 text-sm focus:ring-1 focus:ring-primary w-64"
                placeholder={searchPlaceholder}
                onChange={(e) => onSearch?.(e.target.value)}
              />
            </div>
          )}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm text-slate-600">
                  person
                </span>
              </div>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-bold text-slate-900">{user?.full_name || "User"}</p>
                  <p className="text-xs text-slate-500">{user?.email || ""}</p>
                  <p className="text-xs text-primary mt-1">{user?.org_name || "Your Company"}</p>
                </div>
                <button
                  onClick={handleSettings}
                  className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">settings</span>
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 text-left text-sm text-error hover:bg-slate-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}