

import React, { useMemo, useState, useEffect, useRef } from "react";
import AppLayout from "../components/AppLayout";
import "./ResourceList.css";
import {
  getRoles,
  getEmployees,
  addEmployee,
  updateEmployee,
  deleteEmployee,
  firstMsg,
} from "../../../api/features";
import ConfirmModal from "../components/ConfirmModal";
import SuccessModal from "../components/SuccessModal";
import ErrorModal from "../components/ErrorModal";
import PaginationBar from "../components/PaginationBar";

export default function ResourceList() {
  // ---------- defaults for ALL fields ----------
  const emptyForm = {
    id: "",
    name: "",
    role: "",
    roleName: "",
    gender: "",
    email: "",
    c_email: "",
    mobile: "",
    designation: "",
    skill: "",
    exp: "",
    qualification: "",
    state: "",
    city: "",
    start: "",
    end: "",
    status: "1",
  };

  const [roles, setRoles] = useState([]);
  const [roleFilter, setRoleFilter] = useState(["All"]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  // modals
  const [confirm, setConfirm] = useState({
    show: false,
    title: "",
    body: null,
    confirmText: "Confirm",
    confirmVariant: "primary",
    onConfirm: null,
  });
  const [success, setSuccess] = useState({ show: false, message: "" });
  const [errModal, setErrModal] = useState({ show: false, message: "" });

  // ---------- filters ----------
  const [roleTab, setRoleTab] = useState("All");
  const [q, setQ] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // ---------- sort ----------
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ---------- modal ----------
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // pagination
  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  const todayYMD = new Date().toISOString().slice(0, 10);
  const ddmmyyyy = `${todayYMD.slice(8, 10)}/${todayYMD.slice(5, 7)}/${todayYMD.slice(0, 4)}`;
  const todayFile = todayYMD;

  /* ---------- CSV helpers (Resources) ---------- */
  const toCsv = (rows) => {
    const cols = [
      "id", "name", "role", "roleName", "gender", "email", "c_email", "mobile", "designation", "skill",
      "exp", "qualification", "state", "city", "start", "end", "status"
    ];
    if (!rows?.length) return cols.join(",") + "\n";
    const lines = rows.map((r) =>
      cols.map((c) => {
        const v = r[c] ?? "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(",")
    );
    return [cols.join(","), ...lines].join("\n");
  };

  const parseCsv = async (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read CSV"));
      reader.onload = () => {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (!lines.length) return resolve([]);
        const header = lines[0].split(",").map((h) => h.trim());
        const out = lines.slice(1).map((ln) => {
          const cells = ln.match(/("(?:[^"]|"")*"|[^,]+)/g) || [];
          const vals = cells.map((c) => c.replace(/^"(.*)"$/, "$1").replace(/""/g, '"'));
          const obj = {};
          header.forEach((h, i) => (obj[h] = vals[i]));
          return obj;
        });
        resolve(out);
      };
      reader.readAsText(file);
    });

  // file input (Import)
  const fileInputRef = useRef(null);

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorBanner(null);
      try {
        const rolesRes = await getRoles();
        const rolesData = rolesRes?.data || [];
        setRoles(rolesData);
        const roleNames = rolesData.map((r) => r.role_name);
        setRoleFilter(["All", ...roleNames]);

        const empRes = await getEmployees();
        const employeeData = (empRes?.data || []).map((emp) => ({
          ...emptyForm,
          id: emp.employees_id,
          name:
            (emp.first_name ? emp.first_name : "") +
            (emp.last_name ? ` ${emp.last_name}` : ""),
          role: emp.role,
          roleName: emp.role_name,
          gender: emp.gender,
          email: emp.email,
          c_email: emp.corporate_email,
          mobile: emp.phone,
          designation: emp.designation,
          skill: emp.skill,
          exp: emp.experience,
          qualification: emp.qualification,
          state: emp.state,
          city: emp.city,
          start: emp.active_at?.split(" ")[0] || "",
          end: emp.inactive_at ?? (String(form.status) === "0" ? form.end : null),
          status: String(emp.status ?? "1"),
        }));
        setRows(employeeData);
      } catch (err) {
        console.error("Error loading employees/roles:", err);
        setErrorBanner("Failed to load employees");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- validation ----------
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
  const mobileOk = (v) => /^[0-9]{10,12}$/.test(v || "");
  const errors = useMemo(() => {
    const e = {};
    if (!form.id) e.id = "ID is required.";
    if (!form.role) e.role = "Role is required.";
    if (!form.gender) e.gender = "Gender is required.";
    if (!form.name.trim()) e.name = "Name is required.";
    if (!form.email) e.email = "Email is required.";
    else if (!emailOk(form.email)) e.email = "Enter a valid email.";
    if (!form.mobile) e.mobile = "Mobile is required.";
    else if (!mobileOk(form.mobile)) e.mobile = "10–12 digits.";
    if (!form.designation) e.designation = "Designation is required.";
    if (!form.skill) e.skill = "Skill is required.";
    const expStr = (form.exp ?? "").toString().trim();
    if (!expStr) {
      e.exp = "Experience is required.";
    } else {
      const expVal = Number(expStr);
      if (!Number.isFinite(expVal)) {
        e.exp = "Enter a valid number (decimals allowed).";
      } else if (expVal < 0) {
        e.exp = "Experience cannot be negative.";
      }
    }
    if (!form.start) e.start = "Start date is required.";
    if (form.status === "0" && !form.end) e.end = "Inactive date is required.";
    // optional guardrails: no future dates
    if (form.start && form.start > todayYMD) e.start = "Start cannot be in the future.";
    if (form.end && form.end > todayYMD) e.end = "End cannot be in the future.";
    return e;
  }, [form, todayYMD]);
  const isValid = Object.keys(errors).length === 0;

  // ---------- helpers ----------
  const normalize = (s) => s?.replace("T", " ").replace("Z", "") || "";
  const toYMD = (d) => {
    const n = normalize(d);
    if (!n) return "";
    const dmy = /^\d{2}-\d{2}-\d{4}$/;
    if (dmy.test(n)) {
      const [dd, mm, yy] = n.split("-");
      return `${yy}-${mm}-${dd}`;
    }
    return n.slice(0, 10);
  };

  const toDMY = (d) => {
    const n = normalize(d);
    if (!n) return "";
    const [y, m, dd] = n.split(" ")[0].split("-");
    return dd && m && y ? `${dd}-${m}-${y}` : d;
  };

  // ---------- derived ----------
  const filtered = useMemo(() => {
    let d = [...rows];
    if (roleTab !== "All") {
      d = d.filter((r) => r.roleName === roleTab);
    }
    if (q.trim()) {
      const qq = q.trim().toLowerCase();
      d = d.filter(
        (r) =>
          r.id.toLowerCase().includes(qq) ||
          r.name.toLowerCase().includes(qq) ||
          r.email.toLowerCase().includes(qq)
      );
    }
    if (showInactive) {
      d = d.filter((r) => r.status === "0");
    } else {
      d = d.filter((r) => r.status !== "0");
    }

    // date range on start date
    const fISO = toYMD(from);
    const tISO = toYMD(to);
    if (fISO) d = d.filter((r) => toYMD(r.start) >= fISO);
    if (tISO) d = d.filter((r) => toYMD(r.start) <= tISO);

    d.sort((a, b) => {
      const A = (a[sortKey] ?? "").toString().toLowerCase();
      const B = (b[sortKey] ?? "").toString().toLowerCase();
      const cmp = A < B ? -1 : A > B ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [rows, roleTab, q, sortKey, sortDir, showInactive, from, to]);

  // pagination derived
  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const endIdx = Math.min(startIdx + ROWS_PER_PAGE, filtered.length);
  const pageRows = useMemo(
    () => filtered.slice(startIdx, endIdx),
    [filtered, startIdx, endIdx]
  );
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageCount]);
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTab, q, showInactive]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleTab, q, showInactive, from, to]);


  // ---------- actions ----------
  const onAdd = () => {
    setForm({ ...emptyForm, start: todayYMD });
    setMode("add");
    setSubmitted(false);
    setShowModal(true);
  };

  const onEdit = (r) => {
    setForm({ ...emptyForm, ...r });
    setMode("edit");
    setSubmitted(false);
    setShowModal(true);
  };

  const askDelete = (row) => {
    setConfirm({
      show: true,
      title: "Confirm Delete",
      confirmText: "Delete",
      confirmVariant: "danger",
      body: (
        <div>
          Delete resource <strong>{row.name}</strong>
          <div className="text-muted small">ID: {row.id}</div>
          <div className="mt-2 small">This action cannot be undone.</div>
        </div>
      ),
      onConfirm: async () => {
        try {
          await deleteEmployee(row.id);
          setRows((prev) => prev.filter((r) => r.id !== row.id));
          setSuccess({ show: true, message: "Resource deleted" });
        } catch (err) {
          const msg =
            firstMsg(err?.response?.data) ||
            (err?.response?.status ? `HTTP ${err.response.status}` : null) ||
            err?.message ||
            "Failed to delete resource";
          setErrModal({ show: true, message: msg });
        } finally {
          setConfirm((c) => ({ ...c, show: false }));
        }
      },
    });
  };

  const onDelete = (id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    askDelete(row);
  };

  const doSave = async () => {
    // split name → first/last
    const nameParts = (form.name || "").trim().split(" ").filter(Boolean);
    const lastName = nameParts.length > 1 ? nameParts.pop() : "";
    const firstName = nameParts.join(" ");

    const payloadAdd = {
      employees_id: form.id,
      first_name: firstName,
      last_name: lastName,
      role: form.role,
      gender: form.gender,
      email: form.email,
      c_email: form.c_email,
      phone: form.mobile,
      designation: form.designation,
      skill: form.skill,
      experience: parseFloat(form.exp),
      qualification: form.qualification,
      state: form.state,
      city: form.city,
      status: "1",
      active_at: form.start, // required on add
    };

    const payloadUpd = {
      first_name: firstName,
      last_name: lastName,
      role: form.role,
      gender: form.gender,
      email: form.email,
      c_email: form.c_email,
      phone: form.mobile,
      designation: form.designation,
      skill: form.skill,
      experience: parseFloat(form.exp),
      qualification: form.qualification,
      state: form.state,
      city: form.city,
      status: form.status || "1",
      inactive_at: form.end || null, // may be required when status=0
    };

    try {
      if (mode === "add") {
        await addEmployee(payloadAdd);
        const roleName =
          roles.find((r) => String(r.role_id) === String(form.role))
            ?.role_name || "";
        setRows((prev) => [{ ...form, roleName }, ...prev]);
        setShowModal(false);
        setSuccess({ show: true, message: "Resource added" });
      } else {
        await updateEmployee(form.id, payloadUpd);
        const roleName =
          roles.find((r) => String(r.role_id) === String(form.role))
            ?.role_name || form.roleName;
        setRows((prev) =>
          prev.map((r) => (r.id === form.id ? { ...r, ...form, roleName } : r))
        );
        setShowModal(false);
        setSuccess({ show: true, message: "Resource updated" });
      }
    } catch (err) {
      const msg =
        firstMsg(err?.response?.data) ||
        (err?.response?.status ? `HTTP ${err.response.status}` : null) ||
        err?.message ||
        "Failed to save employee";
      setErrModal({ show: true, message: msg });
    } finally {
      setConfirm((c) => ({ ...c, show: false }));
    }
  };

  const askConfirmSave = (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) return;

    const summary = (
      <div className="small">
        <div><strong>Name:</strong> {form.name}</div>
        <div><strong>ID:</strong> {form.id}</div>
        <div><strong>Role:</strong> {roles.find((r) => String(r.role_id) === String(form.role))?.role_name || form.roleName || "-"}</div>
        <div><strong>Email:</strong> {form.email}</div>
        <div><strong>Mobile:</strong> {form.mobile}</div>
        <div><strong>Start:</strong> {form.start || "-"}</div>
        {form.status === "0" && <div><strong>Inactive Date:</strong> {form.end || "-"}</div>}
        <div className="mt-2">
          {mode === "add" ? "Please confirm you want to add this resource." : "Please confirm you want to update this resource."}
        </div>
      </div>
    );

    setConfirm({
      show: true,
      title: mode === "add" ? "Confirm Add" : "Confirm Update",
      confirmText: mode === "add" ? "Add Resource" : "Update Resource",
      confirmVariant: "primary",
      body: summary,
      onConfirm: doSave,
    });
  };

  /* ---------- export / import ---------- */
  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resources_${todayFile}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const rowsCsv = await parseCsv(file);
      if (!rowsCsv.length) return setErrModal({ show: true, message: "CSV is empty." });

      // convert CSV rows into our local row shape (best-effort)
      const mapped = rowsCsv.map((r) => ({
        id: r.id ?? "",
        name: r.name ?? "",
        role: r.role ?? "",
        roleName: r.roleName ?? "",
        gender: r.gender ?? "",
        email: r.email ?? "",
        mobile: r.mobile ?? "",
        designation: r.designation ?? "",
        skill: r.skill ?? "",
        exp: r.exp ?? "",
        qualification: r.qualification ?? "",
        state: r.state ?? "",
        city: r.city ?? "",
        start: r.start ?? "",
        end: r.end ?? "",
        status: r.status ?? "1",
      }));

      setConfirm({
        show: true,
        title: "Confirm Import",
        confirmText: "Import",
        confirmVariant: "primary",
        body: <div>Import <strong>{mapped.length}</strong> resources into the table? (No API calls will be made.)</div>,
        onConfirm: () => {
          setRows((prev) => [...mapped, ...prev]);
          setSuccess({ show: true, message: "CSV imported" });
          setConfirm((c) => ({ ...c, show: false }));
        },
      });
    } catch (err) {
      setErrModal({ show: true, message: err?.message || "Failed to import CSV." });
    }
  };

  // ---------- header cell ----------
  const Th = ({ label, k }) => {
    const active = sortKey === k;
    const icon = active
      ? sortDir === "asc"
        ? "bi-arrow-up text-primary"
        : "bi-arrow-down text-primary"
      : "bi-arrow-down-up";
    return (
      <th className={`sortable ${active ? "active" : ""}`}>
        <button
          type="button"
          className="sort-btn"
          onClick={() => toggleSort(k)}
          title={`Sort by ${label}`}
        >
          {label} <i className={`bi ${icon} sort-icon`} />
        </button>
      </th>
    );
  };

  // ---------- view ----------
  if (loading) {
    return (
      <AppLayout>
        <div className="p-3 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (errorBanner) {
    return (
      <AppLayout>
        <div className="p-3">
          <div className="alert alert-danger">{errorBanner}</div>
        </div>
      </AppLayout>
    );
  }

  const getFullGender = (g) =>
    g === "M" ? "Male" : g === "F" ? "Female" : g === "O" ? "Other" : "-";

  return (
    <AppLayout>
      <div className="rl-scope px-2 py-2">
        {/* actions */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv"
          className="d-none"
          onChange={handleImportFile}
        />
        <div className="d-flex justify-content-end mb-2 gap-2">
          <button className="btn btn-primary action-btn" onClick={handleImportClick} title="Import CSV">
            <i className="bi bi-database-up" />
            <span className="label">Import Data</span>
          </button>
          <button className="btn btn-primary action-btn" onClick={handleExport} title="Export CSV">
            <i className="bi bi-database-down" />
            <span className="label">Export Data</span>
          </button>
          <button className="btn btn-primary action-btn" onClick={onAdd} title="Add Resource">
            <i className="bi bi-plus-circle" />
            <span className="label">Add User</span>
          </button>
        </div>

        {/* card */}
        <div className="card bg-body-tertiary border-3 rounded-3 shadow">
          <div className="card-header bg-warning-subtle text-warning-emphasis">
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3 flex-wrap">
                <h5 className="mb-0">Resources</h5>

                <div className="btn-group" role="group" aria-label="role filter">
                  {roleFilter.map((role) => (
                    <button
                      key={role}
                      type="button"
                      className={`btn btn-sm ${roleTab === role
                        ? "btn-outline-primary active"
                        : "btn-outline-secondary"
                        }`}
                      aria-pressed={roleTab === role}
                      onClick={() => setRoleTab(role)}
                    >
                      {role === "All" ? "All" : `${role}s`}
                    </button>
                  ))}
                </div>

                <div className="form-check form-switch switch-inline">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="switchInactive"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="switchInactive">
                    Show inactive
                  </label>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                  <input
                    placeholder="From Date"
                    type="text"
                    className="form-control date-input"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    onFocus={(e) => {
                      e.target.type = "date";
                      if (from) e.target.value = toYMD(from);
                    }}
                    onBlur={(e) => {
                      const picked = e.target.value;
                      e.target.type = "text";
                      setFrom(picked ? toDMY(picked) : "");
                    }}
                  />
                  <input
                    placeholder="To Date"
                    type="text"
                    className="form-control date-input"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    onFocus={(e) => {
                      e.target.type = "date";
                      if (to) e.target.value = toYMD(to);
                    }}
                    onBlur={(e) => {
                      const picked = e.target.value;
                      e.target.type = "text";
                      setTo(picked ? toDMY(picked) : "");
                    }}
                  />
                </div>

                <div className="input-group header-search">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by ID / Name / Email / etc.... "
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                </div>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="table-responsive">
            <table className="table table-hover tasks-table">
              <thead className="text-center">
                <tr>
                  <Th label="ID" k="id" />
                  <Th label="Name" k="name" />
                  <Th label="Role" k="roleName" />
                  <Th label="Gender" k="gender" />
                  <Th label="GMS Email" k="email" />
                  <Th label="Client Email" k="c_email" />
                  <Th label="Mobile" k="mobile" />
                  <Th label="Designation" k="designation" />
                  <Th label="Skill" k="skill" />
                  <Th label="Experience" k="exp" />
                  <Th label="Start Date" k="start" />
                  {showInactive && <Th label="End Date" k="end" />}
                  <th className="actions-col text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted">{r.id}</td>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.roleName}</td>
                    <td>{getFullGender(r.gender)}</td>
                    <td>
                      <span className="text-break d-inline-block" style={{ maxWidth: 220 }}>
                        {r.email}
                      </span>
                    </td>
                    <td><span className="text-break d-inline-block" style={{ maxWidth: 220 }}>{r.c_email ?? "-"}</span></td>
                    <td>{r.mobile}</td>
                    <td>{r.designation}</td>
                    <td>{r.skill}</td>
                    <td>
                      {r.exp} {parseFloat(r.exp) > 1 ? "years" : "year"}
                    </td>
                    <td>{toDMY(r.start)}</td>
                    {showInactive && <td>{r.end ? toDMY(r.end) : "-"}</td>}
                    <td className="actions-col">
                      <div className="action-wrap" role="group" aria-label="Actions">
                        <button
                          className="btn btn-outline-secondary btn-sm action-btn"
                          onClick={() => onEdit(r)}
                          title="Edit"
                        >
                          <i className="bi bi-pencil-square" />
                          <span className="label">Edit</span>
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm action-btn"
                          onClick={() => onDelete(r.id)}
                          title="Delete"
                        >
                          <i className="bi bi-trash3" />
                          <span className="label">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={12} className="text-center py-4 text-muted">
                      No resources match the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* pagination */}
          <div className="d-flex flex-wrap align-items-center justify-content-between px-3 py-2">
            <div className="text-muted small">
              Showing {filtered.length ? startIdx + 1 : 0}-{endIdx} of {filtered.length}
            </div>
            <PaginationBar page={page} count={pageCount} onChange={setPage} />
          </div>
        </div>

        {/* Add/Edit modal */}
        {showModal && (
          <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-xl modal-dialog-centered modal-anim-slide">
                <div className="modal-content">
                  <div className="modal-header border-0 border-bottom">
                    <h5 className="modal-title">
                      {mode === "add" ? "Add Resource" : "Edit Resource"}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      aria-label="Close"
                      onClick={() => setShowModal(false)}
                    />
                  </div>

                  <form onSubmit={askConfirmSave} noValidate>
                    <div className="modal-body">
                      <div className="container-fluid">
                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label">
                              GMS ID <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.id ? "is-invalid" : ""}`}
                              placeholder="GMS ID"
                              value={form.id}
                              disabled={mode === "edit"}
                              onChange={(e) => setForm({ ...form, id: e.target.value })}
                            />
                            {submitted && errors.id && (
                              <div className="invalid-feedback">{errors.id}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">
                              Role <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${submitted && errors.role ? "is-invalid" : ""}`}
                              value={form.role}
                              onChange={(e) => setForm({ ...form, role: e.target.value })}
                            >
                              <option value="">Select role</option>
                              {roles.map((role) => (
                                <option key={role.role_id} value={role.role_id}>
                                  {role.role_name}
                                </option>
                              ))}
                            </select>
                            {submitted && errors.role && (
                              <div className="invalid-feedback">{errors.role}</div>
                            )}
                          </div>

                          <div className="col-12">
                            <label className="form-label">
                              Name <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.name ? "is-invalid" : ""}`}
                              placeholder="Resource Name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            {submitted && errors.name && (
                              <div className="invalid-feedback">{errors.name}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">
                              Gender <span className="text-danger">*</span>
                            </label>
                            <select
                              className={`form-select ${submitted && errors.gender ? "is-invalid" : ""}`}
                              value={form.gender}
                              onChange={(e) => setForm({ ...form, gender: e.target.value })}
                            >
                              <option value="">Select gender</option>
                              <option value="F">Female</option>
                              <option value="M">Male</option>
                              <option value="O">Other</option>
                            </select>
                            {submitted && errors.gender && (
                              <div className="invalid-feedback">{errors.gender}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">
                              Email <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.email ? "is-invalid" : ""}`}
                              placeholder="resource@example.com"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            {submitted && errors.email && (
                              <div className="invalid-feedback">{errors.email}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">Client Email <span className="text-danger">*</span></label>
                            <input className={`form-control ${submitted && errors.c_email ? "is-invalid" : ""}`}
                              placeholder="client@example.com"
                              value={form.c_email}
                              onChange={(e) => setForm({ ...form, c_email: e.target.value })} />
                            {submitted && errors.c_email && <div className="invalid-feedback">{errors.c_email}</div>}
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">
                              Mobile <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.mobile ? "is-invalid" : ""}`}
                              placeholder="10 digits"
                              value={form.mobile}
                              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                            />
                            {submitted && errors.mobile && (
                              <div className="invalid-feedback">{errors.mobile}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">
                              Designation <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.designation ? "is-invalid" : ""}`}
                              placeholder="e.g., Developer"
                              value={form.designation}
                              onChange={(e) =>
                                setForm({ ...form, designation: e.target.value })
                              }
                            />
                            {submitted && errors.designation && (
                              <div className="invalid-feedback">{errors.designation}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">
                              Skill <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.skill ? "is-invalid" : ""}`}
                              placeholder="e.g., JavaScript"
                              value={form.skill}
                              onChange={(e) => setForm({ ...form, skill: e.target.value })}
                            />
                            {submitted && errors.skill && (
                              <div className="invalid-feedback">{errors.skill}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">
                              Experience(years:) <span className="text-danger">*</span>
                            </label>
                            <input
                              className={`form-control ${submitted && errors.exp ? "is-invalid" : ""}`}
                              placeholder="e.g., 3"
                              value={form.exp}
                              type="number"
                              step="0.1"
                              min="0"
                              inputMode="decimal"
                              onChange={(e) => setForm({ ...form, exp: e.target.value })}
                            />
                            {submitted && errors.exp && (
                              <div className="invalid-feedback">{errors.exp}</div>
                            )}
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">Qualification</label>
                            <input
                              className="form-control"
                              placeholder="e.g., Bachelor's Degree"
                              value={form.qualification}
                              onChange={(e) =>
                                setForm({ ...form, qualification: e.target.value })
                              }
                            />
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">State</label>
                            <input
                              className="form-control"
                              placeholder="e.g., Texas"
                              value={form.state}
                              onChange={(e) => setForm({ ...form, state: e.target.value })}
                            />
                          </div>

                          <div className="col-12 col-md-4">
                            <label className="form-label">City</label>
                            <input
                              className="form-control"
                              placeholder="e.g., Houston"
                              value={form.city}
                              onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                          </div>

                          <div className="col-12 col-md-5">
                            <div>
                              <label className="form-label">
                                Start Date <span className="text-danger">*</span>
                              </label>
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="date"
                                  className={`form-control ${submitted && errors.start ? "is-invalid" : ""}`}
                                  value={form.start}
                                  max={todayYMD}
                                  onChange={(e) => setForm({ ...form, start: e.target.value })}
                                />
                                {mode === "edit" && (
                                  <div className="form-check ms-2">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id="inactiveChk"
                                      checked={form.status === "0"}
                                      onChange={(e) => {
                                        const nowYMD = new Date()
                                          .toISOString()
                                          .slice(0, 10);
                                        const inactive = e.target.checked;
                                        setForm((f) => ({
                                          ...f,
                                          status: inactive ? "0" : "1",
                                          end: inactive ? f.end || nowYMD : "",
                                        }));
                                      }}
                                    />
                                    <label className="form-check-label" htmlFor="inactiveChk">
                                      Inactive
                                    </label>
                                  </div>
                                )}
                              </div>
                              {submitted && errors.start && (
                                <div className="invalid-feedback">{errors.start}</div>
                              )}
                              <div className="form-text">
                                Default to today; format dd/mm/yyyy ({ddmmyyyy})
                              </div>
                            </div>
                          </div>

                          <div className="col-12 col-md-3">
                            {mode === "edit" && form.status !== "1" && (
                              <div>
                                <label className="form-label">Inactive Date</label>
                                <input
                                  type="date"
                                  min={form.start}
                                  max={todayYMD}
                                  className={`form-control ${submitted && errors.end ? "is-invalid" : ""}`}
                                  value={form.end}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      end: e.target.value,
                                      status: "0",
                                    })
                                  }
                                  disabled={form.status !== "0"}
                                />
                                {submitted && errors.end && (
                                  <div className="invalid-feedback">{errors.end}</div>
                                )}
                                <div className="form-text">
                                  Set the end/separation date. Default to today; format
                                  dd/mm/yyyy
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer border-0 border-top">
                      <button type="submit" className="btn btn-primary">
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Close
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show"></div>
          </>
        )}

        {/* confirm/success/error modals */}
        <ConfirmModal
          show={confirm.show}
          title={confirm.title}
          confirmText={confirm.confirmText}
          confirmVariant={confirm.confirmVariant}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm((c) => ({ ...c, show: false }))}
          size="lg"
        >
          {confirm.body}
        </ConfirmModal>

        <SuccessModal
          show={success.show}
          message={success.message}
          onHide={() => setSuccess({ show: false, message: "" })}
        />

        <ErrorModal
          show={errModal.show}
          message={errModal.message}
          onHide={() => setErrModal({ show: false, message: "" })}
        />
      </div>
    </AppLayout>
  );
}
