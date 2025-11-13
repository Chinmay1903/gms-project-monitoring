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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  PieChart, Pie, Cell,
} from "recharts";

/* =================== Helpers & Utilities =================== */
const pad2 = (n) => String(n).padStart(2, "0");
const toLocalYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const TODAY = toLocalYMD(new Date());

const isActiveFlag = (o) => {
  const st = o?.status ?? o?.is_active ?? 1;
  return String(st) !== "0" && st !== 0 && st !== false;
};

const monthKey = (ymd) => ymd.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
};

const toWeekday = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
const toMonShort = (d) => d.toLocaleDateString("en-US", { month: "short" });

/* Export / Import CSV */
const toCsv = (rows) => {
  const cols = [
    "id", "date", "trainerId", "trainer", "project_id", "project", "manager", "lead", "podLead",
    "hours", "inProgress", "taskCompleted", "reworked", "approved", "rejected", "reviewed"
  ];
  if (!rows?.length) return cols.join(",") + "\n";
  const head = cols.join(",");
  const lines = rows.map((r) =>
    cols
      .map((c) => {
        const v = r[c] ?? "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      })
      .join(",")
  );
  return [head, ...lines].join("\n");
};

const parseCsv = (file) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error("Failed to read CSV"));
    fr.onload = () => {
      const text = String(fr.result || "");
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
    fr.readAsText(file);
  });

/* Small sortable th */
const Th = ({ label, k, sortKey, sortDir, onSort }) => {
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
};

const compactTick = (value) => {
  const parts = String(value).split(" ");
  return parts.length >= 3 ? `${parts[1]} ${parts[2]}` : value;
};

// Round up to a "nice" number (1, 2, 5, 10 × 10^k)
const niceCeil = (x) => {
  if (!Number.isFinite(x) || x <= 0) return 1;
  const e = Math.floor(Math.log10(x));
  const base = Math.pow(10, e);
  const candidates = [1, 2, 5, 10].map((m) => m * base);
  for (const c of candidates) if (x <= c) return c;
  return 10 * base;
};


