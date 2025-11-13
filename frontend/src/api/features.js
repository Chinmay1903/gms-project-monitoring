import http from "./client";

/** Extract a human-readable message from FastAPI-style payloads */
export const firstMsg = (payload) => {
  if (!payload) return null;
  if (typeof payload === "string") return payload;
  if (Array.isArray(payload.detail) && payload.detail.length && payload.detail[0]?.msg) {
    return String(payload.detail[0].msg);
  }
  if (typeof payload.detail === "string") return payload.detail;
  if (typeof payload.msg === "string") return payload.msg;
  return null;
};

/* =========================
 * Roles / Employees
 * ======================= */
export const getRoles = async () => {
  const res = await http.get("/api/roles");
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Roles fetched successfully" : "Failed to fetch roles"),
    data,
  };
};

export const getEmployees = async () => {
  const res = await http.get("/api/employees");
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Employees fetched successfully" : "Failed to fetch employees"),
    data,
  };
};

export const getEmployeeNames = async () => {
  const res = await http.get("/api/employees/names");
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message:
      data?.message || (ok ? "Employee names fetched successfully" : "Failed to fetch employee names"),
    data,
  };
};

export const addEmployee = async (employee) => {
  const res = await http.post("/api/employees", employee);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Employee added successfully";
  return {
    ok,
    message: data?.message || (ok ? "Employee added successfully" : "Failed to add employee"),
    data,
  };
};

export const updateEmployee = async (id, employee) => {
  const res = await http.put(`/api/employees/${id}`, employee);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Employee updated successfully";
  return {
    ok,
    message: data?.message || (ok ? "Employee updated successfully" : "Failed to update employee"),
    data,
  };
};

export const deleteEmployee = async (id) => {
  const res = await http.delete(`/api/employees/${id}`);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Employee deleted successfully";
  return {
    ok,
    message: data?.message || (ok ? "Employee deleted successfully" : "Failed to delete employee"),
    data,
  };
};

/* =========================
 * Projects
 * ======================= */
export const getProjects = async () => {
  try {
    const res = await http.get("/api/projects");
    const data = res?.data;
    const ok = res.status === 200 && Array.isArray(data);
    return { ok, message: data?.message || (ok ? "Projects fetched successfully" : "Failed to fetch projects"), data };
  } catch (err) {
    const payload = err?.response?.data;
    return {
      ok: false,
      message:
        (Array.isArray(payload?.detail) && payload.detail[0]?.msg) ||
        payload?.detail ||
        payload?.msg ||
        err?.message ||
        "Failed to fetch projects",
      data: [],
    };
  }
};

export const addProject = (payload) => http.post("/api/projects", payload);

/** PUT /api/projects/{project_id}/{trainer_id} (Swagger)
 *  Fallback: /api/projects/{project_id}
 */
export const updateProject = (id, payload = {}) => {
  const trainerId =
    payload?.employees_id ?? payload?.trainer_id ?? payload?.employeesId ?? payload?.trainerId;
  if (trainerId !== undefined && trainerId !== null && String(trainerId).trim() !== "") {
    return http.put(`/api/projects/${id}/${trainerId}`, payload);
  }
  return http.put(`/api/projects/${id}`, payload);
};

/** DELETE:
 *  Backend expects /api/projects/{project_id}/{employees_id}
 *  Fallback to /api/projects/{project_id} if employees_id not provided.
 */
export const deleteProject = (projectId, employeesId) => {
  if (employeesId && String(employeesId).trim() !== "") {
    return http.delete(`/api/projects/${projectId}/${employeesId}`);
  }
  return http.delete(`/api/projects/${projectId}`);
};

/** GET /api/projects/trainer/{trainer_name} — keep for TaskMonitoring usage */
export const getProjectNamesByEmployeeID = async (trainerKey) => {
  const res = await http.get(`/api/projects/trainer/${encodeURIComponent(trainerKey)}`);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return { ok, message: data?.message || (ok ? "Project names fetched successfully" : "Failed to fetch project names"), data };
};


/* =========================
 * Tasks / Dashboard
 * ======================= */
/** Swagger shows plural /api/tasks for list & create */
export const getTasks = async () => {
  const res = await http.get("/api/tasks");
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Tasks fetched successfully" : "Failed to fetch tasks"),
    data,
  };
};

