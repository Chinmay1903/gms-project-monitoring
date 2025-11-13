

import React, { useMemo, useState, useEffect, useCallback, useRef, useId } from "react";
import AppLayout from "../components/AppLayout";
import "./ProjectList.css";

import {
  getEmployeeNames,
  getProjects,
  addProject,
  updateProject,
  deleteProject, // (project_id, employees_id)
  firstMsg,
} from "../../../api/features";

import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import SuccessModal from "../components/SuccessModal";
import ErrorModal from "../components/ErrorModal";
import PaginationBar from "../components/PaginationBar";

/* =========================================================================
   Page
   ========================================================================= */
export default function ProjectList() {
  // table data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  // notifications
  const [success, setSuccess] = useState({ show: false, message: "" });
  const [errModal, setErrModal] = useState({ show: false, title: "Error", message: "" });

  // filters
  const [q, setQ] = useState("");
  const [fManager, setFManager] = useState("All GMS Manager");
  const [fLead, setFLead] = useState("All Turing Manager");
  const [fPodLead, setFPodLead] = useState("All Pod Leads");
  const [fTrainer, setFTrainer] = useState("All Trainers");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  // sort + paging
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const ROWS_PER_PAGE = 10;

  // add/edit modal
  const todayYMD = new Date().toISOString().slice(0, 10);
  const emptyForm = {
    id: "",
    // employees_id is intentionally hidden from UI; managed in state only
    employees_id: "",
    name: "",
    manager: "",
    lead: "",
    podLead: "",
    trainer: "",
    start: todayYMD,
    end: null,
    status: "1",
  };
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState("add");
  const [submitted, setSubmitted] = useState(false);

  // confirm modal
  const [confirm, setConfirm] = useState({
    show: false,
    title: "",
    body: null,
    confirmText: "Confirm",
    confirmVariant: "primary",
    onConfirm: null,
  });

  // lists + maps
  const [managers, setManagers] = useState([]);
  const [leads, setLeads] = useState([]);
  const [podLeads, setPodLeads] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [managersList, setManagersList] = useState([]);
  const [podLeadsList, setPodLeadsList] = useState([]);
  const [trainersList, setTrainersList] = useState([]);
  const [trainerMap, setTrainerMap] = useState({}); // { "Full Name": "GMS006" }

  // file input (import/export placeholder)
  const fileInputRef = useRef(null);

  /* =========================
     Load seed data
     ========================= */
  useEffect(() => {
    (async () => {
      try {
        const [projRes, namesRes] = await Promise.all([getProjects(), getEmployeeNames()]);

        const projectData = Array.isArray(projRes?.data)
          ? projRes.data.map((p) => ({
              id: p.project_id ?? p.id ?? "",
              employees_id: p.employees_id ?? "",
              name: (p.project_name ?? p.name ?? "").toString(),
              manager: p.gms_manager ?? p.manager ?? "",
              lead: p.t_manager ?? p.lead ?? p.lead_name ?? "",
              podLead: p.pod_lead ?? p.podLead ?? p.pod_name ?? "",
              trainer:
                `${p.employee_first_name ?? ""} ${p.employee_last_name ?? ""}`.trim() ||
                p.trainer_name ||
                "",
              start: p.active_at ?? p.create_at ?? "",
              end: p.inactive_at ?? p.finish_at ?? null,
              status: String(p.status ?? p.project_status ?? "1"),
            }))
          : [];

        setRows(projectData);

        // filter sets
        const mgrSet = new Set(), leadSet = new Set(), podSet = new Set(), trSet = new Set();
        projectData.forEach((r) => {
          if (r.manager) mgrSet.add(r.manager);
          if (r.lead) leadSet.add(r.lead);
          if (r.podLead) podSet.add(r.podLead);
          if (r.trainer) trSet.add(r.trainer);
        });
        setManagers([...mgrSet].sort());
        setLeads([...leadSet].sort());
        setPodLeads([...podSet].sort());
        setTrainers([...trSet].sort());

        // employees map
        const employees = Array.isArray(namesRes?.data) ? namesRes.data : [];
        const tMap = {};
        employees.forEach((e) => {
          const id = e.employees_id ?? e.employee_id ?? e.id ?? e.emp_id ?? e.code ?? "";
          const full =
            e.full_name ??
            [e.first_name, e.last_name].filter(Boolean).join(" ") ??
            "";
          if (full && id) tMap[String(full)] = String(id);
        });
        setTrainerMap(tMap);

        // suggestion lists
        setManagersList(
          [...new Set(
            employees
              .filter((e) => (e.role_name || "").toLowerCase().includes("manager"))
              .map((e) => e.full_name)
          )].sort()
        );
        setPodLeadsList(
          [...new Set(
            employees
              .filter((e) => (e.role_name || "").toLowerCase().includes("pod lead"))
              .map((e) => e.full_name)
          )].sort()
        );
        setTrainersList(
          [...new Set(
            employees
              .filter((e) => (e.role_name || "").toLowerCase() !== "manager")
              .map((e) => e.full_name)
          )].sort()
        );
      } catch (err) {
        setErrModal({
          show: true,
          title: "Failed to load",
          message: firstMsg(err?.response?.data) || err?.message || "Failed to load data",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* =========================
     Helpers
     ========================= */
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
  const toYMDsafe = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

  /* =========================
     Derived view model
     ========================= */
  const filtered = useMemo(() => {
    let d = [...rows];

    if (q.trim()) d = d.filter((r) => r.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (fManager !== "All GMS Manager") d = d.filter((r) => r.manager === fManager);
    if (fLead !== "All Turing Manager") d = d.filter((r) => r.lead === fLead);
    if (fPodLead !== "All Pod Leads") d = d.filter((r) => r.podLead === fPodLead);
    if (fTrainer !== "All Trainers") d = d.filter((r) => r.trainer === fTrainer);

    const fISO = toYMD(from), tISO = toYMD(to);
    if (fISO) d = d.filter((r) => toYMD(r.start) >= fISO);
    if (tISO) d = d.filter((r) => toYMD(r.start) <= tISO);

    d = d.filter((r) => (showInactive ? String(r.status) === "0" : String(r.status) !== "0"));

    d.sort((a, b) => {
      const A = (a[sortKey] ?? "").toString().toLowerCase();
      const B = (b[sortKey] ?? "").toString().toLowerCase();
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return d;
  }, [rows, q, fManager, fLead, fPodLead, fTrainer, from, to, sortKey, sortDir, showInactive]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const startIdx = (page - 1) * ROWS_PER_PAGE;
  const endIdx = Math.min(startIdx + ROWS_PER_PAGE, filtered.length);
  const pageRows = useMemo(() => filtered.slice(startIdx, endIdx), [filtered, startIdx, endIdx]);

  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [pageCount, page]);
  useEffect(() => { setPage(1); }, [q, fManager, fLead, fPodLead, fTrainer, from, to, showInactive]);

  const resetFilters = () => {
    setQ(""); setFManager("All GMS Manager"); setFLead("All Turing Manager");
    setFPodLead("All Pod Leads"); setFTrainer("All Trainers");
    setFrom(""); setTo("");
  };

  /* =========================
     Validation (no UI check for employees_id)
     ========================= */
  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Project name is required.";
    if (!form.manager) e.manager = "Manager is required.";
    if (!form.lead) e.lead = "Lead is required.";
    if (!form.podLead) e.podLead = "Pod lead is required.";
    if (!form.trainer) e.trainer = "Trainer is required.";
    if (!form.start) e.start = "Start date is required.";

    const today = new Date().toISOString().slice(0, 10);
    if (form.start && toYMD(form.start) > today) e.start = "Start date cannot be in the future.";

    if (form.status === "0") {
      if (!form.end) e.end = "End date is required when inactive.";
      const s = toYMD(form.start), eIso = toYMD(form.end);
      if (s && eIso && eIso < s) e.end = "End date can’t be before start date.";
    }
    return e;
  }, [form]);

  const isValid = Object.keys(errors).length === 0;

  /* =========================
     Sort
     ========================= */
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* =========================
     CRUD
     ========================= */
  const onAddClick = () => {
    setForm({ ...emptyForm, start: todayYMD });
    setMode("add");
    setSubmitted(false);
    setShowModal(true);
  };

  const onEdit = (r) => {
    const inferred = (r.employees_id || "").trim() || (trainerMap[r.trainer] || "").trim() || "";
    setForm({ ...r, employees_id: inferred, end: r.end || null, status: String(r.status ?? "1") });
    setMode("edit");
    setSubmitted(false);
    setShowModal(true);
  };

  const askConfirmDelete = (row) => {
    setConfirm({
      show: true,
      title: "Confirm Delete",
      confirmText: "Delete",
      confirmVariant: "danger",
      body: (
        <div>
          Delete project <strong>{row.name}</strong>
          <div className="text-muted small">ID: {row.id}</div>
          <div className="mt-2 small">This action cannot be undone.</div>
        </div>
      ),
      onConfirm: async () => {
        try {
          await deleteProject(row.id, row.employees_id);
          setRows((prev) => prev.filter((r) => r.id !== row.id));
          setSuccess({ show: true, message: "Project Data is deleted" });
        } catch (err) {
          setErrModal({
            show: true,
            title: "Delete Failed",
            message: firstMsg(err?.response?.data) ||
              (err?.response?.status ? `HTTP ${err.response.status}` : err?.message) ||
              "Failed to delete project",
          });
        } finally {
          setConfirm((c) => ({ ...c, show: false }));
        }
      },
    });
  };

  const onDelete = (id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const eid = (row.employees_id || "").trim() || (trainerMap[row.trainer] || "").trim() || "";
    if (!eid) {
      setErrModal({
        show: true,
        title: "Missing Trainer Mapping",
        message: "Cannot delete this row because the Trainer ID is unavailable. Sync Employees or update the mapping.",
      });
      return;
    }
    askConfirmDelete({ ...row, employees_id: eid });
  };

  const doSave = useCallback(async (modeToRun) => {
    const startISO = toYMD(form.start);
    const endISO = String(form.status) === "0" ? (toYMD(form.end) || todayYMD) : null;

    // Silent backfill for employees_id (hidden in UI)
    const resolvedId =
      (form.employees_id || "").trim() ||
      (form.trainer ? (trainerMap[form.trainer] || "").trim() : "");

    const payload = {
      project_name: form.name,
      gms_manager: form.manager,
      t_manager: form.lead,
      pod_lead: form.podLead,
      trainer_name: form.trainer,
      active_at: startISO,
      inactive_at: endISO,
      status: String(form.status),
      employees_id: resolvedId,
    };

    if (!payload.employees_id) {
      setErrModal({
        show: true,
        title: "Missing Trainer Mapping",
        message:
          "We couldn’t resolve the Trainer ID from the selected Trainer. Please sync the Employees list or pick a mapped Trainer.",
      });
      return;
    }

    try {
      if (modeToRun === "add") {
        const res = await addProject(payload);
        const created = res?.data ?? {};
        const row = {
          id: created.project_id ?? created.id ?? form.id ?? `GMP${Date.now()}`,
          employees_id: created.employees_id ?? payload.employees_id,
          name: created.project_name ?? form.name,
          manager: created.gms_manager ?? form.manager,
          lead: created.t_manager ?? form.lead,
          podLead: created.pod_lead ?? form.podLead,
          trainer: payload.trainer_name,
          start: created.active_at ?? startISO,
          end: created.inactive_at ?? (String(form.status) === "0" ? endISO : null),
          status: String(created.status ?? form.status),
        };
        setRows((prev) => [row, ...prev]);
        setSuccess({ show: true, message: "Project Data is added" });
      } else {
        const res = await updateProject(form.id, payload);
        const updated = res?.data ?? payload;

        setRows((prev) =>
          prev.map((r) =>
            r.id !== form.id
              ? r
              : {
                  ...r,
                  employees_id: updated.employees_id ?? payload.employees_id ?? r.employees_id,
                  name: updated.project_name ?? form.name,
                  manager: updated.gms_manager ?? form.manager,
                  lead: updated.t_manager ?? form.lead,
                  podLead: updated.pod_lead ?? form.podLead,
                  trainer: payload.trainer_name,
                  start: updated.active_at ?? startISO,
                  end: updated.inactive_at ?? (String(form.status) === "0" ? endISO : null),
                  status: String(updated.status ?? form.status),
                }
          )
        );
        setSuccess({ show: true, message: "Project Data is updated" });
      }
      setShowModal(false);
    } catch (err) {
      setErrModal({
        show: true,
        title: "Save Failed",
        message: firstMsg(err?.response?.data) ||
          (err?.response?.status ? `HTTP ${err.response.status}` : err?.message) ||
          "Request failed",
      });
    } finally {
      setConfirm((c) => ({ ...c, show: false }));
    }
  }, [form, todayYMD, trainerMap]);

  const askConfirmSave = (modeToRun) => {
    setSubmitted(true);
    if (!isValid) return;

    const summary = (
      <div>
        <div className="mb-1"><strong>Project:</strong> {form.name}</div>
        <div className="small text-muted">
          <div>GMS Manager: {form.manager || "-"}</div>
          <div>Turing Manager: {form.lead || "-"}</div>
          <div>Pod Lead: {form.podLead || "-"}</div>
          <div>Trainer: {form.trainer || "-"}</div>
          <div>Start: {toYMD(form.start)}</div>
          {String(form.status) === "0" && <div>Inactive (End): {toYMD(form.end)}</div>}
        </div>
      </div>
    );

    setConfirm({
      show: true,
      title: modeToRun === "add" ? "Confirm Add" : "Confirm Update",
      confirmText: modeToRun === "add" ? "Add Project" : "Update Project",
      confirmVariant: "primary",
      body: summary,
      onConfirm: () => doSave(modeToRun),
    });
  };

  const onSubmitClick = (e) => {
    e.preventDefault();
    askConfirmSave(mode);
  };

  /* =========================
     Render
     ========================= */
  if (loading) {
    return (
      <AppLayout>
        <div className="projects-page">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pl-scope px-2 py-2">
        {/* hidden file input (placeholder for future) */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,text/csv"
          className="d-none"
          onChange={(e) => {
            // placeholder: keep behavior consistent with prior UX
            e.target.value = "";
          }}
        />

        {/* actions */}
        <div className="d-flex justify-content-end mb-2 gap-2">
          <button className="btn btn-primary action-btn" title="Import CSV">
            <i className="bi bi-database-up" />
            <span className="label">Import Data</span>
          </button>
          <button className="btn btn-primary action-btn" title="Export CSV">
            <i className="bi bi-database-down" />
            <span className="label">Export Data</span>
          </button>
          <button className="btn btn-primary action-btn" onClick={onAddClick} title="Add Project">
            <i className="bi bi-plus-circle" />
            <span className="label">Add Project</span>
          </button>
        </div>

        <div className="card bg-body-tertiary border-3 rounded-3 shadow">
          <div className="card-header bg-warning-subtle text-warning-emphasis">
            {/* header row */}
            <div className="d-flex align-items-center justify-content-between header-row">
              <div className="d-flex align-items-center gap-3">
                <h5 className="mb-0">Projects</h5>

                {/* Show Inactive toggle (pure state; no data mutation) */}
                <div className="form-check form-switch switch-inline">
                  <input
                    id="plShowInactive"
                    type="checkbox"
                    className="form-check-input"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="plShowInactive">
                    Show inactive
                  </label>
                </div>
              </div>

              {/* Search */}
              <div className="input-group header-search">
                <span className="input-group-text bg-white">
                  <i className="bi bi-search" />
                </span>
                <input
                  className="form-control"
                  placeholder="Search projects by name"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {/* Filters — custom dropdowns (headless) + your original date inputs */}
            <div className="d-flex align-items-center justify-content-end gap-2 mt-2 pl-filter">
              <i className="bi bi-funnel me-1 opacity-75" />

              <CustomDropdown
                label="All GMS Manager"
                value={fManager}
                items={["All GMS Manager", ...managers]}
                onChange={setFManager}
              />
              <CustomDropdown
                label="All Turing Manager"
                value={fLead}
                items={["All Turing Manager", ...leads]}
                onChange={setFLead}
              />
              <CustomDropdown
                label="All Pod Leads"
                value={fPodLead}
                items={["All Pod Leads", ...podLeads]}
                onChange={setFPodLead}
              />
              <CustomDropdown
                label="All Trainers"
                value={fTrainer}
                items={["All Trainers", ...trainers]}
                onChange={setFTrainer}
              />

              {/* date filters – fixed width (30%) via CSS) */}
              <input
                placeholder="From Date"
                type="text"
                className="form-control date-input"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                onFocus={(e) => { e.target.type = "date"; if (from) e.target.value = toYMD(from); }}
                onBlur={(e) => { const picked = e.target.value; e.target.type = "text"; setFrom(picked ? toDMY(picked) : ""); }}
              />
              <input
                placeholder="To Date"
                type="text"
                className="form-control date-input"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                onFocus={(e) => { e.target.type = "date"; if (to) e.target.value = toYMD(to); }}
                onBlur={(e) => { const picked = e.target.value; e.target.type = "text"; setTo(picked ? toDMY(picked) : ""); }}
              />

              <button className="btn btn-outline-secondary d-flex align-items-center" onClick={resetFilters}>
                <i className="bi bi-arrow-counterclockwise me-1" /> Reset
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-responsive bg-warning-subtle text-warning-emphasis rounded shadow">
            <table className="table gm-table table-hover align-middle mb-0 has-actions">
              <thead>
                <tr className="table-light-emphasis">
                  <Th label="ID" k="id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Project Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="GMS Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Turing Manager" k="lead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Pod Lead" k="podLead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Trainer" k="trainer" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Start Date" k="start" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {showInactive && <Th label="End Date" k="end" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />}
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td className="text-muted">{r.id}</td>
                    <td className="fw-semibold">{r.name}</td>
                    <td>{r.manager}</td>
                    <td>{r.lead}</td>
                    <td>{r.podLead}</td>
                    <td>{r.trainer}</td>
                    <td>{toDMY(r.start)}</td>
                    {showInactive && <td>{r.end ? toDMY(r.end) : "-"}</td>}
                    <td className="actions-col">
                      <div className="action-wrap">
                        <button className="btn btn-outline-info btn-sm action-btn" onClick={() => onEdit(r)} title="Edit">
                          <i className="bi bi-pencil-square" />
                          <span className="label">Edit</span>
                        </button>
                        <button className="btn btn-outline-danger btn-sm action-btn" onClick={() => onDelete(r.id)} title="Delete">
                          <i className="bi bi-trash3" />
                          <span className="label">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-muted">
                      {showInactive ? "No inactive projects found." : "No active projects match the filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* pagination footer */}
          <div className="d-flex flex-wrap align-items-center justify-content-between px-3 py-2">
            <div className="text-muted small">
              Showing {filtered.length ? startIdx + 1 : 0}-{endIdx} of {filtered.length}
            </div>
            <PaginationBar page={page} count={pageCount} onChange={setPage} />
          </div>
        </div>

        {/* ==== Add/Edit Modal ==== */}
        {showModal && (
          <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-xl modal-dialog-centered modal-anim-slide">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === "add" ? "Add Project" : "Edit Project"}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close" />
                  </div>

                  <form onSubmit={onSubmitClick} noValidate>
                    <div className="modal-body">
                      <div className="container-fluid">
                        <div className="row g-3">
                          <div className="col-12 col-md-6">
                            <label className="form-label">Project Name <span className="text-danger">*</span></label>
                            <input
                              className={`form-control ${submitted && errors.name ? "is-invalid" : ""}`}
                              placeholder="Enter project name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            {submitted && errors.name && <div className="invalid-feedback">{errors.name}</div>}
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">GMS Manager Name <span className="text-danger">*</span></label>
                            <input
                              list="managersList"
                              className={`form-control ${submitted && errors.manager ? "is-invalid" : ""}`}
                              placeholder="Enter GMS manager name"
                              value={form.manager}
                              onChange={(e) => setForm({ ...form, manager: e.target.value })}
                            />
                            <datalist id="managersList">
                              {managersList.map((name) => <option key={name} value={name} />)}
                            </datalist>
                            {submitted && errors.manager && <div className="invalid-feedback">{errors.manager}</div>}
                          </div>

                          <div className="col-12 col-md-6 col-lg-3">
                            <label className="form-label">Turing Manager Name <span className="text-danger">*</span></label>
                            <input
                              className={`form-control ${submitted && errors.lead ? "is-invalid" : ""}`}
                              placeholder="Enter Turing Manager name"
                              value={form.lead}
                              onChange={(e) => setForm({ ...form, lead: e.target.value })}
                            />
                            {submitted && errors.lead && <div className="invalid-feedback">{errors.lead}</div>}
                          </div>

                          <div className="col-12 col-md-6 col-lg-3">
                            <label className="form-label">Pod Lead Name <span className="text-danger">*</span></label>
                            <input
                              list="podLeadsList"
                              className={`form-control ${submitted && errors.podLead ? "is-invalid" : ""}`}
                              placeholder="Enter Pod Lead name"
                              value={form.podLead}
                              onChange={(e) => setForm({ ...form, podLead: e.target.value })}
                            />
                            <datalist id="podLeadsList">
                              {podLeadsList.map((name) => <option key={name} value={name} />)}
                            </datalist>
                            {submitted && errors.podLead && <div className="invalid-feedback">{errors.podLead}</div>}
                          </div>

                          <div className="col-12 col-md-6 col-lg-6">
                            <label className="form-label">Trainer <span className="text-danger">*</span></label>
                            <SearchableSelect
                              items={trainersList}
                              value={form.trainer}
                              valueMode="value"
                              onChange={(val) =>
                                setForm((f) => ({
                                  ...f,
                                  trainer: val,
                                  employees_id: (trainerMap[val] || f.employees_id || "").trim(),
                                }))
                              }
                              placeholder="Select trainer"
                              className={submitted && errors.trainer ? "is-invalid" : ""}
                            />
                            {submitted && errors.trainer && <div className="invalid-feedback">{errors.trainer}</div>}
                          </div>

                          <div className="col-12 col-md-7">
                            <label className="form-label">Start Date <span className="text-danger">*</span></label>
                            <div className="d-flex align-items-center gap-2">
                              <input
                                type="date"
                                className={`form-control ${submitted && errors.start ? "is-invalid" : ""}`}
                                value={toYMDsafe(form.start) || todayYMD}
                                onChange={(e) => setForm({ ...form, start: e.target.value })}
                                max={todayYMD}
                              />
                              {mode === "edit" && (
                                <div className="form-check ms-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="inactiveChk"
                                    checked={form.status === "0"}
                                    onChange={(e) => {
                                      const nowYMD = new Date().toISOString().slice(0, 10);
                                      const inactive = e.target.checked;
                                      setForm((f) => ({
                                        ...f,
                                        status: inactive ? "0" : "1",
                                        end: inactive ? f.end || nowYMD : null,
                                      }));
                                    }}
                                  />
                                  <label className="form-check-label" htmlFor="inactiveChk">Inactive</label>
                                </div>
                              )}
                            </div>
                            {submitted && errors.start && <div className="invalid-feedback">{errors.start}</div>}
                          </div>

                          <div className="col-12 col-md-5">
                            {mode === "edit" && form.status !== "1" && (
                              <div>
                                <label className="form-label">Inactive Date</label>
                                <input
                                  type="date"
                                  className={`form-control ${submitted && errors.end ? "is-invalid" : ""}`}
                                  value={toYMDsafe(form.end)}
                                  onChange={(e) => setForm({ ...form, end: e.target.value, status: "0" })}
                                  min={toYMDsafe(form.start) || todayYMD}
                                />
                                {submitted && errors.end && <div className="invalid-feedback">{errors.end}</div>}
                                <div className="form-text">Set the end date when marking inactive.</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button type="submit" className="btn btn-primary">Save</button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowModal(false)}>Close</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
            <div className="modal-backdrop fade show"></div>
          </>
        )}

        {/* Confirm */}
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

        {/* Success */}
        <SuccessModal
          show={success.show}
          message={success.message}
          onHide={() => setSuccess({ show: false, message: "" })}
        />

        {/* Error */}
        <ErrorModal
          show={errModal.show}
          title={errModal.title}
          message={errModal.message}
          onHide={() => setErrModal({ show: false, title: "Error", message: "" })}
        />
      </div>
    </AppLayout>
  );
}

/* =========================================================================
   Sortable header cell
   ========================================================================= */
function Th({ label, k, sortKey, sortDir, onSort }) {
  const active = sortKey === k;
  const icon = active
    ? sortDir === "asc"
      ? "bi-arrow-up text-primary"
      : "bi-arrow-down text-primary"
    : "bi-arrow-down-up";
  return (
    <th className={`sortable ${active ? "active" : ""}`}>
      <button type="button" className="sort-btn" onClick={() => onSort(k)} title={`Sort by ${label}`}>
        {label} <i className={`bi ${icon} sort-icon`} />
      </button>
    </th>
  );
}

/* =========================================================================
   Headless Custom Dropdown (preserves your .dropdown / .dropdown-menu styling)
   - Scroll-safe: does NOT close when scrolling items
   - Closes on outside click / ESC / resize
   ========================================================================= */
function CustomDropdown({
  label,
  value,
  items = [],
  onChange,
  className = "",
  menuClassName = "",
  itemClassName = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const listId = useId();

  // Outside click / ESC / resize
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e) => {
      if (!btnRef.current || !menuRef.current) return;
      const insideBtn = btnRef.current.contains(e.target);
      const insideMenu = menuRef.current.contains(e.target);
      if (!insideBtn && !insideMenu) setOpen(false);
    };

    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const handleResize = () => setOpen(false);

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("resize", handleResize);

    // NOTE: no global scroll/wheel/touch listeners => the menu stays open while scrolling
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  // Prevent scroll bubbling that might trigger parent reflows
  useEffect(() => {
    if (!open || !menuRef.current) return;
    const stop = (e) => e.stopPropagation();
    const el = menuRef.current;
    el.addEventListener("wheel", stop, { passive: true });
    el.addEventListener("touchmove", stop, { passive: true });
    return () => {
      el.removeEventListener("wheel", stop);
      el.removeEventListener("touchmove", stop);
    };
  }, [open]);

  // Keyboard toggle
  const onKeyDown = (e) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((o) => !o);
    }
  };

  const select = (val) => {
    onChange?.(val);
    setOpen(false);
    queueMicrotask(() => btnRef.current?.focus());
  };

  const currentLabel = value || label;

  return (
    <div className="dropdown filter-select position-relative">
      <button
        ref={btnRef}
        type="button"
        className={`btn btn-light dropdown-toggle ${className}`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        {currentLabel}
      </button>

      {open && (
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          className={`dropdown-menu show ${menuClassName}`}
          style={{ minWidth: "max-content", maxHeight: 300, overflow: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => {
            const active = it === value;
            return (
              <li key={it}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`dropdown-item ${itemClassName} ${active ? "active" : ""}`}
                  onClick={() => select(it)}
                >
                  {it}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
