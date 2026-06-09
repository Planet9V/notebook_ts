from typing import Optional, List
import base64
import hashlib
import io
import os
import re
import subprocess
import tempfile

from fastapi import APIRouter, HTTPException, Query, Form, File, UploadFile, Depends
from fastapi.responses import Response
from loguru import logger
from pydantic import BaseModel

from open_notebook.search.research_memory import ResearchMemory

router = APIRouter()


# ── Request / Response Models ────────────────────────────────────────────────


class SearchRequest(BaseModel):
    """Body for POST /research-memory/search."""

    query: str
    limit: int = 20
    source_type: Optional[str] = None


class DocumentResponse(BaseModel):
    """Single research document returned to the frontend."""

    id: int
    query: str
    title: str
    url: Optional[str] = None
    content: str
    source_type: str
    score: Optional[float] = None
    similarity: Optional[float] = None
    created_at: str


class SearchResponse(BaseModel):
    """Response for search and keyword search endpoints."""

    results: list[DocumentResponse]
    total: int


class BrowseResponse(BaseModel):
    """Response for the paginated browse endpoint."""

    results: list[DocumentResponse]
    total: int
    page: int


class StatsResponse(BaseModel):
    """Response for the stats endpoint."""

    total_documents: int
    source_types: dict[str, int]
    oldest: Optional[str] = None
    newest: Optional[str] = None
    table_size: str


class ProvenanceResponse(BaseModel):
    """Response representing a document in the provenance registry."""

    id: int
    customer_id: str
    location_id: Optional[str] = None
    category: Optional[str] = None
    file_name: str
    file_hash: str
    description: Optional[str] = None
    apa_citation: Optional[str] = None
    metadata: dict = {}
    created_at: str


# ── Helpers ──────────────────────────────────────────────────────────────────


def _row_to_doc(row: dict) -> DocumentResponse:
    """Convert a database row dict to a DocumentResponse."""
    return DocumentResponse(
        id=row["id"],
        query=row.get("query", ""),
        title=row.get("title", ""),
        url=row.get("url"),
        content=row.get("content", ""),
        source_type=row.get("source_type", "web"),
        score=row.get("relevance_score") or row.get("rank"),
        similarity=row.get("similarity"),
        created_at=row["created_at"].isoformat() if row.get("created_at") else "",
    )


def generate_apa_citation(
    title: Optional[str],
    author: Optional[str],
    publication_year: Optional[int],
    publisher: Optional[str],
    file_name: str
) -> str:
    """Generate a standard APA citation."""
    author_str = author.strip() if author else ""
    year_str = f"({publication_year})" if publication_year else "(n.d.)"
    title_str = title.strip() if title else file_name
    publisher_str = publisher.strip() if publisher else ""

    parts = []
    if author_str:
        parts.append(author_str)
        parts.append(year_str)
        parts.append(title_str)
    else:
        parts.append(title_str)
        parts.append(year_str)

    if publisher_str:
        parts.append(publisher_str)

    return ". ".join([p for p in parts if p]) + "."


async def describe_diagram_via_vlm(base64_image: str) -> str:
    """Analyze diagram image via the default vision model."""
    from langchain_core.messages import HumanMessage, SystemMessage
    from open_notebook.ai.provision import provision_langchain_model
    from open_notebook.utils.text_utils import extract_text_content

    # Provision default chat model for vision tasks
    llm = await provision_langchain_model(
        content="Describe this diagram",
        model_id=None,
        default_type="chat"
    )

    system_prompt = (
        "You are an expert industrial engineering assistant. Your task is to analyze the provided engineering diagram "
        "(which may be a P&ID, single-line diagram, network architecture diagram, block diagram, etc.) and write a detailed, "
        "comprehensive visual description. Identify all components, labels, connections, data flows, flow directions, "
        "and physical or logical relationships. Provide a structured, technical description so that an engineer or RAG system "
        "can fully understand the diagram from this description alone. Do not include introductory or concluding conversational text."
    )

    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": "Please provide a detailed visual and technical description of this engineering diagram."
            },
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/png;base64,{base64_image}"
                }
            }
        ]
    )

    try:
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            message
        ])
        return extract_text_content(response)
    except Exception as e:
        logger.error(f"VLM diagram analysis failed: {e}")
        return f"[Failed to analyze diagram via VLM: {str(e)}]"


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.get("/research-memory/stats", response_model=StatsResponse)
async def get_stats():
    """Get research memory statistics."""
    try:
        stats = await ResearchMemory.get_stats()
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error fetching research memory stats: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching research memory stats: {e}",
        )


@router.post("/research-memory/search", response_model=SearchResponse)
async def search_memory(body: SearchRequest):
    """Search research memory using full-text keyword search.

    Falls back to keyword search since embeddings require a separate
    embedding step that depends on the caller's model choice.
    """
    try:
        rows = await ResearchMemory.keyword_search(
            query=body.query,
            limit=body.limit,
        )
        docs = [_row_to_doc(r) for r in rows]
        return SearchResponse(results=docs, total=len(docs))
    except Exception as e:
        logger.error(f"Error searching research memory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error searching research memory: {e}",
        )


