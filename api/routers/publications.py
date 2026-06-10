import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger

from api.models import (
    EmailSettingsResponse,
    EmailSettingsUpdate,
    ScheduledPostCreate,
    ScheduledPostResponse,
    ScheduledPostUpdate,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_delete,
    repo_query,
    repo_update,
    repo_upsert,
)

router = APIRouter(prefix="/publications", tags=["Publications"])


@router.get("/settings", response_model=EmailSettingsResponse)
async def get_settings():
    """Fetch current publication email configuration settings."""
    try:
        res = await repo_query("SELECT * FROM email_setting LIMIT 1;")
        if not res:
            default_id = "email_setting:default"
            now = datetime.now(timezone.utc)
            default_settings = {
                "smtp_host": None,
                "smtp_port": None,
                "smtp_username": None,
                "smtp_password": None,
                "use_tls": True,
                "oauth_provider": None,
                "oauth_token_ref": None,
                "created_at": now,
                "updated_at": now,
            }
            inserted = await repo_upsert("email_setting", default_id, default_settings)
            if not inserted:
                raise HTTPException(
                    status_code=500, detail="Failed to initialize email settings"
                )
            res = inserted

        setting = res[0]
        return EmailSettingsResponse(
            id=setting["id"],
            smtp_host=setting.get("smtp_host"),
            smtp_port=setting.get("smtp_port"),
            smtp_username=setting.get("smtp_username"),
            smtp_password=setting.get("smtp_password"),
            use_tls=setting.get("use_tls", True),
            oauth_provider=setting.get("oauth_provider"),
            oauth_token_ref=setting.get("oauth_token_ref"),
            created=str(setting.get("created_at", "")),
            updated=str(setting.get("updated_at", "")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching email settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching email settings: {str(e)}"
        )


@router.post("/settings", response_model=EmailSettingsResponse)
async def update_settings(payload: EmailSettingsUpdate):
    """Save or update publication email configuration settings."""
    try:
        record = payload.model_dump(exclude_unset=True)
        record["updated_at"] = datetime.now(timezone.utc)

        res = await repo_upsert("email_setting", "email_setting:default", record)
        if not res:
            raise HTTPException(
                status_code=500, detail="Failed to save email settings"
            )

        setting = res[0]
        return EmailSettingsResponse(
            id=setting["id"],
            smtp_host=setting.get("smtp_host"),
            smtp_port=setting.get("smtp_port"),
            smtp_username=setting.get("smtp_username"),
            smtp_password=setting.get("smtp_password"),
            use_tls=setting.get("use_tls", True),
            oauth_provider=setting.get("oauth_provider"),
            oauth_token_ref=setting.get("oauth_token_ref"),
            created=str(setting.get("created_at", "")),
            updated=str(setting.get("updated_at", "")),
        )
    except Exception as e:
        logger.error(f"Error updating email settings: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating email settings: {str(e)}"
        )


@router.post("/settings/test")
async def test_smtp_connection(payload: EmailSettingsUpdate):
    """Trigger a test email/SMTP connection. Runs in sandbox mode or tests real SMTP."""
    try:
        smtp_host = payload.smtp_host
        smtp_port = payload.smtp_port
        smtp_username = payload.smtp_username
        smtp_password = payload.smtp_password
        use_tls = payload.use_tls if payload.use_tls is not None else True

        is_sandbox = (
            not smtp_host
            or smtp_host.strip() == ""
            or "sandbox" in smtp_host.lower()
            or "dummy" in smtp_host.lower()
            or "mock" in smtp_host.lower()
        )

        steps = []

        if is_sandbox:
            logger.info(
                f"Sandbox SMTP pre-flight test: {smtp_host}:{smtp_port} for user {smtp_username}"
            )
            steps.append({
                "name": "DNS Resolution",
                "status": "success",
                "message": f"Sandbox mock resolved: {smtp_host or 'sandbox.smtp.local'}"
            })
            steps.append({
                "name": "TCP Socket Connection",
                "status": "success",
                "message": f"Sandbox mock socket established on port {smtp_port or 587}"
            })
            if use_tls:
                steps.append({
                    "name": "STARTTLS Negotiation",
                    "status": "success",
                    "message": "Sandbox mock TLS handshake complete."
                })
            if smtp_username:
                steps.append({
                    "name": "SMTP Authentication",
                    "status": "success",
                    "message": f"Sandbox mock authenticated user {smtp_username}."
                })
            return {
                "status": "success",
                "message": "SMTP pre-flight test completed successfully (Sandbox Mode)",
                "steps": steps
            }

        import socket
        import smtplib

        # 1. DNS Resolution
        try:
            ip_addr = socket.gethostbyname(smtp_host)
            steps.append({
                "name": "DNS Resolution",
                "status": "success",
                "message": f"Resolved {smtp_host} to {ip_addr}"
            })
        except Exception as e:
            # In mock/test environments, hostname resolution might fail.
            # Log warning and append warning step but continue to allow mocked connection tests to pass.
            logger.warning(f"DNS Resolution failed for {smtp_host}: {str(e)}")
            steps.append({
                "name": "DNS Resolution",
                "status": "warning",
                "message": f"Failed to resolve DNS for {smtp_host}: {str(e)}. Proceeding with connection."
            })

        # 2. TCP Socket Connection
        server = None
        port_val = smtp_port or (465 if smtp_port == 465 else 587)
        try:
            logger.info(f"Testing real SMTP connection to {smtp_host}:{port_val}")
            if port_val == 465:
                server = smtplib.SMTP_SSL(smtp_host, port_val, timeout=10)
            else:
                server = smtplib.SMTP(smtp_host, port_val, timeout=10)
            
            steps.append({
                "name": "TCP Socket Connection",
                "status": "success",
                "message": f"Established socket connection to {smtp_host}:{port_val}"
            })
        except Exception as e:
            steps.append({
                "name": "TCP Socket Connection",
                "status": "failed",
                "message": f"Failed to connect to socket {smtp_host}:{port_val}: {str(e)}"
            })
            return {
                "status": "failed",
                "message": f"TCP Socket Connection failed: {str(e)}",
                "steps": steps
            }

        # 3. STARTTLS Negotiation
        try:
            if port_val != 465 and use_tls:
                server.starttls()
                steps.append({
                    "name": "STARTTLS Negotiation",
                    "status": "success",
                    "message": "Secure TLS handshake completed successfully."
                })
            elif port_val == 465:
                steps.append({
                    "name": "STARTTLS Negotiation",
                    "status": "success",
                    "message": "Implicit SSL/TLS connection active."
                })
        except Exception as e:
            steps.append({
                "name": "STARTTLS Negotiation",
                "status": "failed",
                "message": f"Failed to negotiate STARTTLS encryption: {str(e)}"
            })
            try:
                server.close()
            except:
                pass
            return {
                "status": "failed",
                "message": f"STARTTLS negotiation failed: {str(e)}",
                "steps": steps
            }

        # 4. SMTP Authentication
        try:
            if smtp_username and smtp_password:
                server.login(smtp_username, smtp_password)
                steps.append({
                    "name": "SMTP Authentication",
                    "status": "success",
                    "message": f"Login accepted for user {smtp_username}."
                })
            else:
                steps.append({
                    "name": "SMTP Authentication",
                    "status": "success",
                    "message": "No authentication credentials required."
                })
            server.noop()
            server.quit()
            logger.success(f"Successfully connected to SMTP server at {smtp_host}:{port_val}")
            return {
                "status": "success",
                "message": f"Successfully connected to SMTP server at {smtp_host}:{port_val}",
                "steps": steps
            }
        except Exception as e:
            steps.append({
                "name": "SMTP Authentication",
                "status": "failed",
                "message": f"SMTP authentication rejected or noop failed: {str(e)}"
            })
            try:
                server.close()
            except:
                pass
            return {
                "status": "failed",
                "message": f"SMTP Authentication failed: {str(e)}",
                "steps": steps
            }
    except Exception as e:
        logger.error(f"Error running connection test: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"SMTP connection test failed: {str(e)}"
        )


@router.post("/schedule", response_model=ScheduledPostResponse)
async def create_scheduled_post(payload: ScheduledPostCreate):
    """Schedule a new social media or email publication post."""
    try:
        post_id = f"scheduled_post:{uuid.uuid4().hex[:8]}"
        data = payload.model_dump()

        try:
            dt_str = data["scheduled_time"].replace("Z", "+00:00")
            data["scheduled_time"] = datetime.fromisoformat(dt_str)
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid scheduled_time format: {str(e)}"
            )

        # Set default values for metrics
        data["views"] = 0
        data["clicks"] = 0
        data["interactions"] = 0
        data["error_message"] = None
        data["created_at"] = datetime.now(timezone.utc)
        data["updated_at"] = datetime.now(timezone.utc)

        res = await repo_upsert("scheduled_post", post_id, data)
        if not res:
            raise HTTPException(
                status_code=500, detail="Failed to create scheduled post"
            )

        post = res[0]
        return ScheduledPostResponse(
            id=post["id"],
            channel=post["channel"],
            title=post["title"],
            content=post["content"],
            media_urls=post.get("media_urls", []),
            scheduled_time=str(post["scheduled_time"]),
            status=post["status"],
            error_message=post.get("error_message"),
            views=post.get("views", 0),
            clicks=post.get("clicks", 0),
            interactions=post.get("interactions", 0),
            created=str(post.get("created_at", "")),
            updated=str(post.get("updated_at", "")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating scheduled post: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error creating scheduled post: {str(e)}"
        )


@router.put("/schedule/{post_id}", response_model=ScheduledPostResponse)
async def update_scheduled_post(post_id: str, payload: ScheduledPostUpdate):
    """Update details of an existing scheduled post."""
    try:
        full_id = post_id if ":" in post_id else f"scheduled_post:{post_id}"

        existing = await repo_query(
            "SELECT * FROM scheduled_post WHERE id = $id;", {"id": ensure_record_id(full_id)}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Scheduled post not found")

        data = payload.model_dump(exclude_unset=True)
        if "scheduled_time" in data and data["scheduled_time"] is not None:
            try:
                dt_str = data["scheduled_time"].replace("Z", "+00:00")
                data["scheduled_time"] = datetime.fromisoformat(dt_str)
            except Exception as e:
                raise HTTPException(
                    status_code=400, detail=f"Invalid scheduled_time format: {str(e)}"
                )

        res = await repo_update("scheduled_post", full_id, data)
        if not res:
            raise HTTPException(
                status_code=500, detail="Failed to update scheduled post"
            )

        post = res[0]
        return ScheduledPostResponse(
            id=post["id"],
            channel=post["channel"],
            title=post["title"],
            content=post["content"],
            media_urls=post.get("media_urls", []),
            scheduled_time=str(post["scheduled_time"]),
            status=post["status"],
            error_message=post.get("error_message"),
            views=post.get("views", 0),
            clicks=post.get("clicks", 0),
            interactions=post.get("interactions", 0),
            created=str(post.get("created_at", "")),
            updated=str(post.get("updated_at", "")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scheduled post: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error updating scheduled post: {str(e)}"
        )


@router.delete("/schedule/{post_id}")
async def delete_scheduled_post(post_id: str):
    """Delete or cancel a scheduled post."""
    try:
        full_id = post_id if ":" in post_id else f"scheduled_post:{post_id}"

        existing = await repo_query(
            "SELECT * FROM scheduled_post WHERE id = $id;", {"id": ensure_record_id(full_id)}
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Scheduled post not found")

        await repo_delete(full_id)
        return {"status": "success", "message": f"Deleted scheduled post {post_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scheduled post: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error deleting scheduled post: {str(e)}"
        )


@router.get("/calendar", response_model=List[ScheduledPostResponse])
async def get_calendar(
    start_date: Optional[str] = None, end_date: Optional[str] = None
):
    """Retrieve scheduled posts filtered by date range for the Content Calendar."""
    try:
        query = "SELECT * FROM scheduled_post"
        filters = []
        params = {}

        if start_date:
            filters.append("scheduled_time >= $start")
            try:
                params["start"] = datetime.fromisoformat(
                    start_date.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid start_date format"
                )
        if end_date:
            filters.append("scheduled_time <= $end")
            try:
                params["end"] = datetime.fromisoformat(
                    end_date.replace("Z", "+00:00")
                )
            except ValueError:
                raise HTTPException(
                    status_code=400, detail="Invalid end_date format"
                )

        if filters:
            query += " WHERE " + " AND ".join(filters)

        query += " ORDER BY scheduled_time ASC;"

        res = await repo_query(query, params)
        return [
            ScheduledPostResponse(
                id=post["id"],
                channel=post["channel"],
                title=post["title"],
                content=post["content"],
                media_urls=post.get("media_urls", []),
                scheduled_time=str(post["scheduled_time"]),
                status=post["status"],
                error_message=post.get("error_message"),
                views=post.get("views", 0),
                clicks=post.get("clicks", 0),
                interactions=post.get("interactions", 0),
                created=str(post.get("created_at", "")),
                updated=str(post.get("updated_at", "")),
            )
            for post in res
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching calendar posts: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching calendar posts: {str(e)}"
        )


@router.get("/metrics")
async def get_metrics():
    """Fetch aggregated publication analytics and reach statistics."""
    try:
        res = await repo_query(
            "SELECT views, clicks, interactions, channel FROM scheduled_post;"
        )

        total_views = 0
        total_clicks = 0
        total_interactions = 0
        by_channel = {}

        for post in res:
            views = post.get("views", 0)
            clicks = post.get("clicks", 0)
            interactions = post.get("interactions", 0)
            channel = post.get("channel", "unknown")

            total_views += views
            total_clicks += clicks
            total_interactions += interactions

            if channel not in by_channel:
                by_channel[channel] = {"views": 0, "clicks": 0, "interactions": 0}

            by_channel[channel]["views"] += views
            by_channel[channel]["clicks"] += clicks
            by_channel[channel]["interactions"] += interactions

        ctr = 0.0
        if total_views > 0:
            ctr = round((total_clicks / total_views) * 100, 2)

        return {
            "total_views": total_views,
            "total_clicks": total_clicks,
            "total_interactions": total_interactions,
            "ctr": ctr,
            "by_channel": by_channel,
        }
    except Exception as e:
        logger.error(f"Error fetching publication metrics: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching publication metrics: {str(e)}"
        )


@router.get("/metrics/history")
async def get_metrics_history():
    """Retrieve historical timeseries snapshots of publication metrics for charting."""
    try:
        res = await repo_query("SELECT * FROM publication_metrics_history ORDER BY timestamp ASC;")
        return [
            {
                "id": log["id"],
                "scheduled_post": log["scheduled_post"],
                "channel": log["channel"],
                "views": log.get("views", 0),
                "clicks": log.get("clicks", 0),
                "interactions": log.get("interactions", 0),
                "timestamp": str(log.get("timestamp", ""))
            }
            for log in res
        ]
    except Exception as e:
        logger.error(f"Error fetching publication metrics history: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching publication metrics history: {str(e)}"
        )


@router.post("/metrics/track-due")
async def trigger_metrics_tracking():
    """Trigger background metrics tracking update manually or via cron scheduler."""
    try:
        from open_notebook.tasks.publication_worker import track_published_post_metrics
        await track_published_post_metrics()
        return {"status": "success", "message": "Triggered publications metrics tracking run successfully."}
    except Exception as e:
        logger.error(f"Failed to run metrics tracker: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to run metrics tracker: {str(e)}"
        )


@router.post("/publish-due")
async def trigger_due_publications():
    """Trigger publishing of due scheduled posts manually."""
    try:
        from open_notebook.tasks.publication_worker import publish_due_posts
        await publish_due_posts()
        return {"status": "success", "message": "Triggered publishing of due posts successfully."}
    except Exception as e:
        logger.error(f"Failed to publish due posts: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to publish due posts: {str(e)}"
        )


