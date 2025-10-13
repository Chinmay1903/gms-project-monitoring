import React, { useEffect } from "react";
import AppLayout from "../components/AppLayout";
import "../dashboard-global.css";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from "recharts";
import { dashboardData } from "../../../api/features";
import { toDMY } from "../../../helper";

export default function Dashboard() {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [managers, setManagers] = React.useState([]);
  const [leads, setLeads] = React.useState([]);
  const [podLeads, setPodLeads] = React.useState([]);

  const [page, setPage] = React.useState(1);
  const pageSize = 6;

  // filters
  const [scope, setScope] = React.useState("today");
  const [fManager, setFManager] = React.useState("");
  const [fLead, setFLead] = React.useState("");
  const [fPod, setFPod] = React.useState("");
  const [fromYMD, setFromYMD] = React.useState("");
  const [toYMD, setToYMD] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);

  // [NEW] project selection for charts
  const [selectedProject, setSelectedProject] = React.useState(""); // empty = All projects

  // helpers
  const ymd = (d) =>
    d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10);
  const clampYMD = (s) => (s ? String(s).replace("T", " ").split(" ")[0] : "");
  const today = React.useMemo(() => ymd(new Date()), []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashRes] = await Promise.all([dashboardData()]);
        if (dashRes.ok) {
          const projectData = Array.isArray(dashRes?.data)
            ? dashRes.data.map((p) => ({
                project: p.project_name,
                manager: p.manager_name,
                lead: p.lead_name,
                pod: p.pod_lead_name,
                trainers: +p.num_trainers || 0,
                hours: +p.hours_logged_sum || 0,
                start: clampYMD(p.first_start_date ?? p.project_created_on),
                task_completed: +p.task_completed_sum || 0,
                task_inprogress: +p.task_inprogress_sum || 0,
                task_reworked: +p.task_reworked_sum || 0,
                task_approved: +p.task_approved_sum || 0,
                task_rejected: +p.task_rejected_sum || 0,
                task_reviewed: +p.task_reviewed_sum || 0,
                project_created_on: clampYMD(p.project_created_on),
                status: String(p.status ?? "1"),
              }))
            : [];
          setRows(projectData);

          const uniq = (arr) =>
            Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b));
          setManagers(uniq(projectData.map((p) => p.manager)));
          setLeads(uniq(projectData.map((p) => p.lead)));
          setPodLeads(uniq(projectData.map((p) => p.pod)));
        } else {
          setError(dashRes.message || "Failed to load dashboard data");
        }
      } catch (err) {
        console.error("Failed loading projects or employee names", err);
        setError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // default to Today
    setScope("today");
    setFromYMD(today);
    setToYMD(today);
    setPage(1);
  }, [today]);

  // reset page when filters/data change
  React.useEffect(() => {
    setPage(1);
  }, [scope, fManager, fLead, fPod, fromYMD, toYMD, rows, selectedProject, showInactive]); // [UPDATED] include showInactive

  // date chip handlers
  const setToday = () => { setScope("today"); setFromYMD(today); setToYMD(today); };
  const setWeek = () => {
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 6);
    setScope("week"); setFromYMD(ymd(start)); setToYMD(ymd(end));
  };
  const setMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setScope("month"); setFromYMD(ymd(start)); setToYMD(ymd(end));
  };
  const setOverall = () => { setScope("overall"); setFromYMD(""); setToYMD(""); };

  // filtered rows for the table
  const filtered = React.useMemo(() => {
    let d = rows.slice();
    if (fManager) d = d.filter((r) => r.manager === fManager);
    if (fLead) d = d.filter((r) => r.lead === fLead);
    if (fPod) d = d.filter((r) => r.pod === fPod);
    const f = fromYMD ? clampYMD(fromYMD) : "";
    const t = toYMD ? clampYMD(toYMD) : "";
    let f2 = f, t2 = t;
    if (f && t && f > t) { f2 = t; t2 = f; }
    if (f2) d = d.filter((r) => clampYMD(r.start) >= f2);
    if (t2) d = d.filter((r) => clampYMD(r.start) <= t2);
    // inactive toggle
    if (showInactive) {
      d = d.filter(r => String(r.status) === "0");       // only inactive
    } else {
      d = d.filter(r => String(r.status ?? "1") !== "0"); // hide inactive
    }
    return d;
  }, [rows, fManager, fLead, fPod, fromYMD, toYMD, showInactive]); // [UPDATED] include showInactive

  // [NEW] list of project names (for the selector)
  const projectNames = React.useMemo(
    () => Array.from(new Set(filtered.map(r => r.project).filter(Boolean))).sort(),
    [filtered]
  );

  // [NEW] rows targeted by charts (either all filtered, or just the selected project)
  const chartRows = React.useMemo(() => {
    if (!selectedProject) return filtered;
    return filtered.filter(r => r.project === selectedProject);
  }, [filtered, selectedProject]);

  // [NEW] aggregate status sums + hours for chartRows
  const sums = React.useMemo(() => {
    const s = {
      completed: 0, inprogress: 0, reworked: 0,
      approved: 0, rejected: 0, reviewed: 0, hours: 0
    };
    chartRows.forEach(r => {
      s.completed  += Number(r.task_completed   || 0);
      s.inprogress += Number(r.task_inprogress || 0);
      s.reworked   += Number(r.task_reworked   || 0);
      s.approved   += Number(r.task_approved   || 0);
      s.rejected   += Number(r.task_rejected   || 0);
      s.reviewed   += Number(r.task_reviewed   || 0);
      s.hours      += Number(r.hours           || 0);
    });
    return s;
  }, [chartRows]);

  // [NEW] chart data
  const barData = React.useMemo(() => ([
    { status: "Completed",  count: sums.completed },
    { status: "In Progress",count: sums.inprogress },
    { status: "Reworked",   count: sums.reworked },
    { status: "Approved",   count: sums.approved },
    { status: "Rejected",   count: sums.rejected },
    { status: "Reviewed",   count: sums.reviewed },
  ]), [sums]);

  // For the line chart: label = project (overall) or start date (single project); y = hours
  const lineData = React.useMemo(() => {
    if (!chartRows.length) return [];
    if (selectedProject) {
      // one project → if duplicates exist, show each start-date point; else single point
      return chartRows
        .map(r => ({ label: toDMY(r.start) || r.project, hrs: Number(r.hours || 0) }))
        .sort((a,b) => (a.label || "").localeCompare(b.label || ""));
    }
    // overall → show each project's hours (label by project name)
    return chartRows
      .map(r => ({ label: r.project, hrs: Number(r.hours || 0) }))
      .sort((a,b) => (a.label || "").localeCompare(b.label || ""));
  }, [chartRows, selectedProject]);

  // pagination
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const startIndex = (pageSafe - 1) * pageSize;
  const pagedRows = filtered.slice(startIndex, startIndex + pageSize);

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

  if (error) {
    return (
      <AppLayout>
        <div className="p-3"><div className="alert alert-danger">{error}</div></div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="pm-dashboard container-fluid px-0">

        {/* === OVERVIEW CARD === */}
        <div className="card shadow-sm mb-2">
          <div className="card-header">
            <div className="d-flex flex-wrap align-items-center gap-2">
              <h6 className="mb-2 mb-md-0">Overview</h6>

              <div className="d-flex flex-wrap align-items-center justify-content-between gap-2" style={{ width: "95%" }}>
                <div className="btn-group pm-chip-group" role="group" aria-label="range">
                  <button className={`btn btn-sm ${scope === "today" ? "active" : ""}`} onClick={setToday}>Today</button>
                  <button className={`btn btn-sm ${scope === "week" ? "active" : ""}`} onClick={setWeek}>Week</button>
                  <button className={`btn btn-sm ${scope === "month" ? "active" : ""}`} onClick={setMonth}>Month</button>
                  <button className={`btn btn-sm ${scope === "overall" ? "active" : ""}`} onClick={setOverall}>Overall</button>
                </div>

                <div className="form-check form-switch d-flex align-items-center me-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="dashShowInactive"
                    checked={showInactive}
                    onChange={(e) => {
                      setShowInactive(e.target.checked);
                      setSelectedProject(""); // avoid selecting a project that disappears
                    }}
                  />
                  <label className="form-check-label ms-2" htmlFor="dashShowInactive">
                    Show inactive
                  </label>
                </div>

                <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                  {/* date inputs */}
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="From Date"
                    className="form-control form-control-sm pm-compact-input"
                    value={fromYMD}
                    onChange={(e)=>{ setFromYMD(clampYMD(e.target.value)); setScope("custom"); setSelectedProject(""); }}
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="To Date"
                    className="form-control form-control-sm pm-compact-input"
                    value={toYMD}
                    onChange={(e)=>{ setToYMD(clampYMD(e.target.value)); setScope("custom"); setSelectedProject(""); }}
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                  />

                  {/* [NEW] Project selector for charts */}
                  <select
                    className="form-select form-select-sm pm-compact-select"
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    title="Filter charts by project"
                  >
                    <option value="">All Projects</option>
                    {projectNames.map((p, i) => <option key={i} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="card-body d-flex flex-column p-0">
            <div className="table-responsive">
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Trainer (Count)</th>
                    <th>Duration (Hours)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((r, idx) => (
                    <tr key={idx} className={selectedProject === r.project ? "table-primary" : ""}>
                      <td>
                        {/* [NEW] click-to-select project for charts */}
                        <button
                          type="button"
                          className="btn btn-link p-0 text-decoration-none"
                          onClick={() => setSelectedProject(p => p === r.project ? "" : r.project)}
                          title="Show charts for this project"
                        >
                          {r.project}
                        </button>
                      </td>
                      <td>{r.trainers}</td>
                      <td>{r.hours}</td>
                      <td>{r.status === "1" ? "Active" : "Inactive"}</td>
                    </tr>
                  ))}

                  {pagedRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">No rows match the current filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-3 pb-2 small mt-auto" style={{ color: "#6b7280" }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  Scope affects counts. Selecting a project updates the charts to that project only.
                </div>

                <div className="d-flex align-items-center" style={{ gap: 8 }}>
                  <div className="me-2">
                    {total === 0
                      ? "No rows"
                      : `Showing ${startIndex + 1} - ${Math.min(total, startIndex + pageSize)} of ${total}`}
                  </div>
                  <div className="btn-group btn-group-sm" role="group" aria-label="pagination">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pageSafe === 1}
                      title="Previous"
                    >
                      &laquo; Prev
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={pageSafe >= totalPages}
                      title="Next"
                    >
                      Next &raquo;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === CHARTS ROW === */}
        <div className="row g-2">
          <div className="col-12 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h6>Resource Availability</h6>
              </div>
              <div className="card-body">
                <ResourceAvailabilityChart />
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h6># of Tasks by Status {selectedProject ? `— ${selectedProject}` : "(All Projects)"}</h6> {/* [NEW] */}
              </div>
              <div className="card-body">
                <TasksStatusChart data={barData} /> {/* [NEW] */}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <h6>Hours {selectedProject ? `— ${selectedProject}` : "(All Projects)"}</h6> {/* [NEW] */}
              </div>
              <div className="card-body">
                <DailyHoursChart data={lineData} xKey="label" /> {/* [NEW] */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ========= Inner components (updated to accept props) ========= */

// unchanged sample pie (kept as-is)
function ResourceAvailabilityChart() {
  const data = [
    { name: "Active", value: 50, color: "#3b81d6" },
    { name: "Idle",   value: 50, color: "#ff6d8c" },
  ];
  return (
    <>
      <div style={{width:"100%", height:260}}>
        <ResponsiveContainer>
          <PieChart margin={{ top: 10, right: 10, left:10, bottom: 0 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={85}
              outerRadius={120}
              startAngle={90}
              endAngle={-270}
              stroke="#fff"
              strokeWidth={2}
            >
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {data.map((d) => (
          <span key={d.name}><span className="dot" style={{background:d.color}}></span>{d.name}</span>
        ))}
      </div>
    </>
  );
}

// [UPDATED] now takes `data` prop in shape [{ status, count }]
function TasksStatusChart({ data = [] }) {
  return (
    <div style={{width:"100%", height:260}}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey="status" tick={{ fill:"#6b7280" }} />
          <YAxis tick={{ fill:"#6b7280" }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="count" fill="#b7d3f9" stroke="#b7d3f9" maxBarSize={45} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// [UPDATED] now takes `data` prop in shape [{ label, hrs }] and optional xKey
function DailyHoursChart({ data = [], xKey = "label" }) {
  return (
    <div style={{width:"100%", height:260}}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill:"#6b7280" }} />
          <YAxis tick={{ fill:"#6b7280" }} />
          <Tooltip />
          <Line type="monotone" dataKey="hrs" stroke="#3b81d6" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
