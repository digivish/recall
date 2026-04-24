import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { setTokens, setOrgName as saveOrgName } from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      setTokens(res.data.access_token, res.data.refresh_token);
      
      // Get user info and save org name
      const userRes = await api.get("/auth/me");
      saveOrgName(userRes.data.org_name || "Your Company");
      
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="block text-center">
              <img src="/logo.png" alt="Recall Hero" className="h-10 mx-auto" />
            </Link>
        </div>

        <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
          <h1 className="font-headline text-2xl font-bold text-primary mb-6">Sign in</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 bg-error-container rounded-lg text-error text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-high border-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface-variant mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-surface-container-high border-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-headline font-bold hover:bg-primary-container transition-colors disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}