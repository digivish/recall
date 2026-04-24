import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await axios.post("/api/auth/refresh", { refresh_token: refresh });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          original.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
};

export const clearTokens = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("org_name");
};

export const setOrgName = (name: string) => {
  localStorage.setItem("org_name", name);
};

export const getOrgName = () => {
  return localStorage.getItem("org_name") || "Your Company";
};

export const isAuthenticated = () => !!localStorage.getItem("access_token");