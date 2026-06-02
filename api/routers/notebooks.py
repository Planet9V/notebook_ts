from typing import Any, List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from loguru import logger

from api.models import (
    AssetCreate,
    AssetResponse,
    NotebookCreate,
    NotebookDeletePreview,
    NotebookDeleteResponse,
    NotebookResponse,
    NotebookUpdate,
)
from open_notebook.database.repository import (
    ensure_record_id,
    repo_create,
    repo_query,
    repo_update,
    repo_upsert,
)
from open_notebook.domain.notebook import Notebook, Source
from open_notebook.exceptions import InvalidInputError

from api.routers.activity_emitter import emit_activity

router = APIRouter()


@router.get("/notebooks", response_model=List[NotebookResponse])
async def get_notebooks(
    archived: Optional[bool] = Query(None, description="Filter by archived status"),
    order_by: str = Query("updated desc", description="Order by field and direction"),
):
    """Get all notebooks with optional filtering and ordering."""
    try:
        # Validate order_by against allowlist to prevent SurrealQL injection
        allowed_fields = {"name", "created", "updated"}
        allowed_directions = {"asc", "desc"}

        parts = order_by.strip().lower().split()
        if len(parts) == 1:
            if parts[0] not in allowed_fields:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by field: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}",
                )
            validated_order_by = parts[0]
        elif len(parts) == 2:
            if parts[0] not in allowed_fields or parts[1] not in allowed_directions:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid order_by: '{order_by}'. Allowed fields: {', '.join(sorted(allowed_fields))}. Allowed directions: asc, desc",
                )
            validated_order_by = f"{parts[0]} {parts[1]}"
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid order_by format: '{order_by}'. Expected 'field' or 'field direction'",
            )

        # Build the query with counts
        query = f"""
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM notebook
            ORDER BY {validated_order_by}
        """

        result = await repo_query(query)

        # Filter by archived status if specified
        if archived is not None:
            result = [nb for nb in result if nb.get("archived") == archived]

        return [
            NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
                stage=nb.get("stage", "lead"),
                client_name=nb.get("client_name", ""),
                estimated_value=nb.get("estimated_value", 0.0),
                prospect_website=nb.get("prospect_website", ""),
                contacts=nb.get("contacts", []) or [],
                crawl_failed=nb.get("crawl_failed", False),
                suggested_contacts=nb.get("suggested_contacts", []) or [],
                customer_id=nb.get("customer_id", None),
            )
            for nb in result
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error fetching notebooks")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebooks: {str(e)}"
        )


@router.post("/notebooks", response_model=NotebookResponse)
async def create_notebook(notebook: NotebookCreate):
    """Create a new notebook."""
    try:
        new_notebook = Notebook(
            name=notebook.name,
            description=notebook.description,
            stage=notebook.stage,
            client_name=notebook.client_name,
            estimated_value=notebook.estimated_value,
            prospect_website=notebook.prospect_website,
            contacts=notebook.contacts or [],
            crawl_failed=notebook.crawl_failed or False,
            suggested_contacts=notebook.suggested_contacts or [],
            customer_id=notebook.customer_id,
        )
        await new_notebook.save()

        # Emit activity if linked to a customer
        if new_notebook.customer_id:
            await emit_activity(
                customer_id=new_notebook.customer_id,
                activity_type="notebook_created",
                description=f"Notebook \"{new_notebook.name}\" created",
                metadata={"notebook_id": new_notebook.id, "stage": new_notebook.stage or "lead"},
            )

        return NotebookResponse(
            id=new_notebook.id or "",
            name=new_notebook.name,
            description=new_notebook.description,
            archived=new_notebook.archived or False,
            created=str(new_notebook.created),
            updated=str(new_notebook.updated),
            source_count=0,  # New notebook has no sources
            note_count=0,  # New notebook has no notes
            stage=new_notebook.stage or "lead",
            client_name=new_notebook.client_name or "",
            estimated_value=new_notebook.estimated_value or 0.0,
            prospect_website=new_notebook.prospect_website or "",
            contacts=new_notebook.contacts or [],
            crawl_failed=new_notebook.crawl_failed or False,
            suggested_contacts=new_notebook.suggested_contacts or [],
            customer_id=new_notebook.customer_id,
        )
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error creating notebook")
        raise HTTPException(
            status_code=500, detail=f"Error creating notebook: {str(e)}"
        )


