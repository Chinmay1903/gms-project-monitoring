from pg_db import database,task_monitors, employees, projects
from sqlalchemy import select, func, literal_column, case, literal

class DashboardCurdOperation:

    ## Dashboard Summary
    @staticmethod
    async def get_dashboard_summary():
        norm_name = func.trim(func.lower(projects.c.project_name))  # handles case/space dupes

        proj_tm = projects.outerjoin(task_monitors, projects.c.project_id == task_monitors.c.project_id)

        query = (
            select(
                # show a representative name as originally stored (e.g., MIN)
                func.min(projects.c.project_name).label("project_name"),

                case(
                    (func.bool_or(projects.c.status == literal('1')), '1'),
                    else_='0'
                ).label("status"),
                func.coalesce(func.sum(task_monitors.c.task_completed), 0).label("task_completed_sum"),

                # list all distinct people seen for this project name
                func.string_agg(func.distinct(projects.c.gms_manager), literal_column("', '")).label("manager_name"),
                func.string_agg(func.distinct(projects.c.lead_name),  literal_column("', '")).label("lead_name"),
                func.string_agg(func.distinct(projects.c.pod_name),   literal_column("', '")).label("pod_lead_name"),
                
                # number of distinct trainers
                func.count(func.distinct(projects.c.trainer_name)).label("num_trainers"),

                # task aggregates
                func.coalesce(func.sum(task_monitors.c.task_completed),  0).label("task_completed_sum"),
                func.coalesce(func.sum(task_monitors.c.task_inprogress), 0).label("task_inprogress_sum"),
                func.coalesce(func.sum(task_monitors.c.task_reworked),   0).label("task_reworked_sum"),
                func.coalesce(func.sum(task_monitors.c.task_approved),   0).label("task_approved_sum"),
                func.coalesce(func.sum(task_monitors.c.task_rejected),   0).label("task_rejected_sum"),
                func.coalesce(func.sum(task_monitors.c.task_reviewed),   0).label("task_reviewed_sum"),
                func.coalesce(func.sum(task_monitors.c.hours_logged),    0).label("hours_logged_sum"),

                # dates
                func.min(task_monitors.c.date).label("first_start_date"),
                func.min(projects.c.create_at).label("project_created_on"),
            )
            .select_from(proj_tm)
            .group_by(norm_name, projects.c.status)   # <-- ONE row per normalized name
            .order_by(func.min(projects.c.project_name))
        )

        rows = await database.fetch_all(query)
        result = [dict(r) for r in rows]
        return result