export const addTask = async (task) => {
  const res = await http.post("/api/tasks", task);
  const data = res?.data;
  const ok = res.status === 200 && (data?.message || data?.task_id);
  return {
    ok: Boolean(ok),
    message: data?.message || "Task added",
    data,
  };
};

export const updateTask = async (id, task) => {
  const res = await http.put(`/api/tasks/${id}`, task);
  const data = res?.data;
  const ok = res.status === 200 && (data?.message || data?.task_id);
  return {
    ok: Boolean(ok),
    message: data?.message || "Task updated",
    data,
  };
};

export const dashboardData = async () => {
  const res = await http.get(`/api/dashboard/summary`);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message:
      data?.message || (ok ? "Dashboard data fetched successfully" : "Failed to fetch dashboard data"),
    data,
  };
};




// import http from "./client";
// import client from "./client";

// export const getRoles = async () => {
//   const res = await http.get("/roles");
//   console.log(res);
  
//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Roles fetched successfully" : "Failed to fetch roles"),
//     data: data,
//   };
// };

// export const getEmployees = async () => {
//   const res = await http.get("/employees");
//   console.log(res);

//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Employees fetched successfully" : "Failed to fetch employees"),
//     data: data,
//   };
// };

// export const getEmployeeNames = async () => {
//   const res = await http.get("/employees_names");
//   console.log(res);

//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Employee names fetched successfully" : "Failed to fetch employee names"),
//     data: data,
//   };
// };

// export const addEmployee = async (employee) => {
//   const res = await http.post("/employees", employee);
//   console.log(res);

//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Employee added successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Employee added successfully" : "Failed to add employee"),
//     data: data,
//   };
// };

// export const updateEmployee = async (id, employee) => {
//   const res = await http.put(`/employees/${id}`, employee);
//   console.log(res);
//     const data = res?.data;
//     const ok = res.status === 200 && data?.message === "Employee updated successfully";
//     return {
//       ok,
//       message: data?.message || (ok ? "Employee updated successfully" : "Failed to update employee"),
//       data: data,
//     };
// };

// export const deleteEmployee = async (id) => {
//   const res = await http.delete(`/employees/${id}`);
//   console.log(res);
//     const data = res?.data;
//     const ok = res.status === 200 && data?.message === "Employee deleted successfully";
//     return {
//       ok,
//       message: data?.message || (ok ? "Employee deleted successfully" : "Failed to delete employee"),
//       data: data,
//     };
// };

// export const getProjects = async () => {
//   const res = await http.get("/projects");
//   // console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Projects fetched successfully" : "Failed to fetch projects"),
//     data: data,
//   };
// };

// export const addProject = async (project) => {
//   const res = await http.post("/projects", project);
//   // console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Project added successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Project added successfully" : "Failed to add project"),
//     data: data,
//   };
// };

// export const updateProject = async (id, project) => {
//   const res = await http.put(`/projects/${id}`, project);
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Project updated successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Project updated successfully" : "Failed to update project"),
//     data: data,
//   };
// };

// export const deleteProject = async (id) => {
//   const res = await http.delete(`/projects/${id}`);
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Project deleted successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Project deleted successfully" : "Failed to delete project"),
//     data: data,
//   };
// };


// export const getTasks = async () => {
//   const res = await http.get("/tasks");
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Tasks fetched successfully" : "Failed to fetch tasks"),
//     data: data,
//   };
// };

// export const addTask = async (task) => {
//   const res = await http.post("/task", task);
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Task added successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Task added successfully" : "Failed to add task"),
//     data: data,
//   };
// };

// export const updateTask = async (id, task) => {
//   const res = await http.put(`/task/${id}`, task);
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && data?.message === "Task updated successfully";
//   return {
//     ok,
//     message: data?.message || (ok ? "Task updated successfully" : "Failed to update task"),
//     data: data,
//   };
// };

// export const dashboardData = async (id) => {
//   const res = await http.get(`dashboard/summary`);
//   console.log(res);
//   const data = res?.data;
//   const ok = res.status === 200 && Array.isArray(data);
//   return {
//     ok,
//     message: data?.message || (ok ? "Dashboard data fetched successfully" : "Failed to fetch dashboard data"),
//     data: data,
//   };
// };


