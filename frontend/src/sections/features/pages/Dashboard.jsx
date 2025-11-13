import React, { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import PaginationBar from "../components/PaginationBar";
import SearchableSelect from "../components/SearchableSelect";
import {
  ResponsiveContainer, Tooltip, CartesianGrid, XAxis, YAxis,
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell, LabelList
} from "recharts";
import { dashboardData } from "../../../api/features";
import "./Dashboard.css";

/* ---------- utils ---------- */
const ymd = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || "").slice(0, 10));
const onlyDate = (s) => (s ? String(s).split("T")[0] : "");
const toNum = (v) => Number(v ?? 0);

export default function Dashboard() {
  /* ---------- state ---------- */
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // date filters & range
  const [fromYMD, setFromYMD] = useState("");
  const [toYMD, setToYMD] = useState("");
  const [dataMin, setDataMin] = useState("");
  const [dataMax, setDataMax] = useState("");
  const [range, setRange] = useState("overall"); // today | week | month | overall | custom

  // status filter
  const [showInactive, setShowInactive] = useState(false);

  // project selection (drives charts + dropdown + row highlight)
  const [selectedProject, setSelectedProject] = useState("");

  // pagination
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  /* ---------- load ---------- */
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await dashboardData(); // GET /api/dashboard/summary
        const list = Array.isArray(res?.data) ? res.data : [];
        const normalized = list.map((p) => {
          const start = onlyDate(p.first_task_date ?? p.project_created_on);
          return {
            project: p.project_name || "-",
            status: String(p.status ?? "1"),
            hours: toNum(p.hours_logged_sum),
            task_completed: toNum(p.task_completed_sum),
            task_inprogress: toNum(p.task_inprogress_sum),
            task_reworked: toNum(p.task_reworked_sum),
            task_approved: toNum(p.task_approved_sum),
            task_rejected: toNum(p.task_rejected_sum),
            task_reviewed: toNum(p.task_reviewed_sum),
            trainers: toNum(p.num_trainers),
            start,
          };
        });

        setRows(normalized);

        // auto range = dataset span (min..max)
        const ds = normalized.map((r) => r.start).filter(Boolean).sort();
        if (ds.length) {
          setFromYMD(ds[0]); setToYMD(ds[ds.length - 1]);
          setDataMin(ds[0]); setDataMax(ds[ds.length - 1]);
          setRange("overall");
        } else {
          const t = ymd(new Date());
          setFromYMD(t); setToYMD(t);
          setDataMin(t); setDataMax(t);
          setRange("overall");
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // reset pagination when filters change
  useEffect(() => {
    setPage(1);
  }, [fromYMD, toYMD, showInactive, rows.length]);

  /* ---------- derived ---------- */
  const projectOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.project).filter(Boolean))).sort(),
    [rows]
  );

  // table data (date + status only; project selection does NOT filter table)
  const filtered = useMemo(() => {
    let d = rows.slice();
    if (fromYMD) d = d.filter((r) => (r.start || "") >= fromYMD);
    if (toYMD) d = d.filter((r) => (r.start || "") <= toYMD);
    d = d.filter((r) => (showInactive ? r.status === "0" : r.status !== "0"));
    return d;
  }, [rows, fromYMD, toYMD, showInactive]);

  // pagination
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageRows = useMemo(() => filtered.slice(startIdx, startIdx + PAGE_SIZE), [filtered, startIdx]);

  // CHART SCOPE: if a project is selected → only that project; else all filtered rows
  const chartRows = useMemo(
    () => (selectedProject ? filtered.filter((r) => r.project === selectedProject) : filtered),
    [filtered, selectedProject]
  );

  // Charts data
  const statusBarData = useMemo(() => {
    const s = { inprogress: 0, completed: 0, reworked: 0, approved: 0, rejected: 0, reviewed: 0 };
    chartRows.forEach((r) => {
      s.inprogress += r.task_inprogress;
      s.completed += r.task_completed;
      s.reworked += r.task_reworked;
      s.approved += r.task_approved;
      s.rejected += r.task_rejected;
      s.reviewed += r.task_reviewed;
    });
    return [
      { label: "In Progress", value: s.inprogress },
      { label: "Completed", value: s.completed },
      { label: "Reworked", value: s.reworked },
      { label: "Approved", value: s.approved },
      { label: "Rejected", value: s.rejected },
      { label: "Reviewed", value: s.reviewed },
    ];
  }, [chartRows]);

  const hoursByProject = useMemo(() => {
    const base = chartRows.length ? chartRows : [];
    return base
      .map((r) => ({ project: r.project, hours: r.hours }))
      .sort((a, b) => a.project.localeCompare(b.project));
  }, [chartRows]);

  const availability = useMemo(() => {
    let active = 0, idle = 0;
    chartRows.forEach((r) => {
      if (!r.trainers) return;
      if (r.hours > 0) active += r.trainers;
      else idle += r.trainers;
    });
    return [
      { label: "Active", value: active, color: "#3b81d6" },
      { label: "Idle", value: idle, color: "#ff6d8c" },
    ];
  }, [chartRows]);

  /* ---------- actions ---------- */
  const setToday = () => {
    const t = ymd(new Date());
    setFromYMD(t); setToYMD(t); setRange("today");
  };
  const setWeek = () => {
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 6);
    setFromYMD(ymd(start)); setToYMD(ymd(end)); setRange("week");
  };
  const setMonth = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    setFromYMD(ymd(start)); setToYMD(ymd(end)); setRange("month");
  };
  const resetOverall = () => {
    if (dataMin && dataMax) { setFromYMD(dataMin); setToYMD(dataMax); }
    setRange("overall");
    setSelectedProject("");      // clear project focus (dropdown + row highlight)
  };

  // select project from dropdown or row; also jump to the page where it is
  const jumpToProjectRow = (proj) => {
    if (!proj) return;
    const idx = filtered.findIndex((r) => r.project === proj);
    if (idx >= 0) setPage(Math.floor(idx / PAGE_SIZE) + 1);
  };
  const handleDropdownProject = (proj) => {
    setSelectedProject(proj || "");
    if (proj) jumpToProjectRow(proj);
  };
  const handleRowClick = (proj) => {
    setSelectedProject((prev) => {
      const next = prev === proj ? "" : proj;
      if (next) jumpToProjectRow(next);
      return next;
    });
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <AppLayout>
        <div className="p-3 text-center"><div className="spinner-border text-primary" role="status" /></div>
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

  const todayMax = ymd(new Date());

  return (
    <AppLayout>
      <div className="pm-dashboard container-fluid px-0">
        {/* ======= TOP (toolbar + table) ======= */}
        <div className="card bg-body-tertiary border-3 rounded-3 shadow dash-top">
          {/* Header */}
          <div className="card-header bg-warning-subtle text-warning-emphasis dash-toolbar">
            <div className="toolbar-line d-flex align-items-center gap-2 flex-wrap">
              <div className="title">Dashboard Overview</div>

              {/* Range chips */}
              <div className="btn-group pm-chip-group" role="group" aria-label="range">
                <button className={`btn btn-outline-secondary btn-sm ${range === "today" ? "active" : ""}`} onClick={setToday}>Today</button>
                <button className={`btn btn-outline-secondary btn-sm ${range === "week" ? "active" : ""}`} onClick={setWeek}>Week</button>
                <button className={`btn btn-outline-secondary btn-sm ${range === "month" ? "active" : ""}`} onClick={setMonth}>Month</button>
              </div>

              {/* Reset → overall */}
              <button className="btn btn-outline-secondary btn-sm ms-1" onClick={resetOverall} title="Reset to overall">
                Reset
              </button>

              {/* dates: prefilled by dataset span, user-filterable */}
              <input
                type="text"
                inputMode="numeric"
                placeholder="From date"
                className="form-control form-control-sm pm-compact-input"
                value={fromYMD}
                onChange={(e) => { setFromYMD(onlyDate(e.target.value)); setRange("custom"); }}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                max={toYMD || todayMax}
              />
              <input
                type="text"
                inputMode="numeric"
                placeholder="To date"
                className="form-control form-control-sm pm-compact-input"
                value={toYMD}
                onChange={(e) => { setToYMD(onlyDate(e.target.value)); setRange("custom"); }}
                onFocus={(e) => (e.target.type = "date")}
                onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                min={fromYMD || ""}
                max={todayMax}
              />

              <div className="form-check form-switch switch-inline d-flex align-items-center">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="dashInactive"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                <label className="form-check-label ms-2" htmlFor="dashInactive">Show inactive</label>
              </div>

              {/* custom dropdown — bound to selectedProject */}
              <div className="ms-auto" style={{ minWidth: 220 }}>
                <SearchableSelect
                  items={projectOptions.map((p) => ({ id: p, name: p }))}
                  keyField="id"
                  labelField="name"
                  valueField="id"
                  value={selectedProject}
                  valueMode="value"
                  placeholder="All Projects"
                  onChange={handleDropdownProject}
                />
              </div>

              <div className="hint small text-muted">
                Click a row or use the dropdown to focus charts; Reset returns to overall.
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card-body d-flex flex-column p-0 dash-table-body">
            <div className="table-responsive flex-grow-1">
              <table className="table table-hover align-middle dash-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th className="text-center">Trainers</th>
                    <th className="text-center">Hours</th>
                    <th className="text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((r, i) => (
                    <tr
                      key={`${r.project}-${i}`}
                      className={selectedProject === r.project ? "table-primary" : ""}
                      onClick={() => handleRowClick(r.project)}
                      role="button"
                    >
                      <td className="fw-semibold"><span className="project-pill">{r.project}</span></td>
                      <td className="text-center">{r.trainers}</td>
                      <td className="text-center">{r.hours}</td>
                      <td className="text-center">
                        <span
                          className={
                            "badge rounded-pill " +
                            (r.status === "1"
                              ? "bg-success-subtle text-success-emphasis border border-success-subtle"
                              : "bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle")
                          }
                        >
                          {r.status === "1" ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4 text-muted">No rows match the filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="d-flex flex-wrap align-items-center justify-content-between px-3 py-2 dash-pagination">
              <div>
                {filtered.length === 0
                  ? "No rows"
                  : `Showing ${startIdx + 1}-${Math.min(filtered.length, startIdx + PAGE_SIZE)} of ${filtered.length}`}
              </div>
              <PaginationBar page={safePage} count={pageCount} onChange={setPage} />
            </div>
          </div>
        </div>

        {/* ======= Charts ======= */}
        <div className="dash-charts row g-2">
          {/* Availability */}
          <div className="col-12 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-header">
                <h6 className="mb-0">
                  Resource Availability — (Trainers in {selectedProject || "All Projects"})
                </h6>
              </div>
              <div className="card-body chart-body">
                <div className="chart-fill">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={availability}
                        dataKey="value"
                        nameKey="label"
                        innerRadius="60%"
                        outerRadius="85%"
                        startAngle={90}
                        endAngle={-270}
                        cornerRadius={12}
                        stroke="#fff"
                        strokeWidth={2}
                      >
                        {availability.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend">
                  {availability.map((d) => (
                    <span key={d.label}>
                      <span className="dot" style={{ background: d.color }}></span>
                      {d.label}: <strong>{d.value}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="col-12 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-header">
                <h6 className="mb-0"># of Tasks by Status {selectedProject ? `— ${selectedProject}` : "(All Projects)"}</h6>
              </div>
              <div className="card-body chart-body">
                <div className="chart-fill">
                  <ResponsiveContainer>
                    <BarChart data={statusBarData} margin={{ top: 20 }}>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis
                        className="barChartLabel"
                        dataKey="label"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        tickMargin={10}
                        height={60}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" maxBarSize={48} radius={[4, 4, 0, 0]} fill="#b7d3f9" stroke="#b7d3f9">
                        <LabelList dataKey="value" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="col-12 col-lg-4">
            <div className="card h-100 shadow-sm">
              <div className="card-header">
                <h6 className="mb-0">Hours {selectedProject ? `— ${selectedProject}` : "(All Projects)"}</h6>
              </div>
              <div className="card-body chart-body">
                <div className="chart-fill">
                  <ResponsiveContainer>
                    <AreaChart data={hoursByProject} margin={{ top: 24, right: 24 }}>
                      <defs> ... </defs>
                      <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                      <XAxis
                        className="barChartLabel"
                        dataKey="project"
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                        tickMargin={10}
                        height={60}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="hours"
                        stroke="#3b81d6"
                        strokeWidth={2}
                        fill="url(#hrsFill)"
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      >
                        <LabelList dataKey="hours" position="top" offset={8} />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> {/* /.pm-dashboard */}
    </AppLayout>
  );
}
