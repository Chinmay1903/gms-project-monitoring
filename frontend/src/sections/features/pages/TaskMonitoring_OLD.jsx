import React, { useMemo, useState, useEffect, useRef } from "react";
import AppLayout from "../components/AppLayout";
import "./TaskMonitoring.css";

import {
  getTasks,
  getEmployeeNames,
  getProjects,
  addTask,
  updateTask,
  firstMsg,
} from "../../../api/features";

import SearchableSelect from "../components/SearchableSelect";
import ConfirmModal from "../components/ConfirmModal";
import SuccessModal from "../components/SuccessModal";
import ErrorModal from "../components/ErrorModal";
import PaginationBar from "../components/PaginationBar";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend,
} from "recharts";

/* ---------- helpers ---------- */
const Th = ({ label, k, sortKey, sortDir, onSort }) => {
  const active = sortKey === k;
  const icon = active
    ? sortDir === "asc"
      ? "bi-arrow-up text-primary"
      : "bi-arrow-down text-primary"
    : "bi bi-arrow-down-up";
  return (
    <th className={`sortable ${active ? "active" : ""} ${sortDir}`}>
      <button type="button" className="sort-btn" onClick={() => onSort(k)} title={`Sort by ${label}`}>
        {label} <i className={`bi ${icon} sort-icon`} />
      </button>
    </th>
  );
};

const toYMD = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : (d || ""));
const today = toYMD(new Date());

