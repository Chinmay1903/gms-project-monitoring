from pg_db import database,projects, project_staffing, employees, task_monitors
from sqlalchemy import select, func, case, literal

# --- NEW IMPORTS FOR PDF & CHARTS ---
import io
import matplotlib
import math
matplotlib.use("Agg")  # needed on servers with no display
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (SimpleDocTemplate,Table,TableStyle,Paragraph,Spacer,Image)
from reportlab.lib import colors
# ------------------------------------

class DashboardCurdOperation:

    ## Dashboard Summary
    @staticmethod
    async def get_dashboard_summary():
        p  = projects.alias("p")
        ps = project_staffing.alias("ps")
        e  = employees.alias("e")
        tm = task_monitors.alias("tm")

        # normalize to collapse case/space duplicates of project_name
        norm_name = func.trim(func.lower(p.c.project_name))

        # correct join path for new schema:
        # projects p
        #   ← ps.project_id
        # project_staffing ps
        #   ← tm.project_staffing_id
        # task_monitors tm
        #   → e via ps.employees_id
        j = (
            p.outerjoin(ps, ps.c.project_id == p.c.project_id)
            .outerjoin(tm, tm.c.project_staffing_id == ps.c.id)
            .outerjoin(e,  e.c.employees_id == ps.c.employees_id)
        )

        # active if ANY row under this normalized name is '1'
        active_flag = case(
            (func.bool_or(p.c.status == literal('1')), literal('1')),
            else_=literal('0')
        ).label("status")

        query = (
            select(
                func.min(p.c.project_name).label("project_name"),      # representative original name
                active_flag,
                # aggregates from staffing
                func.string_agg(func.distinct(ps.c.gms_manager), literal(', ')).label("manager_name"),
                func.string_agg(func.distinct(ps.c.t_manager),    literal(', ')).label("lead_name"),
                func.string_agg(func.distinct(ps.c.pod_lead),     literal(', ')).label("pod_lead_name"),
                func.count(func.distinct(e.c.employees_id)).label("num_trainers"),
                # task aggregates (via tm)
                func.coalesce(func.sum(tm.c.task_completed),  0).label("task_completed_sum"),
                func.coalesce(func.sum(tm.c.task_inprogress), 0).label("task_inprogress_sum"),
                func.coalesce(func.sum(tm.c.task_reworked),   0).label("task_reworked_sum"),
                func.coalesce(func.sum(tm.c.task_approved),   0).label("task_approved_sum"),
                func.coalesce(func.sum(tm.c.task_rejected),   0).label("task_rejected_sum"),
                func.coalesce(func.sum(tm.c.task_reviewed),   0).label("task_reviewed_sum"),
                func.coalesce(func.sum(tm.c.hours_logged),    0).label("hours_logged_sum"),
                # dates
                func.min(tm.c.task_date).label("first_task_date"),
                func.min(p.c.created_at).label("project_created_on"),
            )
            .select_from(j)
            .group_by(norm_name, p.c.status)           # one row per normalized name & status bucket
            .order_by(func.min(p.c.project_name))
        )

        rows = await database.fetch_all(query)
        return [dict(r) for r in rows]
    
    ## Dashboard Summary PDF
    @staticmethod
    async def get_dashboard_summary_pdf() -> bytes:
        """
        Fetches the dashboard summary and returns a PDF (as bytes)
        that roughly matches the web dashboard (table + charts).
        """
        summary = await DashboardCurdOperation.get_dashboard_summary()
        pdf_bytes = create_dashboard_pdf(summary)
        return pdf_bytes


# ========== Helper functions for PDF generation ==========

