from pg_db import database,projects, project_staffing, employees, task_monitors
from sqlalchemy import select, func, case, literal

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