@router.get("/research-memory/browse", response_model=BrowseResponse)
async def browse_memory(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
):
    """Browse stored research results with pagination."""
    try:
        result = await ResearchMemory.browse(
            page=page,
            limit=limit,
            source_type=source_type,
        )
        docs = [_row_to_doc(r) for r in result["results"]]
        return BrowseResponse(
            results=docs,
            total=result["total"],
            page=result["page"],
        )
    except Exception as e:
        logger.error(f"Error browsing research memory: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error browsing research memory: {e}",
        )


@router.post("/research-memory/provenance", response_model=ProvenanceResponse)
async def ingest_provenance_document(
    file: UploadFile = File(...),
    customer_id: str = Form(...),
    location_id: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    notebook_id: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    author: Optional[str] = Form(None),
    publication_year: Optional[int] = Form(None),
    publisher: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
):
    """Ingest a technical engineering document into the provenance registry."""
    try:
        # 1. Validate customer & location link if both provided
        if location_id and customer_id:
            from api.routers.notebooks import validate_location_customer
            await validate_location_customer(location_id, customer_id)

        # 2. Read original file bytes and compute hash
        original_file_bytes = await file.read()
        file_hash = hashlib.sha256(original_file_bytes).hexdigest()

        # 3. Determine file extension and handle legacy conversion
        filename = file.filename or "uploaded_file"
        ext = os.path.splitext(filename)[1].lower()
        legacy_exts = {".pub", ".doc", ".xls", ".ppt"}

        pdf_bytes = None
        if ext in legacy_exts:
            logger.info(f"Converting legacy document '{filename}' to PDF via LibreOffice...")
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_input_path = os.path.join(temp_dir, filename)
                with open(temp_input_path, "wb") as f:
                    f.write(original_file_bytes)

                try:
                    result = subprocess.run(
                        ["libreoffice", "--headless", "--convert-to", "pdf", "--outdir", temp_dir, temp_input_path],
                        capture_output=True,
                        text=True,
                        check=True
                    )
                    # Find converted PDF
                    pdf_files = [f for f in os.listdir(temp_dir) if f.lower().endswith(".pdf")]
                    if not pdf_files:
                        raise HTTPException(
                            status_code=500,
                            detail=f"LibreOffice conversion failed: PDF not found. stdout: {result.stdout}, stderr: {result.stderr}"
                        )
                    pdf_path = os.path.join(temp_dir, pdf_files[0])
                    with open(pdf_path, "rb") as f:
                        pdf_bytes = f.read()
                except subprocess.CalledProcessError as e:
                    logger.error(f"LibreOffice conversion failed: stdout={e.stdout}, stderr={e.stderr}")
                    raise HTTPException(
                        status_code=500,
                        detail=f"LibreOffice conversion failed: {e.stderr or e.stdout or str(e)}"
                    )

        # 4. Parse document using Docling (with accurate setting tweaks)
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption
        from docling_core.types.doc import PictureItem

        # Configure Docling PdfPipelineOptions
        pipeline_options = PdfPipelineOptions()
        pipeline_options.do_ocr = True
        pipeline_options.images_scale = 2.0
        pipeline_options.generate_picture_images = True

        converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
            }
        )

        markdown_text = ""
        pictures = []

        with tempfile.TemporaryDirectory() as docling_temp_dir:
            processing_filename = filename
            processing_bytes = original_file_bytes

            if ext in legacy_exts:
                processing_filename = os.path.splitext(filename)[0] + ".pdf"
                processing_bytes = pdf_bytes

            processing_path = os.path.join(docling_temp_dir, processing_filename)
            with open(processing_path, "wb") as f:
                f.write(processing_bytes)

            # Convert document
            logger.info(f"Converting '{processing_filename}' using Docling (accurate mode)...")
            conv_result = converter.convert(processing_path)
            doc = conv_result.document
            markdown_text = doc.export_to_markdown()

            # Iterate items in reading order to extract picture bytes
            for element, _ in doc.iterate_items():
                if isinstance(element, PictureItem):
                    try:
                        pil_image = element.get_image(doc)
                        if pil_image:
                            buffered = io.BytesIO()
                            pil_image.save(buffered, format="PNG")
                            img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                            pictures.append((element, img_str))
                    except Exception as img_err:
                        logger.warning(f"Failed to extract image for element {element.self_ref}: {img_err}")

        # 5. Visual descriptions of diagrams via VLM
        logger.info(f"Extracted {len(pictures)} diagrams. Running VLM visual descriptions...")
        for i, (element, img_str) in enumerate(pictures):
            vlm_desc = await describe_diagram_via_vlm(img_str)
            desc_block = f"\n\n> **[Diagram {i+1} Description]**\n> {vlm_desc}\n\n"
            
            # Replace placeholder sequentially
            placeholder_pattern = re.compile(r"<!--\s*(image|picture|figure)\s*-->", re.IGNORECASE)
            if placeholder_pattern.search(markdown_text):
                markdown_text = placeholder_pattern.sub(desc_block, markdown_text, count=1)
            else:
                markdown_text += f"\n\n### Diagram {i+1} Description\n{vlm_desc}\n"

        # 6. Generate APA Citation
        apa_citation = generate_apa_citation(
            title=title,
            author=author,
            publication_year=publication_year,
            publisher=publisher,
            file_name=filename
        )

        # 7. Save to Postgres provenance registry table
        metadata_dict = {
            "title": title,
            "author": author,
            "publication_year": publication_year,
            "publisher": publisher,
            "legacy_converted": ext in legacy_exts,
            "diagrams_count": len(pictures),
        }

        prov_id = await ResearchMemory.store_provenance_record(
            customer_id=customer_id,
            location_id=location_id,
            category=category,
            file_name=filename,
            file_hash=file_hash,
            file_data=original_file_bytes,
            description=description,
            apa_citation=apa_citation,
            metadata=metadata_dict,
        )

        # 8. Index in PostgreSQL research_corpus (pgvector)
        logger.info(f"Generating embeddings and indexing in pgvector for provenance record {prov_id}...")
        try:
            from open_notebook.utils.embedding import generate_embedding
            embedding = await generate_embedding(markdown_text)
            await ResearchMemory.store_result(
                query=f"Document Ingestion: {title or filename}",
                result={
                    "title": title or filename,
                    "url": f"provenance://{prov_id}",
                    "content": markdown_text,
                    "source_type": "provenance",
                    "relevance_score": 1.0,
                },
                embedding=embedding
            )
        except Exception as embed_err:
            logger.error(f"Failed to generate/store embedding in research_corpus: {embed_err}")

        # 9. Register as Source in SurrealDB
        logger.info(f"Registering ingested markdown in SurrealDB source table...")
        try:
            from open_notebook.domain.notebook import Source, Asset
            surreal_source = Source(
                title=title or filename,
                full_text=markdown_text,
                topics=[],
                asset=Asset(url=f"provenance://{prov_id}")
            )
            await surreal_source.save()
            if notebook_id:
                await surreal_source.add_to_notebook(notebook_id)
        except Exception as surreal_err:
            logger.error(f"Failed to save source in SurrealDB: {surreal_err}")

        # Retrieve the saved record to return
        record = await ResearchMemory.get_provenance_by_id(prov_id)
        if not record:
            raise HTTPException(status_code=500, detail="Failed to retrieve saved provenance record")

        return ProvenanceResponse(
            id=record["id"],
            customer_id=record["customer_id"],
            location_id=record.get("location_id"),
            category=record.get("category"),
            file_name=record["file_name"],
            file_hash=record["file_hash"],
            description=record.get("description"),
            apa_citation=record.get("apa_citation"),
            metadata=record.get("metadata") or {},
            created_at=record["created_at"].isoformat() if record.get("created_at") else "",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ingesting provenance document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-memory/provenance", response_model=List[ProvenanceResponse])
async def list_provenance(
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    location_id: Optional[str] = Query(None, description="Filter by location ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
):
    """List all ingested documents in the provenance registry."""
    try:
        rows = await ResearchMemory.list_provenance(
            customer_id=customer_id,
            location_id=location_id,
            category=category,
        )
        results = []
        for r in rows:
            created_at_str = r["created_at"].isoformat() if r.get("created_at") else ""
            results.append(
                ProvenanceResponse(
                    id=r["id"],
                    customer_id=r["customer_id"],
                    location_id=r.get("location_id"),
                    category=r.get("category"),
                    file_name=r["file_name"],
                    file_hash=r["file_hash"],
                    description=r.get("description"),
                    apa_citation=r.get("apa_citation"),
                    metadata=r.get("metadata") or {},
                    created_at=created_at_str,
                )
            )
        return results
    except Exception as e:
        logger.error(f"Error listing provenance: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/research-memory/provenance/{provenance_id}/original")
async def download_provenance_file(provenance_id: int):
    """Download the original raw file from the provenance registry."""
    try:
        meta = await ResearchMemory.get_provenance_by_id(provenance_id)
        if not meta:
            raise HTTPException(status_code=404, detail="Document not found")

        data = await ResearchMemory.get_provenance_data(provenance_id)
        if not data:
            raise HTTPException(status_code=404, detail="File data not found")

        filename = meta["file_name"]

        # Determine content type based on extension
        import mimetypes
        content_type, _ = mimetypes.guess_type(filename)
        if not content_type:
            content_type = "application/octet-stream"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
        return Response(content=data, media_type=content_type, headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading provenance file: {e}")
        raise HTTPException(status_code=500, detail=str(e))