/* very small CSV helpers */
const toCsv = (rows) => {
  if (!rows?.length) return "id,date,trainerId,trainer,project_id,project,manager,lead,podLead,hours,inProgress,taskCompleted,reworked,approved,rejected,reviewed\n";
  const cols = [
    "id", "date", "trainerId", "trainer", "project_id", "project", "manager", "lead", "podLead",
    "hours", "inProgress", "taskCompleted", "reworked", "approved", "rejected", "reviewed",
  ];
  const header = cols.join(",");
  const lines = rows.map((r) =>
    cols.map((c) => {
      const v = r[c] ?? "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(",")
  );
  return [header, ...lines].join("\n");
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

export default function TaskMonitoring() {
  /* ---------- state ---------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  const [trainers, setTrainers] = useState([]); // employees
  const [projects, setProjects] = useState([]); // projects

  const [range, setRange] = useState("day"); // day | week | month | overall
  const [view, setView] = useState({ type: "overview" }); // or {type: "trainer", trainerId, name}
  const detailAnchorRef = useRef(null);

  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const ROWS_PER_PAGE = 10;
  const [page, setPage] = useState(1);

  // confirm / success / error
  const [confirm, setConfirm] = useState({
    show: false, title: "", body: null,
    confirmText: "Confirm", confirmVariant: "primary", onConfirm: null,
  });
  const [success, setSuccess] = useState({ show: false, message: "" });
  const [errModal, setErrModal] = useState({ show: false, message: "" });

  // modal form
  const emptyForm = {
    id: 0,
    date: today,
    trainerId: "", trainer: "",
    project_id: "", project: "",
    manager: "", lead: "", podLead: "",
    hours: "", overtime: false,
    taskCompleted: 0, reworked: 0, inProgress: 0,
    approved: 0, rejected: 0, reviewed: 0,
  };
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  // file input (Import)
  const fileInputRef = useRef(null);

  /* ---------- load ---------- */
  const fetchAll = async () => {
    setLoading(true);
    setErrorBanner(null);

    const [tasksRes, namesRes, projsRes] = await Promise.allSettled([
      getTasks(),
      getEmployeeNames(),
      getProjects(),
    ]);

    // tasks
    let taskData = [];
    if (tasksRes.status === "fulfilled" && Array.isArray(tasksRes.value?.data)) {
      taskData = tasksRes.value.data.map((t) => ({
        id: Number(t.task_id || 0),
        date: t.task_date || t.date || today,
        trainerId: t.employees_id || "",
        trainer: t.first_name && t.last_name
          ? `${t.first_name} ${t.last_name}`.trim()
          : (t.trainer_name || ""),
        project_id: String(t.project_id || ""),
        project: t.project_name || "",
        manager: t.gms_manager || t.manager || "",
        lead: t.t_manager || t.lead || t.lead_name || "",
        podLead: t.pod_lead || t.pod_name || "",
        hours: Number(t.hours_logged || 0),
        inProgress: Number(t.task_inprogress || 0),
        taskCompleted: Number(t.task_completed || 0),
        reworked: Number(t.task_reworked || t.reworked || 0),
        approved: Number(t.task_approved || 0),
        rejected: Number(t.task_rejected || t.rejected || 0),
        reviewed: Number(t.task_reviewed || t.reviewed || 0),
      }));
    } else if (tasksRes.status === "rejected") {
      const p = tasksRes.reason?.response?.data;
      const msg =
        (Array.isArray(p?.detail) && p.detail[0]?.msg) ||
        p?.detail || p?.msg ||
        tasksRes.reason?.message ||
        "Failed to fetch tasks";
      setErrorBanner(msg);
    }

    // employees
    let names = [];
    if (namesRes.status === "fulfilled" && Array.isArray(namesRes.value?.data)) {
      names = namesRes.value.data;
    }

    // projects
    let projs = [];
    if (projsRes.status === "fulfilled" && Array.isArray(projsRes.value?.data)) {
      projs = projsRes.value.data.map((p) => ({
        project_id: String(p.project_id ?? p.id ?? ""),
        project_name: p.project_name ?? p.name ?? "",
        gms_manager: p.gms_manager ?? p.manager ?? "",
        t_manager: p.t_manager ?? p.lead_name ?? p.lead ?? "",
        pod_lead: p.pod_lead ?? p.pod_name ?? "",
      }));
    }

    setRows(taskData);
    setTrainers(names);
    setProjects(projs);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  /* ---------- range helpers ---------- */
  const anchor = today;
  const isInRange = (ymd) => {
    if (range === "overall") return true;
    const d = new Date(ymd + "T00:00:00");
    const a = new Date(anchor + "T00:00:00");
    if (range === "day") return d.getTime() === a.getTime();
    if (range === "week") {
      const w = new Date(a); w.setDate(a.getDate() - 6);
      return d >= w && d <= a;
    }
    if (range === "month") return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
    return true;
  };

  /* ---------- validation ---------- */
  const hoursNum = Number(form.hours || 0);
  const numOk = (v) => v === "" || /^[0-9]+$/.test(String(v));
  const errors = useMemo(() => {
    const e = {};
    if (!form.trainerId) e.trainerId = "Trainer is required.";
    if (!form.project_id) e.project = "Project is required.";
    if (!form.date) e.date = "Date is required.";
    if (form.date && form.date > today) e.date = "Date cannot be in the future.";
    if (form.hours === "" || isNaN(hoursNum)) e.hours = "Hours are required.";
    else if (!form.overtime && hoursNum > 8) e.hours = "Max 8 hrs unless Overtime is checked.";
    if (!numOk(form.inProgress)) e.inProgress = "Digits only.";
    if (!numOk(form.taskCompleted)) e.taskCompleted = "Digits only.";
    if (!numOk(form.reworked)) e.reworked = "Digits only.";
    if (!numOk(form.approved)) e.approved = "Digits only.";
    if (!numOk(form.rejected)) e.rejected = "Digits only.";
    if (!numOk(form.reviewed)) e.reviewed = "Digits only.";
    return e;
  }, [form, hoursNum]);

  /* ---------- derived rows + pagination ---------- */
  const baseRows = useMemo(() => {
    let d = rows.filter((r) => isInRange(r.date));
    if (view.type === "trainer") d = d.filter((r) => r.trainerId === view.trainerId);
    d.sort((a, b) => {
      const A = (a[sortKey] ?? "").toString().toLowerCase();
      const B = (b[sortKey] ?? "").toString().toLowerCase();
      const cmp = A < B ? -1 : A > B ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [rows, view, range, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(baseRows.length / 10));
  const startIdx = (page - 1) * 10;
  const endIdx = Math.min(startIdx + 10, baseRows.length);
  const pageRows = useMemo(() => baseRows.slice(startIdx, endIdx), [baseRows, startIdx, endIdx]);

  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => { setPage(1); }, [range, view]);

  /* ---------- handlers ---------- */
  const onAdd = () => {
    setMode("add");
    setForm(emptyForm);
    setSubmitted(false);
    setShowModal(true);
  };

  const onEdit = (r) => {
    setMode("edit");
    setForm({
      ...emptyForm,
      ...r,
      project_id: String(r.project_id || ""),
    });
    setSubmitted(false);
    setShowModal(true);
  };

  const onTrainerChange = (trainerId) => {
    const t = trainers.find((x) => String(x.employees_id) === String(trainerId));
    setForm((f) => ({
      ...f,
      trainerId,
      trainer: t ? t.full_name : "",
      project_id: "",
      project: "",
      manager: "",
      lead: "",
      podLead: "",
    }));
  };

  const onProjectChange = (projectId) => {
    const p = projects.find((x) => String(x.project_id) === String(projectId));
    setForm((f) => ({
      ...f,
      project_id: projectId,
      project: p?.project_name || "",
      manager: p?.gms_manager || "",
      lead: p?.t_manager || "",
      podLead: p?.pod_lead || "",
    }));
  };

  const askConfirmSave = () => {
    setSubmitted(true);
    if (Object.keys(errors).length) return;

    const summary = (
      <div>
        <div className="mb-1"><strong>Trainer:</strong> {form.trainer} <span className="text-muted">({form.trainerId})</span></div>
        <div className="small text-muted">
          <div>Project: {form.project || "-"}</div>
          <div>Manager: {form.manager || "-"}</div>
          <div>Lead: {form.lead || "-"}</div>
          <div>Pod Lead: {form.podLead || "-"}</div>
          <div>Date: {form.date}</div>
          <div>Hours: {form.hours}{form.overtime ? " (OT)" : ""}</div>
        </div>
        <div className="mt-2 small">
          {mode === "add" ? "Please confirm you want to add this entry." : "Please confirm you want to update this entry."}
        </div>
      </div>
    );

    setConfirm({
      show: true,
      title: mode === "add" ? "Confirm Add" : "Confirm Update",
      confirmText: mode === "add" ? "Add Entry" : "Update Entry",
      confirmVariant: "primary",
      body: summary,
      onConfirm: doSave,
    });
  };

  const doSave = async () => {
    const payload = {
      employees_id: form.trainerId,
      project_id: form.project_id ? Number(form.project_id) : 0,
      task_date: form.date || today,
      task_completed: Number(form.taskCompleted || 0),
      task_inprogress: Number(form.inProgress || 0),
      task_reworked: Number(form.reworked || 0),
      task_approved: Number(form.approved || 0),
      task_rejected: Number(form.rejected || 0),
      task_reviewed: Number(form.reviewed || 0),
      hours_logged: String(Number(form.hours || 0)),
    };

    try {
      if (mode === "add") {
        const res = await addTask(payload);
        const created = res?.data ?? {};
        const row = {
          id: Number(created.task_id || Date.now()),
          date: created.task_date || created.date || payload.task_date,
          trainerId: created.employees_id || payload.employees_id,
          trainer: created.first_name || created.trainer_name || form.trainer,
          project_id: String(created.project_id || payload.project_id),
          project: created.project_name || form.project,
          manager: created.manager || created.gms_manager || form.manager,
          lead: created.lead || created.t_manager || form.lead,
          podLead: created.pod_lead || form.podLead,
          hours: Number(created.hours_logged ?? payload.hours_logged),
          inProgress: Number(created.task_inprogress ?? payload.task_inprogress),
          taskCompleted: Number(created.task_completed ?? payload.task_completed),
          reworked: Number(created.task_reworked ?? payload.task_reworked),
          approved: Number(created.task_approved ?? payload.task_approved),
          rejected: Number(created.task_rejected ?? payload.task_rejected),
          reviewed: Number(created.task_reviewed ?? payload.task_reviewed),
        };
        setRows((prev) => [row, ...prev]);
        setSuccess({ show: true, message: "Task entry added" });
      } else {
        const res = await updateTask(form.id, payload);
        const updated = res?.data ?? payload;
        setRows((prev) =>
          prev.map((r) =>
            r.id === form.id
              ? {
                ...r,
                date: updated.task_date || updated.date || payload.task_date,
                trainerId: updated.employees_id || payload.employees_id,
                trainer: updated.first_name || updated.trainer_name || form.trainer,
                project_id: String(updated.project_id || payload.project_id),
                project: updated.project_name || form.project,
                manager: updated.manager || updated.gms_manager || form.manager,
                lead: updated.lead || updated.t_manager || form.lead,
                podLead: updated.pod_lead || form.podLead,
                hours: Number(updated.hours_logged ?? payload.hours_logged),
                inProgress: Number(updated.task_inprogress ?? payload.task_inprogress),
                taskCompleted: Number(updated.task_completed ?? payload.task_completed),
                reworked: Number(updated.task_reworked ?? payload.task_reworked),
                approved: Number(updated.task_approved ?? payload.task_approved),
                rejected: Number(updated.task_rejected ?? payload.task_rejected),
                reviewed: Number(updated.task_reviewed ?? payload.task_reviewed),
              }
              : r
          )
        );
        setSuccess({ show: true, message: "Task entry updated" });
      }
      setShowModal(false);
    } catch (err) {
      const msg =
        firstMsg(err?.response?.data) ||
        (err?.response?.status ? `HTTP ${err.response.status}` : null) ||
        err?.message ||
        "Failed to save task";
      setErrModal({ show: true, message: msg });
    } finally {
      setConfirm((c) => ({ ...c, show: false }));
    }
  };

  const onDelete = (id) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setConfirm({
      show: true,
      title: "Confirm Delete",
      confirmText: "Delete",
      confirmVariant: "danger",
      body: (
        <div>
          Delete entry <strong>#{row.id}</strong> for <strong>{row.trainer}</strong> on <strong>{row.date}</strong>?
        </div>
      ),
      onConfirm: async () => {
        try {
          // No delete endpoint provided for tasks -> remove locally
          setRows((prev) => prev.filter((r) => r.id !== row.id));
          setSuccess({ show: true, message: "Task entry deleted" });
        } catch (err) {
          const msg =
            firstMsg(err?.response?.data) ||
            (err?.response?.status ? `HTTP ${err.response.status}` : null) ||
            err?.message ||
            "Failed to delete entry";
          setErrModal({ show: true, message: msg });
        } finally {
          setConfirm((c) => ({ ...c, show: false }));
        }
      },
    });
  };

  /* ---------- export / import / refresh ---------- */
  const handleExport = () => {
    const csv = toCsv(baseRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${view.type === "trainer" ? view.trainerId + "_" : ""}${range}_${today}.csv`;
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
      const mapped = rowsCsv.map((r, i) => ({
        id: Number(r.id || Date.now() + i),
        date: r.date || today,
        trainerId: r.trainerId || "",
        trainer: r.trainer || "",
        project_id: String(r.project_id || ""),
        project: r.project || "",
        manager: r.manager || "",
        lead: r.lead || "",
        podLead: r.podLead || "",
        hours: Number(r.hours || 0),
        inProgress: Number(r.inProgress || 0),
        taskCompleted: Number(r.taskCompleted || 0),
        reworked: Number(r.reworked || 0),
        approved: Number(r.approved || 0),
        rejected: Number(r.rejected || 0),
        reviewed: Number(r.reviewed || 0),
      }));

      setConfirm({
        show: true,
        title: "Confirm Import",
        confirmText: "Import",
        confirmVariant: "primary",
        body: <div>Import <strong>{mapped.length}</strong> rows into the table? (No API calls will be made.)</div>,
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

  /* ---------- click ID -> focus trainer detail ---------- */
  const goToTrainerDetail = (trainerId, name) => {
    setView({ type: "trainer", trainerId, name });
    setTimeout(() => {
      const el = detailAnchorRef.current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  /* ---------- aggregates for charts ---------- */
  const agg = useMemo(() => {
    const total = pageRows.reduce(
      (acc, r) => {
        acc.taskCompleted += Number(r.taskCompleted || 0);
        acc.reworked += Number(r.reworked || 0);
        acc.inProgress += Number(r.inProgress || 0);
        acc.approved += Number(r.approved || 0);
        acc.rejected += Number(r.rejected || 0);
        acc.reviewed += Number(r.reviewed || 0);
        return acc;
      },
      { taskCompleted: 0, reworked: 0, inProgress: 0, approved: 0, rejected: 0, reviewed: 0 }
    );

    const map = {};
    baseRows.forEach((r) => { map[r.date] = (map[r.date] || 0) + Number(r.hours || 0); });
    const days = Object.keys(map).sort();
    const hoursSeries = days.map((d) => ({
      date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      hours: map[d],
    }));
    return { total, hoursSeries };
  }, [baseRows, pageRows]);

  /* ---------- content ---------- */
  let content;
  if (loading) {
    content = (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  } else if (errorBanner) {
    content = <div className="alert alert-danger my-4">{errorBanner}</div>;
  } else {
    content = (
      <>
        {/* actions (now Resource parity styling) */}
        <div className="tasks-actions d-flex justify-content-end mb-2 gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            className="d-none"
            onChange={handleImportFile}
          />
          <button className="btn btn-primary action-btn" title="Import CSV" onClick={handleImportClick}>
            <i className="bi bi-database-up" />
            <span className="label">Import</span>
          </button>
          <button className="btn btn-primary action-btn" title="Export CSV" onClick={handleExport}>
            <i className="bi bi-database-down" />
            <span className="label">Export</span>
          </button>
          <button className="btn btn-primary action-btn" onClick={onAdd} title="Add Task">
            <i className="bi bi-plus-circle" />
            <span className="label">Add</span>
          </button>
        </div>
        
        {/* Card */}
        <div className="tasks-card card bg-body-tertiary border-3 rounded-3 shadow">
          <div className={`card-header bg-warning-subtle text-warning-emphasis tasks-toolbar ${view.type === "trainer" ? "has-back" : ""}`}>
            <div className="d-flex align-items-center gap-2 flex-wrap pb-2">
              {view.type === "trainer" && (
                <button
                  className="btn btn-outline-dark btn-sm action-btn btn-back"
                  onClick={() => setView({ type: "overview" })}
                  title="Back"
                >
                  <i className="bi bi-arrow-left" />
                  <span className="label">Back</span>
                </button>
              )}
              <div className="title">
                {view.type === "trainer" ? (
                  <>Trainer: <span className="fw-semibold">{view.name}</span> <span className="text-muted">({view.trainerId})</span></>
                ) : (
                  <>Task Tracking</>
                )}
              </div>

              <div className="btn-group ms-2" role="group" aria-label="range">
                {["day", "week", "month", "overall"].map((r) => (
                  <button
                    key={r}
                    className={"btn btn-outline-secondary btn-sm " + (range === r ? "active" : "")}
                    onClick={() => setRange(r)}
                    type="button"
                  >
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <div className="hint small text-muted">Track totals per trainer (hours & status). Day shows only today's entries.</div>
            </div>
          </div>

          {/* table */}
          < div className="table-responsive" >
            <table className="table table-hover tasks-table">
              <thead className="text-center">
                <tr>
                  <Th label="ID" k="id" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Trainer (ID)" k="trainer" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Project" k="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Lead" k="lead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Pod Lead" k="podLead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Hours" k="hours" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="In Progress" k="inProgress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Task Completed" k="taskCompleted" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reworked" k="reworked" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Approved" k="approved" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Rejected" k="rejected" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reviewed" k="reviewed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th style={{ width: 180 }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    {/* ID — hyperlink removed per requirement */}
                    <td className="text-muted">#{r.id}</td>
                    <td>{r.date}</td>
                    <td>
                      {view.type !== "trainer" ? (
                        <a
                          href="#trainer-detail"
                          className="name-link"
                          onClick={(e) => { e.preventDefault(); goToTrainerDetail(r.trainerId, r.trainer); }}
                        >
                          {r.trainer}
                        </a>
                      ) : (
                        <span className="text-body">{r.trainer}</span>
                      )}{" "}
                      <span className="text-muted">({r.trainerId})</span>
                    </td>

                    <td>{r.project}</td>
                    <td>{r.manager}</td>
                    <td>{r.lead}</td>
                    <td>{r.podLead}</td>
                    <td>{r.hours}</td>
                    <td className="text-primary fw-semibold">{r.inProgress}</td>
                    <td className="text-warning fw-semibold">{r.taskCompleted}</td>
                    <td className="text-danger fw-semibold">{r.reworked}</td>
                    <td className="text-success fw-semibold">{r.approved}</td>
                    <td className="text-secondary fw-semibold">{r.rejected}</td>
                    <td className="text-warning fw-semibold">{r.reviewed}</td>
                    <td className="actions-col">
                      <div className="action-wrap" role="group" aria-label="Actions">
                        <button className="btn btn-outline-secondary btn-sm action-btn" onClick={() => onEdit(r)} title="Edit">
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
                    <td colSpan={14} className="text-center py-4 text-muted">No entries for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div >

          {/* pagination */}
          < div className="d-flex flex-wrap align-items-center justify-content-between px-3 py-2" >
            <div className="text-muted small">Showing {baseRows.length ? startIdx + 1 : 0}-{endIdx} of {baseRows.length}</div>
            <PaginationBar page={page} count={pageCount} onChange={setPage} />
          </div >
        </div >

        {/* "iframe" detail anchor */}
        < div id="trainer-detail" ref={detailAnchorRef} className="mt-3" />

        {/* charts (detail) */}
        {
          view.type === "trainer" && (
            <div className="row g-2 mt-2">
              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header">
                    <h6 className="mb-0"># of Tasks by Status — {range[0].toUpperCase() + range.slice(1)}</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart
                          data={[
                            { status: "Task Completed", count: agg.total.taskCompleted },
                            { status: "Reworked", count: agg.total.reworked },
                            { status: "In Progress", count: agg.total.inProgress },
                            { status: "Approved", count: agg.total.approved },
                            { status: "Rejected", count: agg.total.rejected },
                            { status: "Reviewed", count: agg.total.reviewed },
                          ]}
                        >
                          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                          <XAxis dataKey="status" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="count" fill="#3b81d6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="card shadow-sm h-100">
                  <div className="card-header">
                    <h6 className="mb-0">{range[0].toUpperCase() + range.slice(1)} Hours — {view.name}</h6>
                  </div>
                  <div className="card-body">
                    <div style={{ width: "100%", height: 260 }}>
                      <ResponsiveContainer>
                        {(agg.hoursSeries || []).length === 1 ? (
                          <BarChart data={agg.hoursSeries}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="hours" fill="#3b81d6" radius={[6, 6, 0, 0]} maxBarSize={109} />
                          </BarChart>
                        ) : (
                          <LineChart data={agg.hoursSeries}>
                            <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="hours" stroke="#3b81d6" strokeWidth={2} dot />
                          </LineChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        }

        {/* add/edit modal */}
        {
          showModal && (
            <>
              <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
                <div className="modal-dialog modal-xl modal-dialog-centered modal-anim-slide">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">{mode === "add" ? "Add Task Entry" : "Edit Task Entry"}</h5>
                      <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close" />
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); askConfirmSave(); }} noValidate>
                      <div className="modal-body">
                        <div className="container-fluid">
                          <div className="row g-3">
                            <div className="col-12 col-md-6">
                              <label className="form-label">Resourse Name <span className="text-danger">*</span></label>
                              <SearchableSelect
                                items={Array.isArray(trainers) ? trainers : []}
                                valueMode="value"
                                valueField="employees_id"
                                value={form.trainerId}
                                onChange={(value) => onTrainerChange(value || "")}
                                keyField="employees_id"
                                labelField="full_name"
                                className={`${submitted && errors.trainerId ? "is-invalid" : ""}`}
                                placeholder="Select Resourse"
                                disabled={mode === "edit"}
                              />
                              {submitted && errors.trainerId && <div className="invalid-feedback">{errors.trainerId}</div>}
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">ID <span className="text-danger">*</span></label>
                              <input className="form-control" value={form.trainerId} disabled />
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Project Name <span className="text-danger">*</span></label>
                              <select
                                className={`form-select ${submitted && errors.project ? "is-invalid" : ""}`}
                                value={form.project_id}
                                onChange={(e) => onProjectChange(e.target.value)}
                                disabled={!form.trainerId || mode === "edit"}
                              >
                                <option value="">{!form.trainerId ? "Select trainer first" : "Select project"}</option>
                                {projects.map((p) => (
                                  <option key={p.project_id} value={p.project_id}>{p.project_name}</option>
                                ))}
                              </select>
                              {submitted && errors.project && <div className="invalid-feedback">{errors.project}</div>}
                              <div className="form-text">Pick a project; manager/lead/pod fill automatically.</div>
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Manager <span className="text-danger">*</span></label>
                              <input className="form-control bg-light" value={form.manager} disabled />
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Lead <span className="text-danger">*</span></label>
                              <input className="form-control bg-light" value={form.lead} disabled />
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Pod Lead <span className="text-danger">*</span></label>
                              <input className="form-control bg-light" value={form.podLead} disabled />
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Date <span className="text-danger">*</span></label>
                              <input
                                type="date"
                                className={`form-control ${submitted && errors.date ? "is-invalid" : ""}`}
                                value={form.date}
                                max={today}
                                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                              />
                              {submitted && errors.date && <div className="invalid-feedback">{errors.date}</div>}
                            </div>

                            <div className="col-12 col-md-6">
                              <label className="form-label">Hours Worked <span className="text-danger">*</span></label>
                              <div className="d-flex align-items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={form.overtime ? "24" : "8"}
                                  className={`form-control ${submitted && errors.hours ? "is-invalid" : ""}`}
                                  value={form.hours}
                                  onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                                  placeholder={"e.g. 0 to " + (form.overtime ? "24" : "8")}
                                />
                                <div className="form-check ms-2">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="chkOt"
                                    checked={form.overtime}
                                    onChange={(e) => setForm((f) => ({ ...f, overtime: e.target.checked }))}
                                  />
                                  <label className="form-check-label" htmlFor="chkOt">Overtime</label>
                                </div>
                              </div>
                              {submitted && errors.hours && <div className="invalid-feedback d-block">{errors.hours}</div>}
                              <div className="form-text">Max 8 hrs (unlimited when Overtime is checked).</div>
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-info">In Progress</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.inProgress ? "is-invalid" : ""}`}
                                value={form.inProgress}
                                onChange={(e) => setForm((f) => ({ ...f, inProgress: e.target.value }))}
                              />
                              {submitted && errors.inProgress && <div className="invalid-feedback">{errors.inProgress}</div>}
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-primary">Tasks Completed</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.taskCompleted ? "is-invalid" : ""}`}
                                value={form.taskCompleted}
                                onChange={(e) => setForm((f) => ({ ...f, taskCompleted: e.target.value }))}
                              />
                              {submitted && errors.taskCompleted && <div className="invalid-feedback">{errors.taskCompleted}</div>}
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-danger">Reworked</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.reworked ? "is-invalid" : ""}`}
                                value={form.reworked}
                                onChange={(e) => setForm((f) => ({ ...f, reworked: e.target.value }))}
                              />
                              {submitted && errors.reworked && <div className="invalid-feedback">{errors.reworked}</div>}
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-success">Approved</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.approved ? "is-invalid" : ""}`}
                                value={form.approved}
                                onChange={(e) => setForm((f) => ({ ...f, approved: e.target.value }))}
                              />
                              {submitted && errors.approved && <div className="invalid-feedback">{errors.approved}</div>}
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-secondary">Rejected</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.rejected ? "is-invalid" : ""}`}
                                value={form.rejected}
                                onChange={(e) => setForm((f) => ({ ...f, rejected: e.target.value }))}
                              />
                              {submitted && errors.rejected && <div className="invalid-feedback">{errors.rejected}</div>}
                            </div>

                            <div className="col-12 col-md-4">
                              <label className="form-label text-primary">Reviewed</label>
                              <input
                                type="number"
                                className={`form-control ${submitted && errors.reviewed ? "is-invalid" : ""}`}
                                value={form.reviewed}
                                onChange={(e) => setForm((f) => ({ ...f, reviewed: e.target.value }))}
                              />
                              {submitted && errors.reviewed && <div className="invalid-feedback">{errors.reviewed}</div>}
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
          )
        }
      </>
    );
  }

  /* ---------- render ---------- */
  return (
    <AppLayout>
      <div className="tasks-page">
        {content}

        {/* confirm / success / error */}
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