/* =================== Component =================== */
export default function TaskMonitoring() {
  /* ---------- datasets ---------- */
  const [rows, setRows] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorBanner, setErrorBanner] = useState(null);

  /* ---------- view controls ---------- */
  const [range, setRange] = useState("day"); // day | week | month | overall
  const [view, setView] = useState({ type: "overview" }); // or { type:"trainer", trainerId, name }
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  // ALIGNMENT: hard cap visible rows
  const PAGE_OVERVIEW = 10;
  const PAGE_TRAINER = 4;
  const [page, setPage] = useState(1);

  const toggleSort = (k) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  /* ---------- modals & feedback ---------- */
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

  /* ---------- add/edit modal ---------- */
  const emptyForm = {
    id: 0,
    date: TODAY,
    trainerId: "",
    trainer: "",
    project_id: "",
    project: "",
    manager: "",
    lead: "",
    podLead: "",
    hours: "",
    overtime: false,
    taskCompleted: 0,
    reworked: 0,
    inProgress: 0,
    approved: 0,
    rejected: 0,
    reviewed: 0,
  };
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add");
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  /* ---------- file input for import ---------- */
  const fileInputRef = useRef(null);

  /* ========== Load data ========== */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorBanner(null);
      try {
        const [tasksRes, namesRes, projsRes] = await Promise.all([
          getTasks(),
          getEmployeeNames(),
          getProjects(),
        ]);

        const names = Array.isArray(namesRes?.data) ? namesRes.data : [];
        const nameById = {};
        names.forEach((n) => {
          const id = String(n.employees_id ?? n.employee_id ?? "");
          const full = n.full_name ?? [n.first_name, n.last_name].filter(Boolean).join(" ");
          if (id) nameById[id] = full || id;
        });
        setTrainers(names);

        const projs = Array.isArray(projsRes?.data)
          ? projsRes.data.map((p) => ({
            project_id: String(p.project_id ?? p.id ?? ""),
            project_name: p.project_name ?? p.name ?? "",
            gms_manager: p.gms_manager ?? p.manager ?? "",
            t_manager: p.t_manager ?? p.lead ?? p.lead_name ?? "",
            pod_lead: p.pod_lead ?? p.pod_name ?? "",
            employees_id: String(p.employees_id ?? ""),
            status: String(p.status ?? "1"),
          }))
          : [];
        setProjects(projs);

        const tasks = Array.isArray(tasksRes?.data)
          ? tasksRes.data.map((t) => ({
            id: Number(t.task_id || 0),
            date: t.task_date || t.date || TODAY,
            trainerId: String(t.employees_id || ""),
            trainer:
              (t.first_name && t.last_name)
                ? `${t.first_name} ${t.last_name}`.trim()
                : (t.trainer_name || ""),
            project_id: String(t.project_id || ""),
            project: t.project_name || "",
            manager: t.gms_manager || t.manager || "",
            lead: t.t_manager || t.lead || t.lead_name || "",
            podLead: t.pod_lead || t.pod_name || "",
            hours: Number(t.hours_logged || 0),
            overtime: Number(t.hours_logged || 0) > 8,
            inProgress: Number(t.task_inprogress || 0),
            taskCompleted: Number(t.task_completed || 0),
            reworked: Number(t.task_reworked || t.reworked || 0),
            approved: Number(t.task_approved || 0),
            rejected: Number(t.task_rejected || t.rejected || 0),
            reviewed: Number(t.task_reviewed || t.reviewed || 0),
          }))
          : [];

        setRows(tasks.map((r) => ({ ...r, trainer: r.trainer || nameById[r.trainerId] || r.trainerId })));
      } catch (err) {
        setErrorBanner(firstMsg(err?.response?.data) || err?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ========== Range filter & sorting/paging ========== */
  const isInRange = (ymd) => {
    if (range === "overall") return true;
    const d = new Date(`${ymd}T00:00:00`);
    const a = new Date(`${TODAY}T00:00:00`);
    if (range === "day") return d.getTime() === a.getTime();
    if (range === "week") {
      const w = new Date(a);
      w.setDate(a.getDate() - 6);
      return d >= w && d <= a;
    }
    if (range === "month") return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
    return true;
  };

  const filtered = useMemo(() => {
    let d = rows.filter((r) => isInRange(r.date));
    if (view.type === "trainer") d = d.filter((r) => r.trainerId === view.trainerId);
    d.sort((a, b) => {
      const A = (a[sortKey] ?? "").toString();
      const B = (b[sortKey] ?? "").toString();
      const cmp = A < B ? -1 : A > B ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [rows, view, range, sortKey, sortDir]);

  const pageSize = view.type === "trainer" ? PAGE_TRAINER : PAGE_OVERVIEW;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const startIdx = (page - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, filtered.length);
  const pageRows = useMemo(() => filtered.slice(startIdx, endIdx), [filtered, startIdx, endIdx]);

  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => { setPage(1); }, [range, view]);

  /* ========== Validation ========== */
  const hoursNum = Number(form.hours || 0);
  const numOk = (v) => v === "" || /^[0-9]+$/.test(String(v));
  const errors = useMemo(() => {
    const e = {};
    if (!form.trainerId) e.trainerId = "Trainer is required.";
    if (!form.project_id) e.project = "Project is required.";
    if (!form.date) e.date = "Date is required.";
    if (form.date && form.date > TODAY) e.date = "Date cannot be in the future.";
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

  /* ========== Active pick-lists ========== */
  const activeTrainers = useMemo(() => trainers.filter(isActiveFlag), [trainers]);
  const activeProjects = useMemo(() => projects.filter(isActiveFlag), [projects]);
  const trainerProjects = useMemo(() => {
    if (!form.trainerId) return [];
    return projects
      .filter((p) => String(p.employees_id) === String(form.trainerId))
      .filter(isActiveFlag);
  }, [projects, form.trainerId]);

  /* ========== Action handlers ========== */
  const onAdd = () => {
    setMode("add");
    setForm({ ...emptyForm });
    setSubmitted(false);
    setShowModal(true);
  };

  const onEdit = (r) => {
    setMode("edit");
    setForm({
      ...emptyForm,
      ...r,
      project_id: String(r.project_id || ""),
      overtime: Boolean(r?.overtime ?? (Number(r?.hours || 0) > 8)), // <= key line
    });
    setSubmitted(false);
    setShowModal(true);
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
        <>
          Delete entry <strong>#{row.id}</strong> for <strong>{row.trainer}</strong> on <strong>{row.date}</strong>?
        </>
      ),
      onConfirm: async () => {
        try {
          setRows((prev) => prev.filter((r) => r.id !== id));
          setSuccess({ show: true, message: "Task entry deleted" });
        } catch (err) {
          setErrModal({
            show: true,
            message: firstMsg(err?.response?.data) || err?.message || "Failed to delete entry",
          });
        } finally {
          setConfirm((c) => ({ ...c, show: false }));
        }
      },
    });
  };

  const onTrainerChange = (trainerId) => {
    const t = trainers.find((x) => String(x.employees_id) === String(trainerId));
    if (t && !isActiveFlag(t)) return;

    const mapped = projects
      .filter((p) => String(p.employees_id) === String(trainerId))
      .filter(isActiveFlag);

    const auto = mapped.length === 1 ? mapped[0] : null;

    setForm((f) => ({
      ...f,
      trainerId,
      trainer: t ? (t.full_name ?? [t.first_name, t.last_name].filter(Boolean).join(" ")) : "",
      project_id: auto ? String(auto.project_id) : "",
      project: auto ? auto.project_name : "",
      manager: auto ? auto.gms_manager : "",
      lead: auto ? auto.t_manager : "",
      podLead: auto ? auto.pod_lead : "",
    }));
  };

  const onProjectChange = (projectId) => {
    const p = projects.find((x) => String(x.project_id) === String(projectId));
    if (p && !isActiveFlag(p)) return;
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

    const pickedTrainer = trainers.find((t) => String(t.employees_id) === String(form.trainerId));
    const pickedProject = projects.find((p) => String(p.project_id) === String(form.project_id));
    if (!pickedTrainer || !isActiveFlag(pickedTrainer)) {
      setErrModal({ show: true, message: "Selected resource is inactive. Choose an active resource." });
      return;
    }
    if (!pickedProject || !isActiveFlag(pickedProject)) {
      setErrModal({ show: true, message: "Selected project is inactive. Choose an active project." });
      return;
    }

    setConfirm({
      show: true,
      title: mode === "add" ? "Confirm Add" : "Confirm Update",
      confirmText: mode === "add" ? "Add Entry" : "Update Entry",
      confirmVariant: "primary",
      body: (
        <div className="small">
          <div><strong>Trainer:</strong> {form.trainer} ({form.trainerId})</div>
          <div><strong>Project:</strong> {form.project || "-"} | <strong>Date:</strong> {form.date}</div>
          <div><strong>Hours:</strong> {form.hours}{form.overtime ? " (OT)" : ""}</div>
        </div>
      ),
      onConfirm: doSave,
    });
  };

  const doSave = async () => {
    const payload = {
      employees_id: form.trainerId,
      project_id: form.project_id ? Number(form.project_id) : 0,
      task_date: form.date || TODAY,
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
          date: created.task_date || payload.task_date,
          trainerId: String(created.employees_id || payload.employees_id),
          trainer:
            (created.first_name && created.last_name)
              ? `${created.first_name} ${created.last_name}`.trim()
              : (created.trainer_name || form.trainer),
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
                date: updated.task_date || payload.task_date,
                trainerId: String(updated.employees_id || payload.employees_id),
                trainer:
                  (updated.first_name && updated.last_name)
                    ? `${updated.first_name} ${updated.last_name}`.trim()
                    : (updated.trainer_name || form.trainer),
                project_id: String(updated.project_id || payload.project_id),
                project: updated.project_name || form.project,
                manager: updated.gms_manager || form.manager,
                lead: updated.t_manager || form.lead,
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

  // Import/Export
  const handleExport = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks_${view.type === "trainer" ? view.trainerId + "_" : ""}${range}_${TODAY}.csv`;
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

      const mapped = rowsCsv.map((r, i) => ({
        id: Number(r.id || Date.now() + i),
        date: r.date || TODAY,
        trainerId: String(r.trainerId || ""),
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

  /* ========== Navigate ========== */
  const goToTrainerDetail = (trainerId, name) => {
    setView({ type: "trainer", trainerId, name });
  };

  /* ========== Charts (trainer view only) ========== */
  const rangeSuffix = range === "day" ? "Day" : range === "week" ? "Week" : range === "month" ? "Month" : "Overall";
  const chartRows = filtered;

  const statusDonut = useMemo(() => {
    const total = { Completed: 0, Reworked: 0, "In Progress": 0, Approved: 0, Rejected: 0, Reviewed: 0 };
    chartRows.forEach((r) => {
      total.Completed += Number(r.taskCompleted || 0);
      total.Reworked += Number(r.reworked || 0);
      total["In Progress"] += Number(r.inProgress || 0);
      total.Approved += Number(r.approved || 0);
      total.Rejected += Number(r.rejected || 0);
      total.Reviewed += Number(r.reviewed || 0);
    });
    return Object.entries(total).map(([name, value]) => ({ name, value }));
  }, [chartRows]);

  // ----- HOURS SERIES + TICKS per spec -----
  const hoursSeries = useMemo(() => {
    if (range === "day") {
      const d = new Date(`${TODAY}T00:00:00`);
      const label = `${toWeekday(d)} ${pad2(d.getDate())} ${toMonShort(d)}`;
      const sum = chartRows.reduce((a, r) => a + Number(r.hours || 0), 0);
      return [{ label, hours: sum }];
    }
    if (range === "week") {
      const out = [];
      const anchor = new Date(`${TODAY}T00:00:00`);
      for (let i = 6; i >= 0; i--) {
        const d = new Date(anchor);
        d.setDate(anchor.getDate() - i);
        const ymd = toLocalYMD(d);
        const tot = chartRows.filter((r) => r.date === ymd).reduce((a, r) => a + Number(r.hours || 0), 0);
        const label = `${toWeekday(d)} ${pad2(d.getDate())} ${toMonShort(d)}`;
        out.push({ label, hours: tot });
      }
      return out;
    }
    if (range === "month") {
      const now = new Date(`${TODAY}T00:00:00`);
      const year = now.getFullYear();
      const mon = now.getMonth();
      const monName = toMonShort(now);
      const end = new Date(year, mon + 1, 0).getDate();
      const buckets = [
        { key: `Wk 1 — ${monName}`, start: 1, end: 7, hours: 0 },
        { key: `Wk 2 — ${monName}`, start: 8, end: 14, hours: 0 },
        { key: `Wk 3 — ${monName}`, start: 15, end: 21, hours: 0 },
        { key: `Wk 4 — ${monName}`, start: 22, end: 28, hours: 0 },
        { key: `Wk 5 — ${monName}`, start: 29, end, hours: 0 },
      ];
      chartRows.forEach((r) => {
        const [, m, d] = r.date.split("-").map(Number);
        if (m - 1 !== mon) return;
        const b = buckets.find((bk) => d >= bk.start && d <= bk.end);
        if (b) b.hours += Number(r.hours || 0);
      });
      return buckets.filter((b) => b.start <= end).map((b) => ({ label: b.key, hours: b.hours }));
    }
    const map = {};
    chartRows.forEach((r) => {
      const k = monthKey(r.date);
      map[k] = (map[k] || 0) + Number(r.hours || 0);
    });
    return Object.keys(map)
      .sort()
      .map((k) => ({ label: monthLabel(k), hours: map[k] }));
  }, [chartRows, range]);

  const yTicks = useMemo(() => {
    const max = Math.max(0, ...hoursSeries.map((d) => Number(d.hours || 0)));

    const makeTicks = (step, cap) => {
      const m = typeof cap === "number" ? cap : 0;
      const arr = [];
      for (let i = 0; i <= m; i += step) arr.push(i);
      if (arr[arr.length - 1] !== m) arr.push(m);
      return arr;
    };

    // Pick a "nice" ceiling so 7 -> 10, 35 -> 50, 122 -> 200, etc.
    const cap = niceCeil(max);

    // Steps: fine-grained for Day/Week; coarser for Month/Overall
    if (range === "day" || range === "week") {
      return makeTicks(1, cap);
    }

    // Month/Overall — choose an intelligible step from the cap
    const step = cap <= 20 ? 2 : cap <= 50 ? 5 : 10;
    return makeTicks(step, cap);
  }, [hoursSeries, range]);


  /* ========== Render ========== */
  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* compact class toggles only when trainer charts are visible */}
      <div className={`tasks-page ${view.type === "trainer" ? "trainer-view" : ""} px-2 py-2`}>
        {errorBanner && <div className="alert alert-danger my-2">{errorBanner}</div>}

        {/* Actions */}
        <div className="d-flex justify-content-end mb-2 gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            className="d-none"
            onChange={handleImportFile}
          />
          <button type="button" className="btn btn-primary action-btn" title="Import CSV" onClick={handleImportClick}>
            <i className="bi bi-database-up" /><span className="label">Import</span>
          </button>
          <button type="button" className="btn btn-primary action-btn" title="Export CSV" onClick={handleExport}>
            <i className="bi bi-database-down" /><span className="label">Export</span>
          </button>
          <button type="button" className="btn btn-primary action-btn" onClick={onAdd} title="Add Task">
            <i className="bi bi-plus-circle" /><span className="label">Add</span>
          </button>
        </div>

        {/* Header + Range */}
        <div className="card bg-body-tertiary border-3 rounded-3 shadow tasks-card">
          <div className={`card-header bg-warning-subtle text-warning-emphasis tasks-toolbar ${view.type === "trainer" ? "has-back" : ""}`}>
            <div className="d-flex align-items-center gap-2 flex-wrap pb-2">
              {view.type === "trainer" && (
                <button type="button" className="btn btn-outline-dark btn-sm action-btn btn-back" onClick={() => setView({ type: "overview" })} title="Back">
                  <i className="bi bi-arrow-left" /><span className="label">Back</span>
                </button>
              )}
              <div className="title">
                {view.type === "trainer" ? (
                  <>Trainer: <span className="fw-semibold">{view.name}</span> <span className="text-muted">({view.trainerId})</span></>
                ) : "Task Tracking"}
              </div>

              <div className="btn-group ms-2 flex-wrap" role="group" aria-label="range">
                {["day", "week", "month", "overall"].map((r) => (
                  <button
                    key={r}
                    className={"btn btn-sm " + (range === r ? "btn-outline-primary active" : "btn-outline-secondary")}
                    onClick={() => setRange(r)}
                  >
                    {r[0].toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
              <div className="hint small text-muted">Track totals per trainer (hours & status). Day shows today’s entries.</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-hover tasks-table">
              <thead className="text-center">
                <tr>
                  <Th label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Trainer (ID)" k="trainer" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Project" k="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="GMS Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Turing Manager" k="lead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Pod Lead" k="podLead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Hours" k="hours" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="In Progress" k="inProgress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Task Completed" k="taskCompleted" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reworked" k="reworked" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Approved" k="approved" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Rejected" k="rejected" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reviewed" k="reviewed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th className="text-center" style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {pageRows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      {view.type !== "trainer" ? (
                        <a
                          href="#!"
                          className="name-link"
                          onClick={(e) => { e.preventDefault(); goToTrainerDetail(r.trainerId, r.trainer); }}
                        >
                          {r.trainer}
                        </a>
                      ) : r.trainer}
                      {" "}
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
                    <td className="text-info fw-semibold">{r.reviewed}</td>
                    <td className="actions-col">
                      <div className="action-wrap">
                        <button className="btn btn-outline-secondary btn-sm action-btn" onClick={() => onEdit(r)} title="Edit">
                          <i className="bi bi-pencil-square" /><span className="label">Edit</span>
                        </button>
                        <button className="btn btn-outline-danger btn-sm action-btn" onClick={() => onDelete(r.id)} title="Delete">
                          <i className="bi bi-trash3" /><span className="label">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr><td colSpan={15} className="text-muted py-4">No entries.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="d-flex flex-wrap align-items-center justify-content-between px-3 py-2">
            <div className="text-muted small">
              Showing {filtered.length ? startIdx + 1 : 0}-{endIdx} of {filtered.length}
            </div>
            <PaginationBar page={page} count={pageCount} onChange={setPage} />
          </div>
        </div>

        {/* Charts — ONLY when trainer view */}
        {view.type === "trainer" && (
          <div className="row g-2 mt-2">
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-header"><h6 className="mb-0"># of Tasks by Status — {rangeSuffix}</h6></div>
                <div className="card-body">
                  <div style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Tooltip />
                        {/* Legend shows counts inline as "Approved: 7", "Completed: 56", etc. */}
                        <Legend
                          wrapperStyle={{ fontSize: 12 }}
                          formatter={(name, entry) => `${name}: ${entry?.payload?.value ?? 0}`}
                        />
                        <Pie
                          data={statusDonut}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          labelLine={false}
                        // remove any existing `label={...}` prop here
                        >
                          {statusDonut.map((_, i) => (
                            <Cell key={i} fill={["#198754", "#ffc107", "#0d6efd", "#6c757d", "#dc3545", "#0dcaf0"][i % 6]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-header"><h6 className="mb-0">Hours Logged — {rangeSuffix}</h6></div>
                <div className="card-body">
                  <div className="chart-fill" style={{ width: "100%", height: 250 }}>
                    <ResponsiveContainer>
                      <BarChart data={hoursSeries} margin={{ top: 22, right: 8, left: 8, bottom: 10 }}>
                        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />

                        {/* X axis: compact labels, slight angle, more spacing; no axis title */}
                        <XAxis
                          dataKey="label"
                          tickFormatter={compactTick}
                          interval="preserveStartEnd"
                          minTickGap={10}
                          tick={{ fontSize: 10 }}
                          angle={-25}
                          height={48}
                          tickMargin={6}
                          allowDuplicatedCategory={false}
                        />

                        {/* Y axis: keep ticks; no axis title */}
                        <YAxis
                          allowDecimals={false}
                          ticks={yTicks}
                          domain={[0, yTicks.length ? yTicks[yTicks.length - 1] : 'auto']}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          align="center"     
                          wrapperStyle={{ marginTop: 4 }}
                          content={() => <div className="axis-hint">Hours ⬆️ • Dates ➡️</div>}
                        />
                        <Bar dataKey="hours" fill="#0d6efd" radius={[6, 6, 0, 0]} maxBarSize={110}>
                          {/* Keep values on top of each bar */}
                          <LabelList dataKey="hours" position="top" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
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
                              items={activeTrainers}
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
                            {submitted && errors.trainerId && <div className="invalid-feedback d-block">{errors.trainerId}</div>}
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
                              <option value="">
                                {!form.trainerId ? "Select trainer first" : (trainerProjects.length ? "Select project" : "No active mapped projects")}
                              </option>
                              {trainerProjects.map((p) => (
                                <option key={`${p.employees_id}-${p.project_id}`} value={p.project_id}>{p.project_name}</option>
                              ))}
                            </select>
                            {submitted && errors.project && <div className="invalid-feedback d-block">{errors.project}</div>}
                            <div className="form-text">Pick a project; manager/lead/pod fill automatically.</div>
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">GMS Manager <span className="text-danger">*</span></label>
                            <input className="form-control bg-light" value={form.manager} disabled />
                          </div>

                          <div className="col-12 col-md-6">
                            <label className="form-label">Turing Manager <span className="text-danger">*</span></label>
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
                              max={TODAY}
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
        )}

        {/* Confirm / Success / Error */}
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
