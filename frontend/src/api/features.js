import http from "./client";

export const getRoles = async () => {
  const res = await http.get("/roles");
  console.log(res);
  
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Roles fetched successfully" : "Failed to fetch roles"),
    data: data,
  };
};

export const getEmployees = async () => {
  const res = await http.get("/employees");
  console.log(res);

  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Employees fetched successfully" : "Failed to fetch employees"),
    data: data,
  };
};

export const getEmployeeNames = async () => {
  const res = await http.get("/employees_names");
  console.log(res);

  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Employee names fetched successfully" : "Failed to fetch employee names"),
    data: data,
  };
};

export const addEmployee = async (employee) => {
  const res = await http.post("/employees", employee);
  console.log(res);

  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Employee added successfully";
  return {
    ok,
    message: data?.message || (ok ? "Employee added successfully" : "Failed to add employee"),
    data: data,
  };
};

export const updateEmployee = async (id, employee) => {
  const res = await http.put(`/employees/${id}`, employee);
  console.log(res);
    const data = res?.data;
    const ok = res.status === 200 && data?.message === "Employee updated successfully";
    return {
      ok,
      message: data?.message || (ok ? "Employee updated successfully" : "Failed to update employee"),
      data: data,
    };
};

export const deleteEmployee = async (id) => {
  const res = await http.delete(`/employees/${id}`);
  console.log(res);
    const data = res?.data;
    const ok = res.status === 200 && data?.message === "Employee deleted successfully";
    return {
      ok,
      message: data?.message || (ok ? "Employee deleted successfully" : "Failed to delete employee"),
      data: data,
    };
};

export const getProjects = async () => {
  const res = await http.get("/projects");
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Projects fetched successfully" : "Failed to fetch projects"),
    data: data,
  };
};

export const addProject = async (project) => {
  const res = await http.post("/projects", project);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Project added successfully";
  return {
    ok,
    message: data?.message || (ok ? "Project added successfully" : "Failed to add project"),
    data: data,
  };
};

export const updateProject = async (id, project) => {
  const res = await http.put(`/projects/${id}`, project);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Project updated successfully";
  return {
    ok,
    message: data?.message || (ok ? "Project updated successfully" : "Failed to update project"),
    data: data,
  };
};

export const deleteProject = async (id) => {
  const res = await http.delete(`/projects/${id}`);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Project deleted successfully";
  return {
    ok,
    message: data?.message || (ok ? "Project deleted successfully" : "Failed to delete project"),
    data: data,
  };
};

export const getProjectNamesByEmployeeID = async (employeeId) => {
  const res = await http.get(`/projects/trainer/${employeeId}`);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Project names fetched successfully" : "Failed to fetch project names"),
    data: data,
  };
};

export const getTasks = async () => {
  const res = await http.get("/tasks");
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Tasks fetched successfully" : "Failed to fetch tasks"),
    data: data,
  };
};

export const addTask = async (task) => {
  const res = await http.post("/task", task);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Task added successfully";
  return {
    ok,
    message: data?.message || (ok ? "Task added successfully" : "Failed to add task"),
    data: data,
  };
};

export const updateTask = async (id, task) => {
  const res = await http.put(`/task/${id}`, task);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && data?.message === "Task updated successfully";
  return {
    ok,
    message: data?.message || (ok ? "Task updated successfully" : "Failed to update task"),
    data: data,
  };
};

export const dashboardData = async (id) => {
  const res = await http.get(`dashboard/summary`);
  console.log(res);
  const data = res?.data;
  const ok = res.status === 200 && Array.isArray(data);
  return {
    ok,
    message: data?.message || (ok ? "Dashboard data fetched successfully" : "Failed to fetch dashboard data"),
    data: data,
  };
};
