import http from "./client";

// ✅ Named export (what your page imports)
export const loginApi = async ({ username, password }) => {
  const res = await http.post("/login", { username, password });
  console.log(res);
  
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Login successful";
  return {
    ok,
    message: data?.message || (ok ? "Login successful" : "Login failed"),
    raw: data,
  };
};

// (Optional) default export so BOTH patterns work
// export default { loginApi };
