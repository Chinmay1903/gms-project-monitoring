import React, { useMemo, useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import "./TaskMonitoring.css";
import { getTasks, getEmployeeNames, getProjectNamesByEmployeeID, addTask, updateTask } from "../../../api/features";
import SearchableSelect from "../components/SearchableSelect";

import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend
} from "recharts";

export default function TaskMonitoring() {
  /* ----------------------------- small helpers ----------------------------- */
  const Th = ({ label, k, sortKey, sortDir, onSort }) => {
    const active = sortKey === k;
    console.log(sortDir);
    
    const icon = active ? (sortDir === "asc" ? "bi-arrow-up text-primary" : "bi-arrow-down text-primary") : "bi-arrow-down-up";
    return (
      <th className={`sortable ${active ? "active" : ""} ${sortDir}`}>
            <button type="button" className="sort-btn" onClick={() => onSort(k)} title={`Sort by ${label}`}>
                {label} <i className={`bi ${icon} sort-icon`} />
            </button>
        </th>
    );
  };
  const toYMD = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);
  const today = toYMD(new Date());

  /* -------------------------------- seed data ------------------------------ */
  // Expanded sample worklog data — September 2025
  const seed = [
    { id: "t1", date: "2025-09-29", trainerId: "GMS101", trainer: "Asha Kumar", project: "Inventory Revamp", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 6, taskCompleted: 6, reworked: 2, inProgress: 2, approved: 2, rejected: 0, reviewed: 0 },
    { id: "t2", date: "2025-09-29", trainerId: "GMS101", trainer: "Asha Kumar", project: "Partner Portal", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 3, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 1 },
    { id: "t3", date: "2025-09-29", trainerId: "GMS102", trainer: "Rahul Shah", project: "Billing Migration", manager: "N. Gupta", lead: "P. Mehta", podLead: "M. Iyer", hours: 5, taskCompleted: 4, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },

    // near month end for "week"
    { id: "t4", date: "2025-09-28", trainerId: "GMS102", trainer: "Rahul Shah", project: "Fraud Engine", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 6, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 1, reviewed: 0 },
    { id: "t5", date: "2025-09-27", trainerId: "GMS101", trainer: "Asha Kumar", project: "Partner Portal", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 3, taskCompleted: 2, reworked: 0, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t6", date: "2025-09-26", trainerId: "GMS103", trainer: "Ishita Bose", project: "Data Lake ETL", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 7, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 1 },

    // spread across the month
    { id: "t7", date: "2025-09-02", trainerId: "GMS101", trainer: "Asha Kumar", project: "Inventory Revamp", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 7, taskCompleted: 5, reworked: 2, inProgress: 2, approved: 2, rejected: 0, reviewed: 0 },
    { id: "t8", date: "2025-09-03", trainerId: "GMS101", trainer: "Asha Kumar", project: "Mobile App v3", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 8, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 1 },
    { id: "t9", date: "2025-09-05", trainerId: "GMS102", trainer: "Rahul Shah", project: "Billing Migration", manager: "N. Gupta", lead: "P. Mehta", podLead: "M. Iyer", hours: 4, taskCompleted: 4, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t10", date: "2025-09-06", trainerId: "GMS102", trainer: "Rahul Shah", project: "Fraud Engine", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 6, taskCompleted: 2, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t11", date: "2025-09-08", trainerId: "GMS103", trainer: "Ishita Bose", project: "Mobile App v3", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 6, taskCompleted: 2, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t12", date: "2025-09-10", trainerId: "GMS103", trainer: "Ishita Bose", project: "Data Lake ETL", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 7, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 1, reviewed: 0 },
    { id: "t13", date: "2025-09-12", trainerId: "GMS101", trainer: "Asha Kumar", project: "Partner Portal", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 2, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t14", date: "2025-09-15", trainerId: "GMS101", trainer: "Asha Kumar", project: "Inventory Revamp", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 6, taskCompleted: 5, reworked: 1, inProgress: 2, approved: 2, rejected: 0, reviewed: 1 },
    { id: "t15", date: "2025-09-16", trainerId: "GMS102", trainer: "Rahul Shah", project: "Billing Migration", manager: "N. Gupta", lead: "P. Mehta", podLead: "M. Iyer", hours: 5, taskCompleted: 4, reworked: 0, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t16", date: "2025-09-18", trainerId: "GMS103", trainer: "Ishita Bose", project: "Data Lake ETL", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 6, taskCompleted: 2, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t17", date: "2025-09-20", trainerId: "GMS102", trainer: "Rahul Shah", project: "Fraud Engine", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 6, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 1 },
    { id: "t18", date: "2025-09-22", trainerId: "GMS101", trainer: "Asha Kumar", project: "Mobile App v3", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 7, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t19", date: "2025-09-24", trainerId: "GMS103", trainer: "Ishita Bose", project: "Mobile App v3", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 4, taskCompleted: 2, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t20", date: "2025-09-25", trainerId: "GMS102", trainer: "Rahul Shah", project: "Billing Migration", manager: "N. Gupta", lead: "P. Mehta", podLead: "M. Iyer", hours: 5, taskCompleted: 4, reworked: 1, inProgress: 1, approved: 1, rejected: 1, reviewed: 0 },

    // extra mid-month coverage
    { id: "t21", date: "2025-09-11", trainerId: "GMS101", trainer: "Asha Kumar", project: "Inventory Revamp", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 6, taskCompleted: 4, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t22", date: "2025-09-13", trainerId: "GMS102", trainer: "Rahul Shah", project: "Fraud Engine", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 0, taskCompleted: 2, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t23", date: "2025-09-19", trainerId: "GMS101", trainer: "Asha Kumar", project: "Partner Portal", manager: "N. Gupta", lead: "S. Rao", podLead: "M. Iyer", hours: 3, taskCompleted: 2, reworked: 0, inProgress: 1, approved: 1, rejected: 0, reviewed: 0 },
    { id: "t24", date: "2025-09-21", trainerId: "GMS103", trainer: "Ishita Bose", project: "Data Lake ETL", manager: "L. Kulkarni", lead: "A. Verma", podLead: "Z. Khan", hours: 7, taskCompleted: 3, reworked: 1, inProgress: 1, approved: 1, rejected: 0, reviewed: 1 },
  ];


  const [rows, setRows] = useState(seed);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trainers, setTrainers] = useState([]); // {id, name, projects:[{project, manager, lead, podLead}]}
  const [trainerProjects, setTrainerProjects] = useState([]); // {id, name, manager, lead, podLead}
  const [loadingProjects, setLoadingProjects] = useState(false);

  /* --------------------------------- filters -------------------------------- */
  const [range, setRange] = useState("day"); // day | week | month | overall
  const [view, setView] = useState({ type: "overview" }); // {type:"trainer", trainerId, name}
  const anchor = today; // chips are relative to "today" like screenshot

  const isInRange = (ymd) => {
    if (range === "overall") return true;
    const d = new Date(ymd + "T00:00:00");
    const a = new Date(anchor + "T00:00:00");
    if (range === "day") {
      return d.getTime() === a.getTime();
    }
    if (range === "week") {
      const weekAgo = new Date(a); weekAgo.setDate(a.getDate() - 6);
      return d >= weekAgo && d <= a;
    }
    if (range === "month") {
      return d.getMonth() === a.getMonth() && d.getFullYear() === a.getFullYear();
    }
    return true;
  };

  /* --------------------------------- sorting -------------------------------- */
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("asc");
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  /* ---------------------------- modal state/logic ---------------------------- */
  const emptyForm = {
    id: 0, date: today, trainerId: "", trainer: "", project_id: 0,
    project: "", manager: "", lead: "", podLead: "",
    hours: "", overtime: false, taskCompleted: 0, reworked: 0, inProgress: 0, approved: 0, rejected: 0, reviewed: 0
  };
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("add"); // add | edit
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [taskRes, namesRes] = await Promise.all([getTasks(), getEmployeeNames()]);
        // tasks              
        const taskData = Array.isArray(taskRes?.data) ? taskRes.data.map(t => ({
          ...emptyForm,
          id: Number(t.task_id || 0),
          date: t.date || today,
          trainerId: t.employees_id || "",
          trainer: t.trainer_name || "",
          project_id: Number(t.project_id || 0),
          project: t.project_name || "",
          manager: t.manager || "",
          lead: t.lead || "",
          podLead: t.pod_lead || "",
          hours: Number(t.hours_logged || 0),
          inProgress: Number(t.task_inprogress || 0),
          taskCompleted: Number(t.task_completed || 0),
          reworked: Number(t.reworked || 0),
          approved: Number(t.task_approved || 0),
          rejected: Number(t.rejected || 0),
          reviewed: Number(t.reviewed || 0),
        })) : [];
        // employee names
        console.log("Loaded tasks:", taskData);
        setRows(taskData);
        setTrainers(Array.isArray(namesRes?.data) ? namesRes.data : []);
        console.log("Loaded employee names:", trainers, typeof trainers);
        
      } catch (err) {
        console.error("Failed loading tasks or employee names", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {if (!form.trainerId) return;                    // need a trainer first
  if (loadingProjects) return;

  if (trainerProjects.length === 0) {
    // no projects for this trainer → clear selection
    setForm(f => ({ ...f, project_id: "", project:"", manager:"", lead:"", podLead:"" }));
    return;
  }

  // If current selection is empty or not in the new list, pick the first and trigger handler
  const hasSelected = trainerProjects.some(p => String(p.project_id) === String(form.project_id));
  if (!hasSelected) {
    const firstId = String(trainerProjects[0].project_id);
    onProjectChange(firstId);                     // ← programmatically trigger
  }
}, [form.trainerId, loadingProjects, trainerProjects]);

  const normalize = (f) => ({
    date: f.date || today,
    trainerId: f.trainerId || "",
    trainer: f.trainer || "",
    project: f.project || "",
    manager: f.manager || "",
    lead: f.lead || "",
    podLead: f.podLead || "",
    hours: f.hours ?? "",
    overtime: !!f.overtime,
    inProgress: f.inProgress ?? 0,
    taskCompleted: f.taskCompleted ?? 0,
    reworked: f.reworked ?? 0,
    approved: f.approved ?? 0,
    rejected: f.rejected ?? 0,
    reviewed: f.reviewed ?? 0,
  });

  const onAdd = () => {
    setMode("add");
    setForm(emptyForm);
    setSubmitted(false);
    setShowModal(true);
  };

  const onEdit = (r) => {
    setMode("edit");
    setForm(normalize({ ...r }));
    loadProjectsForTrainer(r.trainer);
    setSubmitted(false);
    setShowModal(true);
  };

  const onDelete = (id) => {
    if (window.confirm("Delete this entry?")) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const loadProjectsForTrainer = async (trainerId) => {
    if (!trainerId) {
      setTrainerProjects([]);
      return;
    }
    setLoadingProjects(true);
    const res = await getProjectNamesByEmployeeID(trainerId);
    if (res.ok) {
      setTrainerProjects(res.data || []);
    } else {
      console.error("Failed to load projects", res.message);
      setTrainerProjects([]);
    }
    setLoadingProjects(false);
  };

  // When trainer changes → set id and clear project chain
  const onTrainerChange = async (trainerId) => {
    console.log("Selected trainer:", trainerId, typeof trainerId);
    
    const t = trainers.find(x => x.employees_id === trainerId);
    await loadProjectsForTrainer(t.full_name);
    setForm(f => ({
      ...f,
      trainerId,
      trainer: t ? t.full_name : "",
      project_id: trainerProjects.length >= 1 ? trainerProjects[0].project_id : 0,
      project: trainerProjects.length >= 1 ? trainerProjects[0].project_name : "",
      manager: trainerProjects.length >= 1 ? trainerProjects[0].gms_manager : "",
      lead: trainerProjects.length >= 1 ? trainerProjects[0].lead_name : "",
      podLead: trainerProjects.length >= 1 ? trainerProjects[0].pod_name : ""
    }));
    console.log("Form after trainer change:", form, trainerProjects);
    
  };

  // When project changes → set manager/lead/pod
  const onProjectChange = (projectId) => {
    const found = trainerProjects.find(p => p.project_id === Number(projectId));
    console.log("Selected project:", projectId, typeof projectId, found);

    setForm(f => ({
      ...f,
      project_id: projectId,
      project: found?.project_name || "",
      manager: found?.gms_manager || "",
      lead: found?.lead_name || "",
      podLead: found?.pod_name || ""
    }));
  };

  // // available projects (exclude ones already entered for that trainer + date)
  // const availableProjects = useMemo(() => {
  //   const base = trainerMap[form.trainerId]?.projects ?? [];
  //   const taken = rows
  //     .filter(r =>
  //       r.trainerId === form.trainerId &&
  //       r.date === form.date &&
  //       (mode === "add" || r.id !== form.id)
  //     )
  //     .map(r => r.project);
  //   return base.filter(p => !taken.includes(p.project));
  // }, [trainerMap, form.trainerId, form.date, rows, mode, form.id]);


  /* -------------------------------- validation ------------------------------- */
  const hoursNum = Number(form.hours || 0);
  const numOk = (v) => v === "" || /^[0-9]+$/.test(String(v));
  const errors = useMemo(() => {
    const e = {};
    if (!form.trainerId) e.trainerId = "Trainer is required.";
    if (!form.project) e.project = "Project is required.";
    if (!form.date) e.date = "Date is required.";
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

  const onSave = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;

    const payload = {
      employees_id: form.trainerId,
      project_id: form.project_id,
      date: form.date || today,
      task_completed: Number(form.taskCompleted || 0),
      task_inprogress: Number(form.inProgress || 0),
      task_reworked: Number(form.reworked || 0),
      task_approved: Number(form.approved || 0),
      task_rejected: Number(form.rejected || 0),
      task_reviewed: Number(form.reviewed || 0),
      hours_logged: Number(form.hours || 0),
    };

    // create/update
    if (mode === "add") {
      console.log(payload);
      const id = "t" + Math.random().toString(36).slice(2, 8);
      const res = await addTask(payload);
      console.log("Add task response:", res);

      const created = res.data ?? res ?? { ...form, id: id || `GMP${Date.now()}`, name: payload.project_name };
      const row = {
        id: Number(created.task_id),
        date: created.date || today,
        trainerId: created.employees_id || "",
        trainer: created.trainer_name || "",
        project_id: Number(created.project_id || 0),
        project: created.project_name || "",
        manager: created.manager || "",
        lead: created.lead || "",
        podLead: created.pod_lead || "",
        hours: Number(created.hours_logged || 0),
        inProgress: Number(created.task_inprogress || 0),
        taskCompleted: Number(created.task_completed || 0),
        reworked: Number(created.reworked || 0),
        approved: Number(created.task_approved || 0),
        rejected: Number(created.rejected || 0),
        reviewed: Number(created.reviewed || 0),
      };
      setRows(prev => [row, ...prev]);
    } else {
      const res = await updateTask(form.id, payload);
      console.log("Update task response:", res);

      const updated = res?.data ?? res ?? payload;
      setRows(prev => prev.map(r => r.id === form.id
        ? {
          ...form,
          date: updated.date || today,
          trainerId: updated.employees_id || "",
          trainer: updated.trainer_name || "",
          project_id: Number(updated.project_id || 0),
          project: updated.project_name || "",
          manager: updated.manager || "",
          lead: updated.lead || "",
          podLead: updated.pod_lead || "",
          hours: Number(updated.hours_logged || 0),
          inProgress: Number(updated.task_inprogress || 0),
          taskCompleted: Number(updated.task_completed || 0),
          reworked: Number(updated.reworked || 0),
          approved: Number(updated.task_approved || 0),
          rejected: Number(updated.rejected || 0),
          reviewed: Number(updated.reviewed || 0),
        }
        : r
      ));
    }
    setShowModal(false);
  };

  /* ------------------------------- derived view ------------------------------ */
  const baseRows = useMemo(() => {
    let d = rows.filter(r => isInRange(r.date));
    if (view.type === "trainer") d = d.filter(r => r.trainerId === view.trainerId);

    d.sort((a, b) => {
      const A = (a[sortKey] ?? "").toString().toLowerCase();
      const B = (b[sortKey] ?? "").toString().toLowerCase();
      const cmp = A < B ? -1 : A > B ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return d;
  }, [rows, isInRange, view.type, view.trainerId, sortKey, sortDir]);

  // aggregates for charts (current filtered scope)
  const agg = useMemo(() => {
    const total = baseRows.reduce((acc, r) => {
      acc.taskCompleted += Number(r.taskCompleted || 0);
      acc.reworked += Number(r.reworked || 0);
      acc.inProgress += Number(r.inProgress || 0);
      acc.approved += Number(r.approved || 0);
      return acc;
    }, { taskCompleted: 0, reworked: 0, inProgress: 0, approved: 0 });

    // hours-by-date for line
    const map = {};
    baseRows.forEach(r => { map[r.date] = (map[r.date] || 0) + Number(r.hours || 0); });
    const days = Object.keys(map).sort();
    const hoursSeries = days.map(d => ({ date: new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit" }), hours: map[d] }));
    console.log("Hours series:", hoursSeries);

    return { total, hoursSeries };
  }, [baseRows]);

  /* ---------------------------------- view ---------------------------------- */
  if (loading) {
    return (
      <AppLayout>
        <div className="projects-page">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (error) {
    return (
      <AppLayout>
        <div className="projects-page">
          <div className="alert alert-danger my-4">{error}</div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout>
      <div className="tasks-page">
        <div className="tasks-actions d-flex justify-content-end mb-2 gap-2">
          <button className="btn btn-primary action-btn" onClick={() => { }} title="Import Data">
            <i className="bi bi-database-up" />
            {/* <span className="label">Import Data</span> */}
          </button>
          <button className="btn btn-primary action-btn" onClick={() => { }} title="Export Data">
            <i className="bi bi-database-down" />
            {/* <span className="label">Export Data</span> */}
          </button>
          <button className="btn btn-primary" onClick={onAdd} title="Add Task">
            <i className="bi bi-plus-lg" />
          </button>
        </div>
        <div className="tasks-card card shadow-sm">
          <div className="tasks-toolbar">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {view.type === "trainer" && (
                <button className="btn btn-light btn-sm me-1" onClick={() => setView({ type: "overview" })} title="Back">
                  <i className="bi bi-arrow-left" />
                </button>
              )}
              <div className="title">
                {view.type === "trainer"
                  ? <>Trainer: <span className="fw-semibold">{view.name}</span> <span className="text-muted">({view.trainerId})</span></>
                  : <>Task Tracking</>}
              </div>

              <div className="btn-group ms-2" role="group" aria-label="range">
                {["day", "week", "month", "overall"].map(r => (
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
            </div>

            <div className="hint small text-muted">
              Track totals per trainer (hours & status). Day shows only today's entries.
            </div>
          </div>

          {/* table */}
          <div className="table-responsive">
            <table className="table table-hover tasks-table">
              <thead>
                <tr>
                  <Th label="Date" k="date" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Trainer (ID)" k="trainer" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Project" k="project" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Lead" k="lead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Pod Lead" k="podLead" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Hours" k="hours" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="In Progress" k="inProgress" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Task Completed" k="taskCompleted" ortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reworked" k="reworked" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Approved" k="approved" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Rejected" k="rejected" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Reviewed" k="reviewed" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th style={{ width: 110 }} className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {baseRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.date}</td>
                    <td>
                      <a href="#0" className="name-link" onClick={() => setView({ type: "trainer", trainerId: r.trainerId, name: r.trainer })}>
                        {r.trainer}
                      </a> <span className="text-muted">({r.trainerId})</span>
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
                    <td className="text-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-secondary" onClick={() => onEdit(r)} title="Edit"><i className="bi bi-pencil-square" /></button>
                        <button className="btn btn-outline-danger" onClick={() => onDelete(r.id)} title="Delete"><i className="bi bi-trash" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {baseRows.length === 0 && (
                  <tr><td colSpan={12} className="text-center py-4 text-muted">No entries for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* charts (only show when in trainer detail like your 3rd image) */}
        {view.type === "trainer" && (
          <div className="row g-2 mt-2">
            <div className="col-12 col-lg-6">
              <div className="card shadow-sm h-100">
                <div className="card-header"><h6 className="mb-0"># of Tasks by Status — {range[0].toUpperCase() + range.slice(1)}</h6></div>
                <div className="card-body">
                  <div style={{ width: "100%", height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={[
                        { status: "Task Completed", count: agg.total.taskCompleted },
                        { status: "Reworked", count: agg.total.reworked },
                        { status: "In Progress", count: agg.total.inProgress },
                        { status: "Approved", count: agg.total.approved },
                        { status: "Rejected", count: agg.total.rejected },
                        { status: "Reviewed", count: agg.total.reviewed },
                      ]}>
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
                <div className="card-header"><h6 className="mb-0">{range[0].toUpperCase() + range.slice(1)} Hours</h6></div>
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
        )}

        {/* modal (single add/edit) */}
        {showModal && (
          <>
            <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-xl modal-dialog-centered">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">{mode === "add" ? "Add Task Entry" : "Edit Task Entry"}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} aria-label="Close" />
                  </div>

                  <form onSubmit={onSave} noValidate>
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
                              onChange={value => onTrainerChange(value || "")}
                              keyField="employees_id"
                              labelField="full_name"
                              className={`${submitted && errors.trainerId ? "is-invalid" : ""}`}
                              placeholder="Select Resourse"
                              disabled={ mode === "edit" }
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
                              onChange={e => onProjectChange(e.target.value)}
                              disabled={!form.trainerId || loadingProjects || mode === "edit"}
                            >
                              {trainerProjects.length === 0 ? (
                                <option value="">{form.trainerId ? (loadingProjects ? "Loading projects..." : "Select project") : "Select trainer first"}</option>
                              ) : (
                                trainerProjects.map(p => <option key={p.project_id} value={p.project_id}>{p.project_name}</option>)
                              )}
                            </select>
                            {submitted && errors.project && <div className="invalid-feedback">{errors.project}</div>}
                            <div className="form-text">Shows only projects assigned to the selected trainer.</div>
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
                              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
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
                                onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                                placeholder={"e.g. 0 to " + (form.overtime ? "24" : "8")}
                              />
                              <div className="form-check ms-2">
                                <input className="form-check-input" type="checkbox" id="chkOt" checked={form.overtime} onChange={e => setForm(f => ({ ...f, overtime: e.target.checked }))} />
                                <label className="form-check-label" htmlFor="chkOt">Overtime</label>
                              </div>
                            </div>
                            {submitted && errors.hours && <div className="invalid-feedback d-block">{errors.hours}</div>}
                            <div className="form-text">Max 8 hrs (unlimited when Overtime is checked).</div>
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-info">In Progress</label>
                            <input type="number" className={`form-control ${submitted && errors.inProgress ? "is-invalid" : ""}`} value={form.inProgress} onChange={e => setForm(f => ({ ...f, inProgress: e.target.value }))} />
                            {submitted && errors.inProgress && <div className="invalid-feedback">{errors.inProgress}</div>}
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-primary">Tasks Completed</label>
                            <input type="number" className={`form-control ${submitted && errors.taskCompleted ? "is-invalid" : ""}`} value={form.taskCompleted} onChange={e => setForm(f => ({ ...f, taskCompleted: e.target.value }))} />
                            {submitted && errors.taskCompleted && <div className="invalid-feedback">{errors.taskCompleted}</div>}
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-danger">Reworked</label>
                            <input type="number" className={`form-control ${submitted && errors.reworked ? "is-invalid" : ""}`} value={form.reworked} onChange={e => setForm(f => ({ ...f, reworked: e.target.value }))} />
                            {submitted && errors.reworked && <div className="invalid-feedback">{errors.reworked}</div>}
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-success">Approved</label>
                            <input type="number" className={`form-control ${submitted && errors.approved ? "is-invalid" : ""}`} value={form.approved} onChange={e => setForm(f => ({ ...f, approved: e.target.value }))} />
                            {submitted && errors.approved && <div className="invalid-feedback">{errors.approved}</div>}
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-danger">Rejected</label>
                            <input type="number" className={`form-control ${submitted && errors.rejected ? "is-invalid" : ""}`} value={form.rejected} onChange={e => setForm(f => ({ ...f, rejected: e.target.value }))} />
                            {submitted && errors.rejected && <div className="invalid-feedback">{errors.rejected}</div>}
                          </div>
                          <div className="col-12 col-md-4">
                            <label className="form-label text-primary">Reviewed</label>
                            <input type="number" className={`form-control ${submitted && errors.reviewed ? "is-invalid" : ""}`} value={form.reviewed} onChange={e => setForm(f => ({ ...f, reviewed: e.target.value }))} />
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
      </div>
    </AppLayout>
  );
}