def _make_matplotlib_image(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf



def _build_charts(summary):
    """
    Build three charts:
    1. Donut chart: trainers Active vs Idle
       - Active: trainers on projects where hours_logged_sum > 0
       - Idle: trainers on projects where hours_logged_sum == 0
    2. # of tasks by status (bar)
    3. Hours by project (line)
    """
    charts = {}

    # ---------- 1) Donut chart: Active vs Idle trainers ----------
    # total trainers across all projects
    total_trainers = _safe_int(
        sum(item.get("num_trainers", 0) or 0 for item in summary)
    )

    # trainers on projects that have logged any hours
    active_trainers = _safe_int(
        sum(
            (item.get("num_trainers", 0) or 0)
            for item in summary
            if _safe_float(item.get("hours_logged_sum", 0)) > 0
        )
    )

    # trainers on projects with 0 hours => idle
    idle_trainers = max(total_trainers - active_trainers, 0)

    if total_trainers > 0:
        sizes = [active_trainers, idle_trainers]
        labels = ["Active", "Idle"]

        # blue (active) + pink (idle) like your UI
        colors_list = ["#1f77b4", "#ff6384"]

        fig1, ax1 = plt.subplots()

        wedges, _ = ax1.pie(
            sizes,
            labels=None,  # legend instead
            colors=colors_list,
            startangle=90,
            wedgeprops=dict(width=0.35, edgecolor="white"),  # donut effect
        )

        ax1.set_title("Resource Availability — Trainers in All Projects")
        ax1.set_aspect("equal")

        legend_labels = [
            f"Active: {active_trainers}",
            f"Idle: {idle_trainers}",
        ]
        ax1.legend(
            wedges,
            legend_labels,
            loc="lower center",
            bbox_to_anchor=(0.5, -0.05),
            ncol=2,
            frameon=False,
        )
    else:
        fig1, ax1 = plt.subplots()
        ax1.text(0.5, 0.5, "No trainer data", ha="center", va="center")
        ax1.set_axis_off()
        ax1.set_title("Resource Availability — Trainers in All Projects")

    charts["availability"] = _make_matplotlib_image(fig1)

    # ---------- 2) # of tasks by status (same as before) ----------
    statuses = [
        ("Completed", "task_completed_sum"),
        ("In Progress", "task_inprogress_sum"),
        ("Reworked", "task_reworked_sum"),
        ("Approved", "task_approved_sum"),
        ("Rejected", "task_rejected_sum"),
        ("Reviewed", "task_reviewed_sum"),
    ]

    x_labels = []
    y_values = []
    for label, key in statuses:
        x_labels.append(label)
        total_for_status = sum(_safe_int(item.get(key, 0)) for item in summary)
        y_values.append(total_for_status)

    fig2, ax2 = plt.subplots()
    ax2.bar(x_labels, y_values)
    ax2.set_title("# of Tasks by Status (All Projects)")
    ax2.set_ylabel("Tasks")
    ax2.set_xticklabels(x_labels, rotation=30, ha="right")
    charts["tasks_by_status"] = _make_matplotlib_image(fig2)

    # ---------- 3) Hours per project ----------
    if summary:
        project_names = [item.get("project_name", "") for item in summary]
        hours = [_safe_float(item.get("hours_logged_sum", 0)) for item in summary]

        fig3, ax3 = plt.subplots()
        ax3.plot(project_names, hours, marker="o")
        ax3.set_title("Hours (All Projects)")
        ax3.set_ylabel("Hours")
        ax3.set_xticklabels(project_names, rotation=60, ha="right")
    else:
        fig3, ax3 = plt.subplots()
        ax3.text(0.5, 0.5, "No hours data", ha="center", va="center")
        ax3.set_axis_off()
        ax3.set_title("Hours (All Projects)")

    charts["hours_by_project"] = _make_matplotlib_image(fig3)

    return charts


####
##helper
def _safe_float(value) -> float:
    """Convert to float, mapping None / NaN / inf to 0.0."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    if math.isnan(v) or math.isinf(v):
        return 0.0
    return v


def _safe_int(value) -> int:
    """Convert to int using _safe_float first."""
    return int(_safe_float(value))

def _compute_trainer_activity(summary):
    """
    Active trainer = trainer assigned to a project that has hours_logged_sum > 0
    Idle trainer   = trainer assigned to a project that has hours_logged_sum == 0 (or None)
    """
    active = 0
    idle = 0

    for row in summary:
        trainers = _safe_int(row.get("num_trainers", 0))
        if trainers <= 0:
            continue

        hours = _safe_float(row.get("hours_logged_sum", 0))

        if hours > 0:
            active += trainers
        else:
            idle += trainers

    return active, idle


def _make_matplotlib_image(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def _build_charts(summary):
    """
    Build three charts:
    1. Donut: Trainers Active vs Idle (your donut)
    2. Bar:   # of tasks by status
    3. Line:  Hours by project
    """
    charts = {}

    # ---------- 1) DONUT: Trainers Active vs Idle ----------
    active_trainers, idle_trainers = _compute_trainer_activity(summary)
    total_trainers = active_trainers + idle_trainers

    if total_trainers > 0:
        sizes = [active_trainers, idle_trainers]
        # Active = blue, Idle = pink (close to your UI colors)
        colors_list = ["#1f77b4", "#ff6384"]

        fig1, ax1 = plt.subplots()

        wedges, _ = ax1.pie(
            sizes,
            labels=None,  # use legend instead
            colors=colors_list,
            startangle=90,
            wedgeprops=dict(width=0.35, edgecolor="white"),  # donut effect
        )

        ax1.set_title("Resource Availability — Trainers in All Projects")
        ax1.set_aspect("equal")

        legend_labels = [
            f"Active: {active_trainers}",
            f"Idle: {idle_trainers}",
        ]
        ax1.legend(
            wedges,
            legend_labels,
            loc="lower center",
            bbox_to_anchor=(0.5, -0.05),
            ncol=2,
            frameon=False,
        )
    else:
        fig1, ax1 = plt.subplots()
        ax1.text(0.5, 0.5, "No trainer data", ha="center", va="center")
        ax1.set_axis_off()
        ax1.set_title("Resource Availability — Trainers in All Projects")

    charts["availability"] = _make_matplotlib_image(fig1)

    # ---------- 2) BAR: # of tasks by status ----------
    statuses = [
        ("Completed", "task_completed_sum"),
        ("In Progress", "task_inprogress_sum"),
        ("Reworked", "task_reworked_sum"),
        ("Approved", "task_approved_sum"),
        ("Rejected", "task_rejected_sum"),
        ("Reviewed", "task_reviewed_sum"),
    ]

    x_labels = []
    y_values = []
    for label, key in statuses:
        x_labels.append(label)
        total_for_status = sum(_safe_int(row.get(key, 0)) for row in summary)
        y_values.append(total_for_status)

    fig2, ax2 = plt.subplots()
    ax2.bar(x_labels, y_values)
    ax2.set_title("# of Tasks by Status (All Projects)")
    ax2.set_ylabel("Tasks")
    ax2.set_xticklabels(x_labels, rotation=30, ha="right")
    charts["tasks_by_status"] = _make_matplotlib_image(fig2)

    # ---------- 3) LINE: Hours by project ----------
    if summary:
        project_names = [row.get("project_name", "") for row in summary]
        hours = [_safe_float(row.get("hours_logged_sum", 0)) for row in summary]

        fig3, ax3 = plt.subplots()
        ax3.plot(project_names, hours, marker="o")
        ax3.set_title("Hours (All Projects)")
        ax3.set_ylabel("Hours")
        ax3.set_xticklabels(project_names, rotation=60, ha="right")
    else:
        fig3, ax3 = plt.subplots()
        ax3.text(0.5, 0.5, "No hours data", ha="center", va="center")
        ax3.set_axis_off()
        ax3.set_title("Hours (All Projects)")

    charts["hours_by_project"] = _make_matplotlib_image(fig3)

    return charts

def create_dashboard_pdf(summary) -> bytes:
    """
    summary: list[dict] from get_dashboard_summary.
    Returns: PDF as bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=20,
        rightMargin=20,
        topMargin=20,
        bottomMargin=20,
    )

    elements = []
    styles = getSampleStyleSheet()

    # ----- Title -----
    elements.append(Paragraph("GMS Project Dashboard Summary", styles["Title"]))
    elements.append(Spacer(1, 10))

    # ----- Small stats line -----
    total_projects = len(summary)
    active_projects = sum(1 for item in summary if item.get("status") == "1")
    inactive_projects = total_projects - active_projects

    elements.append(
        Paragraph(
            f"Total projects: {total_projects} | Active: {active_projects} | Inactive: {inactive_projects}",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 12))

    # ----- Projects table -----
    table_data = [["Project", "Manager", "Lead", "Pod Lead", "Trainers", "Hours", "Status"]]

    for item in summary:
        table_data.append(
            [
                item.get("project_name", ""),
                item.get("manager_name") or "",
                item.get("lead_name") or "",
                item.get("pod_lead_name") or "",
                str(_safe_int(item.get("num_trainers", 0))),
                str(_safe_float(item.get("hours_logged_sum", 0))),
                "Active" if item.get("status") == "1" else "Inactive",
            ]
        )

    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
            ]
        )
    )
    elements.append(table)
    elements.append(Spacer(1, 16))

    # ----- Charts -----
    charts = _build_charts(summary)

    for key, title in [
        ("availability", "Resource Availability"),
        ("tasks_by_status", "Tasks by Status"),
        ("hours_by_project", "Hours by Project"),
    ]:
        img_buf = charts[key]
        elements.append(Paragraph(title, styles["Heading2"]))
        elements.append(Spacer(1, 6))
        elements.append(Image(img_buf, width=350, height=220))
        elements.append(Spacer(1, 16))

    doc.build(elements)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