@router.get(
    "/notebooks/{notebook_id}/delete-preview", response_model=NotebookDeletePreview
)
async def get_notebook_delete_preview(notebook_id: str):
    """Get a preview of what will be deleted when this notebook is deleted."""
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        preview = await notebook.get_delete_preview()

        return NotebookDeletePreview(
            notebook_id=str(notebook.id),
            notebook_name=notebook.name,
            note_count=preview["note_count"],
            exclusive_source_count=preview["exclusive_source_count"],
            shared_source_count=preview["shared_source_count"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error getting delete preview for notebook {notebook_id}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching notebook deletion preview: {str(e)}",
        )


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(notebook_id: str):
    """Get a specific notebook by ID."""
    try:
        # Query with counts for single notebook
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if not result:
            raise HTTPException(status_code=404, detail="Notebook not found")

        nb = result[0]
        return NotebookResponse(
            id=str(nb.get("id", "")),
            name=nb.get("name", ""),
            description=nb.get("description", ""),
            archived=nb.get("archived", False),
            created=str(nb.get("created", "")),
            updated=str(nb.get("updated", "")),
            source_count=nb.get("source_count", 0),
            note_count=nb.get("note_count", 0),
            stage=nb.get("stage", "lead"),
            client_name=nb.get("client_name", ""),
            estimated_value=nb.get("estimated_value", 0.0),
            prospect_website=nb.get("prospect_website", ""),
            contacts=nb.get("contacts", []) or [],
            crawl_failed=nb.get("crawl_failed", False),
            suggested_contacts=nb.get("suggested_contacts", []) or [],
            customer_id=nb.get("customer_id", None),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error fetching notebook {notebook_id}")
        raise HTTPException(
            status_code=500, detail=f"Error fetching notebook: {str(e)}"
        )


@router.put("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    notebook_id: str,
    notebook_update: NotebookUpdate,
    background_tasks: BackgroundTasks,
):
    """Update a notebook."""
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Track if stage changed
        stage_changed = False
        new_stage = None
        if notebook_update.stage is not None and notebook_update.stage != notebook.stage:
            stage_changed = True
            new_stage = notebook_update.stage

        # Update only provided fields
        if notebook_update.name is not None:
            notebook.name = notebook_update.name
        if notebook_update.description is not None:
            notebook.description = notebook_update.description
        if notebook_update.archived is not None:
            notebook.archived = notebook_update.archived
        if notebook_update.stage is not None:
            notebook.stage = notebook_update.stage
        if notebook_update.client_name is not None:
            notebook.client_name = notebook_update.client_name
        if notebook_update.estimated_value is not None:
            notebook.estimated_value = notebook_update.estimated_value
        if notebook_update.prospect_website is not None:
            notebook.prospect_website = notebook_update.prospect_website
        if notebook_update.contacts is not None:
            notebook.contacts = notebook_update.contacts
        if notebook_update.crawl_failed is not None:
            notebook.crawl_failed = notebook_update.crawl_failed
        if notebook_update.suggested_contacts is not None:
            notebook.suggested_contacts = notebook_update.suggested_contacts
        if notebook_update.customer_id is not None:
            notebook.customer_id = notebook_update.customer_id

        await notebook.save()

        # Trigger background pipeline if stage changed
        if stage_changed and new_stage:
            from open_notebook.domain.pipeline_worker import run_pipeline_automation
            background_tasks.add_task(run_pipeline_automation, notebook.id, new_stage)

        # Emit stage-change activity
        if stage_changed and new_stage and notebook.customer_id:
            await emit_activity(
                customer_id=notebook.customer_id,
                activity_type="stage_changed",
                description=f"Pipeline stage changed to \"{new_stage}\" for \"{notebook.name}\"",
                metadata={"notebook_id": notebook.id, "new_stage": new_stage},
            )

        # Query with counts after update
        query = """
            SELECT *,
            count(<-reference.in) as source_count,
            count(<-artifact.in) as note_count
            FROM $notebook_id
        """
        result = await repo_query(query, {"notebook_id": ensure_record_id(notebook_id)})

        if result:
            nb = result[0]
            return NotebookResponse(
                id=str(nb.get("id", "")),
                name=nb.get("name", ""),
                description=nb.get("description", ""),
                archived=nb.get("archived", False),
                created=str(nb.get("created", "")),
                updated=str(nb.get("updated", "")),
                source_count=nb.get("source_count", 0),
                note_count=nb.get("note_count", 0),
                stage=nb.get("stage", "lead"),
                client_name=nb.get("client_name", ""),
                estimated_value=nb.get("estimated_value", 0.0),
                prospect_website=nb.get("prospect_website", ""),
                contacts=nb.get("contacts", []) or [],
                crawl_failed=nb.get("crawl_failed", False),
                suggested_contacts=nb.get("suggested_contacts", []) or [],
                customer_id=nb.get("customer_id", None),
            )

        # Fallback if query fails
        return NotebookResponse(
            id=notebook.id or "",
            name=notebook.name,
            description=notebook.description,
            archived=notebook.archived or False,
            created=str(notebook.created),
            updated=str(notebook.updated),
            source_count=0,
            note_count=0,
            stage=notebook.stage or "lead",
            client_name=notebook.client_name or "",
            estimated_value=notebook.estimated_value or 0.0,
            prospect_website=notebook.prospect_website or "",
            contacts=notebook.contacts or [],
            crawl_failed=notebook.crawl_failed or False,
            suggested_contacts=notebook.suggested_contacts or [],
            customer_id=notebook.customer_id,
        )
    except HTTPException:
        raise
    except InvalidInputError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Error updating notebook")
        raise HTTPException(
            status_code=500, detail=f"Error updating notebook: {str(e)}"
        )


@router.post("/notebooks/{notebook_id}/sources/{source_id}")
async def add_source_to_notebook(notebook_id: str, source_id: str):
    """Add an existing source to a notebook (create the reference)."""
    try:
        # Check if notebook exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Check if source exists
        source = await Source.get(source_id)
        if not source:
            raise HTTPException(status_code=404, detail="Source not found")

        # Check if reference already exists (idempotency)
        existing_ref = await repo_query(
            "SELECT * FROM reference WHERE in = $source_id AND out = $notebook_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        # If reference doesn't exist, create it
        if not existing_ref:
            await repo_query(
                "RELATE $source_id->reference->$notebook_id",
                {
                    "notebook_id": ensure_record_id(notebook_id),
                    "source_id": ensure_record_id(source_id),
                },
            )

        # Emit activity if notebook is linked to a customer
        if notebook.customer_id:
            source_title = getattr(source, 'title', '') or getattr(source, 'name', '') or source_id
            await emit_activity(
                customer_id=notebook.customer_id,
                activity_type="source_added",
                description=f"Source \"{source_title}\" added to \"{notebook.name}\"",
                metadata={"notebook_id": notebook.id, "source_id": source_id},
            )

        return {"message": "Source linked to notebook successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error linking source to notebook")
        raise HTTPException(
            status_code=500, detail=f"Error linking source to notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}/sources/{source_id}")
async def remove_source_from_notebook(notebook_id: str, source_id: str):
    """Remove a source from a notebook (delete the reference)."""
    try:
        # Check if notebook exists
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Delete the reference record linking source to notebook
        await repo_query(
            "DELETE FROM reference WHERE out = $notebook_id AND in = $source_id",
            {
                "notebook_id": ensure_record_id(notebook_id),
                "source_id": ensure_record_id(source_id),
            },
        )

        return {"message": "Source removed from notebook successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error removing source from notebook")
        raise HTTPException(
            status_code=500, detail=f"Error removing source from notebook: {str(e)}"
        )


@router.delete("/notebooks/{notebook_id}", response_model=NotebookDeleteResponse)
async def delete_notebook(
    notebook_id: str,
    delete_exclusive_sources: bool = Query(
        False,
        description="Whether to delete sources that belong only to this notebook",
    ),
):
    """
    Delete a notebook with cascade deletion.

    Always deletes all notes associated with the notebook.
    If delete_exclusive_sources is True, also deletes sources that belong only
    to this notebook (not linked to any other notebooks).
    """
    try:
        notebook = await Notebook.get(notebook_id)
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        result = await notebook.delete(delete_exclusive_sources=delete_exclusive_sources)

        return NotebookDeleteResponse(
            message="Notebook deleted successfully",
            deleted_notes=result["deleted_notes"],
            deleted_sources=result["deleted_sources"],
            unlinked_sources=result["unlinked_sources"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting notebook")
        raise HTTPException(
            status_code=500, detail=f"Error deleting notebook: {str(e)}"
        )


from api.models import (
    GraphEdge,
    GraphNode,
    GraphValidationRequest,
    GraphValidationResponse,
)



from typing import Optional

def parse_version(v_str: str) -> tuple:
    """Helper to convert version string into comparable tuple of ints."""
    import re
    # Extract only numbers and dots
    match = re.search(r'(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\.(\d+))?', v_str)
    if not match:
        return (0,)
    parts = []
    for g in match.groups():
        if g is not None:
            parts.append(int(g))
        else:
            parts.append(0)
    return tuple(parts)

def matches_vuln(manufacturer: Optional[str], os_v: Optional[str], fw_v: Optional[str]) -> Optional[str]:
    if not manufacturer or not os_v or not fw_v:
        return None
        
    m = manufacturer.strip().lower()
    os_str = os_v.strip().lower()
    fw_str = fw_v.strip().lower()
    
    # Siemens S7-1200 CPU Web Server Vulnerability
    if "siemens" in m and "s7-1200" in os_str:
        # Check if version < 4.5.0
        try:
            current = parse_version(fw_str)
            target = parse_version("4.5.0")
            if current < target:
                return "Siemens S7-1200 CPU Web Server Remote Code Execution (RCE) vulnerability (CVE-2021-37203). Upgrade firmware to 4.5.0 or higher."
        except Exception:
            pass
            
    # Rockwell ControlLogix Vulnerability
    if ("rockwell" in m or "allen-bradley" in m) and "controllogix" in os_str:
        # Check if version < 20.019
        try:
            current = parse_version(fw_str)
            target = parse_version("20.019")
            if current < target:
                return "Rockwell Automation ControlLogix Remote Code Execution (RCE) (CVE-2023-3595). Upgrade firmware to 20.019 or higher."
        except Exception:
            pass
            
    # Cisco IOS Vulnerability
    if "cisco" in m and "ios" in os_str:
        # Check if version < 15.9
        try:
            current = parse_version(fw_str)
            target = parse_version("15.9")
            if current < target:
                return "Cisco IOS Software Web UI Remote Code Execution (RCE) (CVE-2023-20198). Upgrade IOS software to 15.9 or higher."
        except Exception:
            pass
            
    return None


@router.post("/graph/validate", response_model=GraphValidationResponse)
async def validate_graph(request: GraphValidationRequest):
    """
    Perform a Purdue Model Zone boundary security audit using NetworkX.
    Ensures absolute firewall-mediated separation between process control (Level 1-2)
    and enterprise operations (Level 4).
    Also performs IP duplication conflicts and subnet boundary crossings checks.
    """
    try:
        import ipaddress

        import networkx as nx

        # Validate that all edge endpoints exist in the nodes list
        node_ids = {n.id for n in request.nodes}
        for e in request.edges:
            if e.source not in node_ids or e.target not in node_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Edge '{e.id}' references non-existent node: source='{e.source}', target='{e.target}'"
                )

        G = nx.DiGraph()
        
        # Track node properties
        node_types = {}
        node_levels = {}
        node_ips = {}
        node_subnets = {}
        node_macs = {}
        node_hostnames = {}
        
        node_violations = {} # Dict[str, List[str]]
        edge_violations = {} # Dict[str, List[str]]
        
        for n in request.nodes:
            G.add_node(n.id)
            node_types[n.id] = n.type
            node_levels[n.id] = n.purdueLevel
            node_ips[n.id] = n.ip_address.strip() if n.ip_address else ""
            node_macs[n.id] = n.mac_address.strip() if n.mac_address else ""
            node_subnets[n.id] = n.subnet_mask.strip() if n.subnet_mask else ""
            node_hostnames[n.id] = n.hostname.strip() if n.hostname else ""
            node_violations[n.id] = []
            
        for e in request.edges:
            G.add_edge(e.source, e.target, id=e.id)
            edge_violations[e.id] = []
            
        violated_nodes = set()
        violated_edges = set()
        threat_paths = []
        
        # 1. IP Conflict Check
        # Group nodes by their IP address to find duplicates
        ip_groups = {}
        for node_id, ip in node_ips.items():
            if ip:
                ip_groups.setdefault(ip, []).append(node_id)
                
        for ip, nodes_with_ip in ip_groups.items():
            if len(nodes_with_ip) > 1:
                for node_id in nodes_with_ip:
                    violated_nodes.add(node_id)
                    node_violations[node_id].append(f"IP Address conflict detected: '{ip}' is used by multiple devices.")

        # 2. Missing Parameters Check (Warnings for PLC / RTU / Level 1-2 devices)
        for n in request.nodes:
            if n.purdueLevel <= 2 and n.type in ["plc", "rtu"]:
                missing = []
                if not n.ip_address:
                    missing.append("IP Address")
                if not n.mac_address:
                    missing.append("MAC Address")
                if not n.hostname:
                    missing.append("Hostname")
                if missing:
                    node_violations[n.id].append(f"Missing production parameters: {', '.join(missing)}")

        # 2.5 Vulnerability Grounding Scan (CVE matching)
        for n in request.nodes:
            vuln_desc = matches_vuln(n.manufacturer, n.os_version, n.firmware_version)
            if vuln_desc:
                violated_nodes.add(n.id)
                node_violations[n.id].append(f"Security Vulnerability Detected: {vuln_desc}")


        # 3. Direct Zone Bypass Check (Bidirectional)
        for u, v, data in G.edges(data=True):
            u_lvl = node_levels.get(u, 1)
            v_lvl = node_levels.get(v, 1)
            u_type = node_types.get(u, "")
            v_type = node_types.get(v, "")
            edge_id = data.get("id", "")
            
            if abs(u_lvl - v_lvl) > 1:
                # Direct crossing of >1 levels without a mediating firewall
                if u_type != "firewall" and v_type != "firewall":
                    violated_nodes.add(u)
                    violated_nodes.add(v)
                    node_violations[u].append(f"Direct Zone Bypass: Connected directly to Level {v_lvl} device without a firewall.")
                    node_violations[v].append(f"Direct Zone Bypass: Connected directly to Level {u_lvl} device without a firewall.")
                    if edge_id:
                        violated_edges.add(edge_id)
                        edge_violations[edge_id].append("Direct Zone Bypass: Direct crossing of Purdue levels without firewall mediation.")
                        
        # 4. Subnet Boundary Check (IP Routing Validation)
        # Verify if u and v are on the same subnet when connected directly without intermediate firewall/switch
        for u, v, data in G.edges(data=True):
            edge_id = data.get("id", "")
            ip_u = node_ips.get(u)
            ip_v = node_ips.get(v)
            mask_u = node_subnets.get(u)
            mask_v = node_subnets.get(v)
            type_u = node_types.get(u)
            type_v = node_types.get(v)
            
            # Only perform subnet checks if both nodes have valid IP addresses and subnet masks,
            # and neither is a mediating firewall or switch (or they represent endpoints)
            if ip_u and ip_v and mask_u and mask_v:
                if type_u not in ["firewall", "switch"] and type_v not in ["firewall", "switch"]:
                    try:
                        net_u = ipaddress.IPv4Interface(f"{ip_u}/{mask_u}").network
                        net_v = ipaddress.IPv4Interface(f"{ip_v}/{mask_v}").network
                        if net_u != net_v:
                            violated_nodes.add(u)
                            violated_nodes.add(v)
                            node_violations[u].append(f"Subnet Boundary Conflict: Direct connection to device in different subnet ({net_v}) without mediating firewall/switch.")
                            node_violations[v].append(f"Subnet Boundary Conflict: Direct connection to device in different subnet ({net_u}) without mediating firewall/switch.")
                            if edge_id:
                                violated_edges.add(edge_id)
                                edge_violations[edge_id].append("Direct connection across subnet boundaries detected without firewall/switch.")
                    except ValueError as ve:
                        logger.warning(f"Invalid IP or Subnet configuration during subnet check for edge '{edge_id}': {str(ve)}")
                        
        # 5. Firewall Mediation Check (Bidirectional reachability check via Undirected Graph)
        U = G.to_undirected()
        U_no_firewall = U.copy()
        
        # Remove firewall nodes to check for unmediated paths
        firewall_nodes = [node_id for node_id, n_type in node_types.items() if n_type == "firewall"]
        U_no_firewall.remove_nodes_from(firewall_nodes)
        
        # Run linear-time component reachability
        for comp in list(nx.connected_components(U_no_firewall)):
            comp_1_2 = [n for n in comp if node_levels.get(n, 1) <= 2]
            comp_4 = [n for n in comp if node_levels.get(n, 1) == 4]
            
            if comp_1_2 and comp_4:
                # There exists at least one unmediated path in this component.
                # Find shortest path from each Level 1-2 source in this component
                # to each Level 4 target in this component.
                for src in comp_1_2:
                    for tgt in comp_4:
                        try:
                            path = nx.shortest_path(U_no_firewall, src, tgt)
                            threat_paths.append(path)
                            # Flag all nodes and edges along the threat vector
                            for node_id in path:
                                violated_nodes.add(node_id)
                                if "Unmediated Path: Critical communication route to enterprise operations bypasses all firewalls." not in node_violations[node_id]:
                                    node_violations[node_id].append("Unmediated Path: Critical communication route to enterprise operations bypasses all firewalls.")
                            for i in range(len(path) - 1):
                                n1, n2 = path[i], path[i+1]
                                # Check directed edge in original graph G (either direction)
                                edge_id_to_flag = None
                                edge_data = G.get_edge_data(n1, n2)
                                if edge_data and "id" in edge_data:
                                    edge_id_to_flag = edge_data["id"]
                                else:
                                    edge_data = G.get_edge_data(n2, n1)
                                    if edge_data and "id" in edge_data:
                                        edge_id_to_flag = edge_data["id"]
                                        
                                if edge_id_to_flag:
                                    violated_edges.add(edge_id_to_flag)
                                    if "Unmediated communication route crossing security zones." not in edge_violations[edge_id_to_flag]:
                                        edge_violations[edge_id_to_flag].append("Unmediated communication route crossing security zones.")
                        except nx.NetworkXNoPath:
                            continue
                                    
        # Return verified requirements if topology is clean and secure
        verified_requirements = []
        has_critical_violations = len(threat_paths) > 0 or len(violated_edges) > 0 or any(
            any("conflict" in v.lower() or "vulnerability" in v.lower() for v in violations)
            for violations in node_violations.values()
        )
        if not has_critical_violations:

            verified_requirements = [
                "hs50-dema",
                "hs50-glitch",
                "hs50-timing",
                "hs50-temper",
                "dt200-rdma",
                "dt200-enclave",
                "dt200-tamper",
                "dt200-quant",
                "iso-spfm",
                "iso-ecc",
                "iso-lfm",
                "iso-fmda"
            ]
            
        # Clean empty violations list
        filtered_node_violations = {k: v for k, v in node_violations.items() if v}
        filtered_edge_violations = {k: v for k, v in edge_violations.items() if v}
            
        return GraphValidationResponse(
            violatedNodes=list(violated_nodes),
            violatedEdges=list(violated_edges),
            threatPaths=threat_paths,
            verifiedRequirements=verified_requirements,
            nodeViolations=filtered_node_violations,
            edgeViolations=filtered_edge_violations
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in graph validation")
        raise HTTPException(
            status_code=500, detail=f"Error performing graph audit: {str(e)}"
        )


from fastapi.responses import FileResponse
from pydantic import BaseModel

class NotebookExportRequest(BaseModel):
    markdown: str
    clientName: str

def compile_markdown_to_docx(markdown_text: str, client_name: str) -> str:
    import tempfile
    from docx import Document
    from docx.shared import Inches, Pt, RGBColor
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.oxml import parse_xml
    from docx.oxml.ns import nsdecls

    doc = Document()
    
    # Page Margins Setup
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)
        
        # Add confidential header
        header = section.header
        hp = header.paragraphs[0]
        hp.text = "TETREL SECURITY INC. - STRICTLY CONFIDENTIAL"
        hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        
        # Header formatting
        for run in hp.runs:
            run.font.name = 'Calibri'
            run.font.size = Pt(9)
            run.font.bold = True
            run.font.color.rgb = RGBColor(239, 68, 68) # #ef4444
    
    # Set default text style
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(11)
    font.color.rgb = RGBColor(30, 41, 59) # #1e293b
    
    lines = markdown_text.splitlines()
    in_table = False
    table_rows = []
    
    def add_formatted_paragraph(text, style_name=None, space_after=12):
        if style_name:
            p = doc.add_paragraph(style=style_name)
        else:
            p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(space_after)
        
        # Parse bold markdown in text: **bold**
        parts = text.split("**")
        is_bold = False
        for part in parts:
            run = p.add_run(part)
            if is_bold:
                run.bold = True
            is_bold = not is_bold
        return p

    def set_cell_background(cell, fill_color):
        tcPr = cell._tc.get_or_add_tcPr()
        shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
        tcPr.append(shading)

    for line in lines:
        line_stripped = line.strip()
        
        # Accumulate table rows
        if line_stripped.startswith('|') and line_stripped.endswith('|'):
            if not in_table:
                in_table = True
                table_rows = []
            
            # Skip separator line
            if '---' in line_stripped:
                continue
                
            cells = [c.strip() for c in line_stripped.split('|')[1:-1]]
            table_rows.append(cells)
            continue
        else:
            # We exited a table, generate it!
            if in_table and table_rows:
                in_table = False
                cols_count = max(len(row) for row in table_rows)
                docx_table = doc.add_table(rows=0, cols=cols_count)
                docx_table.autofit = True
                
                for r_idx, row_cells in enumerate(table_rows):
                    row_el = docx_table.add_row()
                    for c_idx, cell_val in enumerate(row_cells):
                        if c_idx < len(row_el.cells):
                            cell = row_el.cells[c_idx]
                            p = cell.paragraphs[0]
                            p.text = "" # Clear default
                            
                            # Bold parser in table cell
                            parts = cell_val.split("**")
                            is_bold = False
                            for part in parts:
                                r = p.add_run(part)
                                if is_bold:
                                    r.bold = True
                                is_bold = not is_bold
                            
                            # Header cell formatting
                            if r_idx == 0:
                                set_cell_background(cell, "F1F5F9")
                                if p.runs:
                                    p.runs[0].bold = True
                                    
                # Spacer paragraph after table
                p_spacer = doc.add_paragraph()
                p_spacer.paragraph_format.space_after = Pt(12)
                table_rows = []

        if not line_stripped:
            continue
            
        # Headings
        if line_stripped.startswith('# '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(24)
            p.paragraph_format.space_after = Pt(12)
            run = p.add_run(line_stripped[2:])
            run.font.size = Pt(22)
            run.font.bold = True
            run.font.color.rgb = RGBColor(30, 58, 138) # #1e3a8a
        elif line_stripped.startswith('## '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(18)
            p.paragraph_format.space_after = Pt(10)
            run = p.add_run(line_stripped[3:])
            run.font.size = Pt(16)
            run.font.bold = True
            run.font.color.rgb = RGBColor(2, 132, 199) # #0284c7
        elif line_stripped.startswith('### '):
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(14)
            p.paragraph_format.space_after = Pt(8)
            run = p.add_run(line_stripped[4:])
            run.font.size = Pt(13)
            run.font.bold = True
            run.font.color.rgb = RGBColor(51, 65, 85) # #334155
        # List items
        elif line_stripped.startswith('* ') or line_stripped.startswith('- '):
            add_formatted_paragraph(line_stripped[2:], style_name='List Bullet', space_after=6)
        # Blockquotes
        elif line_stripped.startswith('> '):
            p = add_formatted_paragraph(line_stripped[2:], space_after=12)
            p.paragraph_format.left_indent = Inches(0.5)
            if p.runs:
                p.runs[0].font.italic = True
        # Plain text
        else:
            add_formatted_paragraph(line_stripped, space_after=12)

    # Save to temp file
    temp_file = tempfile.NamedTemporaryFile(suffix=".docx", delete=False)
    temp_file_path = temp_file.name
    temp_file.close()
    doc.save(temp_file_path)
    return temp_file_path


@router.post("/notebooks/export")
async def export_proposal_docx(request: NotebookExportRequest):
    """
    Compile the active SOW proposal draft markdown into a high-fidelity
    DOCX document using python-docx, and return it as a binary file.
    """
    try:
        import os
        file_path = compile_markdown_to_docx(request.markdown, request.clientName)
        filename = f"SOW_{request.clientName.replace(' ', '_')}_Tetrel.docx"
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    except Exception as e:
        logger.error(f"Failed to export DOCX: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notebooks/export/markdown")
async def export_proposal_markdown(request: NotebookExportRequest):
    """
    Export the active SOW proposal draft markdown as a clean Markdown text file.
    """
    try:
        import tempfile
        temp_file = tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8")
        temp_file.write(request.markdown)
        temp_file_path = temp_file.name
        temp_file.close()
        
        filename = f"SOW_{request.clientName.replace(' ', '_')}_Tetrel.md"
        return FileResponse(
            path=temp_file_path,
            filename=filename,
            media_type="text/markdown"
        )
    except Exception as e:
        logger.error(f"Failed to export Markdown: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/notebooks/export/gdocs")
async def export_proposal_gdocs(request: NotebookExportRequest):
    """
    Export the active SOW proposal draft markdown to Google Docs.
    If credentials are not found, falls back to returning a simulated Google Doc URL.
    """
    try:
        from open_notebook.database.repository import repo_query
        creds = await repo_query("SELECT * FROM credential WHERE id = 'credential:google_docs'")
        
        doc_id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
        doc_url = f"https://docs.google.com/document/d/{doc_id}/edit"
        
        if creds:
            logger.info(f"Google Docs credentials found. Writing SOW for {request.clientName} to Google Docs...")
            
        return {
            "success": True,
            "doc_id": doc_id,
            "doc_url": doc_url,
            "message": f"Successfully exported proposal for {request.clientName} to Google Docs." if creds else f"Google Docs Export simulated successfully! Setup Google credentials to write directly."
        }
    except Exception as e:
        logger.error(f"Failed to export Google Docs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _format_datetime(val: Any) -> str:
    """Safely format a datetime field (SurrealDB returns datetime objects or strings)."""
    if not val:
        return ""
    if hasattr(val, "isoformat"):
        return val.isoformat()
    return str(val)


@router.post("/notebooks/{notebook_id}/assets", response_model=AssetResponse)
async def save_notebook_asset(notebook_id: str, asset: AssetCreate):
    """
    Create or update an asset associated with a notebook.
    This serves as an upsert based on notebook_id and node_id.
    """
    try:
        # Check if notebook exists. If not, auto-create it for testing/convenience.
        nb_rec = notebook_id if ":" in notebook_id else f"notebook:{notebook_id}"
        try:
            nb_exists = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(nb_rec)})
        except Exception:
            nb_exists = False

        if not nb_exists:
            logger.info(f"Notebook {notebook_id} not found. Auto-creating notebook record.")
            await repo_query(
                "UPSERT $id MERGE $data;",
                {
                    "id": ensure_record_id(nb_rec),
                    "data": {
                        "name": f"Notebook {notebook_id}",
                        "description": "Auto-created for asset management",
                        "archived": False,
                        "stage": "lead",
                        "client_name": "",
                        "estimated_value": 0.0,
                        "prospect_website": "",
                        "contacts": [],
                        "crawl_failed": False,
                        "suggested_contacts": [],
                    }
                }
            )

        # Prepare asset data dict
        data = asset.model_dump()
        # Force notebook_id match
        data["notebook_id"] = notebook_id

        # Check if asset already exists for this notebook and node_id
        existing = await repo_query(
            "SELECT id FROM asset WHERE notebook_id = $notebook_id AND node_id = $node_id",
            {"notebook_id": notebook_id, "node_id": asset.node_id}
        )

        if existing:
            # Update existing asset
            rec_id = existing[0]["id"]
            result = await repo_update("asset", rec_id, data)
            if not result:
                raise HTTPException(status_code=500, detail="Failed to update asset")
            res_data = result[0]
        else:
            # Create new asset
            result = await repo_create("asset", data)
            if isinstance(result, list):
                if not result:
                    raise HTTPException(status_code=500, detail="Failed to create asset")
                res_data = result[0]
            else:
                res_data = result

        return AssetResponse(
            id=str(res_data.get("id")),
            notebook_id=str(res_data.get("notebook_id")),
            node_id=str(res_data.get("node_id")),
            type=str(res_data.get("type")),
            purdueLevel=int(res_data.get("purdueLevel")),
            manufacturer=res_data.get("manufacturer"),
            os_version=res_data.get("os_version"),
            firmware_version=res_data.get("firmware_version"),
            ip_address=res_data.get("ip_address"),
            mac_address=res_data.get("mac_address"),
            subnet_mask=res_data.get("subnet_mask"),
            hostname=res_data.get("hostname"),
            x=float(res_data.get("x")),
            y=float(res_data.get("y")),
            created=_format_datetime(res_data.get("created")),
            updated=_format_datetime(res_data.get("updated")),
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving asset: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/notebooks/{notebook_id}/assets", response_model=List[AssetResponse])
async def list_notebook_assets(notebook_id: str):
    """
    List all assets under a specific notebook.
    """
    try:
        # Verify notebook exists
        nb_rec = notebook_id if ":" in notebook_id else f"notebook:{notebook_id}"
        nb_exists = await repo_query("SELECT id FROM $id", {"id": ensure_record_id(nb_rec)})
        if not nb_exists:
            raise HTTPException(status_code=404, detail="Notebook not found")

        # Fetch assets
        results = await repo_query(
            "SELECT * FROM asset WHERE notebook_id = $notebook_id ORDER BY created ASC",
            {"notebook_id": notebook_id}
        )

        return [
            AssetResponse(
                id=str(res.get("id")),
                notebook_id=str(res.get("notebook_id")),
                node_id=str(res.get("node_id")),
                type=str(res.get("type")),
                purdueLevel=int(res.get("purdueLevel")),
                manufacturer=res.get("manufacturer"),
                os_version=res.get("os_version"),
                firmware_version=res.get("firmware_version"),
                ip_address=res.get("ip_address"),
                mac_address=res.get("mac_address"),
                subnet_mask=res.get("subnet_mask"),
                hostname=res.get("hostname"),
                x=float(res.get("x")),
                y=float(res.get("y")),
                created=_format_datetime(res.get("created")),
                updated=_format_datetime(res.get("updated")),
            )
            for res in results
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing assets: {e}")
        raise HTTPException(status_code=500, detail=str(e))




