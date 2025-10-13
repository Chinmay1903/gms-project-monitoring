import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_BASE_URL
  || ""; // fallback

const http = axios.create({
  baseURL: BASE_URL,
//   timeout: 15000,
  // withCredentials: true, // enable if your API uses cookies/sessions
});

// Request interceptor (attach auth headers if needed later)
http.interceptors.request.use(
  (config) => {
    // Example: attach token if you add auth later
    // const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor (normalize errors)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Surface API-provided message if present
    const apiMsg =
      error?.response?.data?.message ||
      error?.response?.data?.detail ||
      error?.message ||
      "Request failed";
    return Promise.reject(new Error(apiMsg));
  }
);

export default http;
