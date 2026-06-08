import os
from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from langchain_core.messages import HumanMessage, SystemMessage
from loguru import logger

from open_notebook.ai.provision import provision_langchain_model
from open_notebook.domain.credential import Credential
from open_notebook.domain.notebook import Asset, Note, Notebook, Source
from open_notebook.domain.pipeline_rule import PipelineRule
from open_notebook.utils.text_utils import clean_thinking_content, extract_text_content

# Thread-safe scan tracking map: notebook_id -> count of running tasks
ACTIVE_SCANS: dict[str, int] = {}


def get_scanning_status(notebook_id: str) -> bool:
    """Returns True if the notebook is actively being researched/scanned by background pipeline tasks."""
    return ACTIVE_SCANS.get(notebook_id, 0) > 0


async def crawl_prospect_website(url: str) -> str:
    """Scrapes the website and extracts clean text."""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url

    logger.info(f"Crawling website: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        html = response.text

    soup = BeautifulSoup(html, "html.parser")

    # Remove script and style elements
    for script in soup(["script", "style", "nav", "footer", "header", "head"]):
        script.extract()

    # Get text and clean it
    text = soup.get_text()
    lines = (line.strip() for line in text.splitlines())
    chunks = (phrase for line in lines for phrase in line.split("  "))
    clean_text = "\n".join(chunk for chunk in chunks if chunk)

    # Limit content to 40,000 characters
    return clean_text[:40000]


async def execute_web_search(query: str, search_engine: Optional[str] = "default") -> List[dict]:
    """Executes web search via Valyu (primary) with Brave fallback.

    Tries the unified Valyu search first. If Valyu is unavailable or returns
    no results, falls back to the Brave Web Search API directly.
    """
    from open_notebook.search.valyu_search import run_valyu_search

    engine = (search_engine or "default").lower()

    # --- Primary: Valyu search ---
    if engine in ("default", "valyu"):
        logger.info(f"Executing search via Valyu for: {query}")
        try:
            results = await run_valyu_search(query=query, context="web", max_results=10)
            if results:
                return [
                    {
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "content": r.get("content", ""),
                    }
                    for r in results
                ]
            logger.warning("Valyu search returned no results; trying Brave fallback")
        except Exception as e:
            logger.warning(f"Valyu search failed: {e}; trying Brave fallback")

    # --- Fallback: Brave search ---
    brave_key = os.environ.get("BRAVE_API_KEY")
    try:
        creds = await Credential.get_all()
        for c in creds:
            if c.provider == "brave" and c.api_key:
                brave_key = c.api_key.get_secret_value()
    except Exception as e:
        logger.warning(f"Error fetching Brave credential: {e}")

    if brave_key:
        logger.info(f"Executing search via Brave for: {query}")
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    headers={"X-Subscription-Token": brave_key},
                    params={"q": query},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    results = []
                    for r in data.get("web", {}).get("results", []):
                        results.append(
                            {
                                "title": r.get("title", ""),
                                "url": r.get("url", ""),
                                "content": r.get("description", ""),
                            }
                        )
                    return results
        except Exception as e:
            logger.error(f"Brave search failed: {e}")

    return []


async def run_pipeline_automation(notebook_id: str, stage: str):
    """Orchestrates crawler/searcher workers and creates notebook notes/sources."""
    try:
        notebook = await Notebook.get(notebook_id)
    except Exception as e:
        logger.error(f"Notebook {notebook_id} not found for pipeline trigger: {e}")
        return

    if not notebook:
        return

    # Fetch matching pipeline rules
    try:
        rules = await PipelineRule.get_all()
    except Exception as e:
        logger.error(f"Error fetching pipeline rules: {e}")
        return

    active_rules = [r for r in rules if r.stage == stage and r.is_active]
    if not active_rules:
        logger.info(f"No active pipeline rules for stage '{stage}'")
        return

    # Mark active scan
    ACTIVE_SCANS[notebook_id] = ACTIVE_SCANS.get(notebook_id, 0) + len(active_rules)

    for rule in active_rules:
        try:
            logger.info(f"Running rule {rule.id} ({rule.action_type}) on notebook {notebook_id}")
            output_content = ""
            source_url = ""

            if rule.action_type == "crawl":
                if not notebook.prospect_website:
                    logger.warning(f"No prospect website configured for notebook {notebook_id}")
                    output_content = "Skipped crawling: No prospect website URL is configured for this notebook."
                else:
                    try:
                        source_url = notebook.prospect_website
                        clean_text = await crawl_prospect_website(source_url)

                        # Successfully crawled: set crawl_failed = False
                        notebook.crawl_failed = False
                        await notebook.save()

                        # Create and link a first-class Source
                        scraped_title = f"Scraped Webpage: {source_url}"
                        source = Source(
                            title=scraped_title,
                            full_text=clean_text,
                            asset=Asset(url=source_url)
                        )
                        await source.save()
                        await source.add_to_notebook(notebook_id)
                        try:
                            await source.vectorize()
                            logger.info(f"Submitted vectorization job for scraped source: {source.id}")
                        except Exception as ve:
                            logger.warning(f"Failed to submit vectorization for scraped source {source.id}: {ve}")

                        # Also extract suggested contacts using LLM
                        try:
                            contacts_prompt = (
                                "Identify key stakeholders, contacts, or executive leaders mentioned in the following text. "
                                "Return them strictly as a JSON list of objects, where each object has keys: 'name', 'role', 'email' (if email is not found, leave as empty string ''). "
                                "Example output: [{\"name\": \"John Doe\", \"role\": \"CTO\", \"email\": \"john@example.com\"}]. "
                                "Only return valid JSON. Do not include any markdown or thinking blocks. Text:\n"
                                f"{clean_text[:12000]}"
                            )
                            contacts_model = await provision_langchain_model(
                                content=contacts_prompt,
                                model_id=rule.model_override,
                                default_type="chat"
                            )
                            contacts_messages = [
                                SystemMessage(content="You are an expert contact intelligence extraction bot. Only return JSON arrays."),
                                HumanMessage(content=contacts_prompt)
                            ]
                            contacts_resp = await contacts_model.ainvoke(contacts_messages)
                            contacts_text = clean_thinking_content(extract_text_content(contacts_resp.content))
                            import json
                            import re
                            json_match = re.search(r'\[\s*\{.*\}\s*\]', contacts_text, re.DOTALL)
                            if json_match:
                                suggested_list = json.loads(json_match.group(0))
                                if isinstance(suggested_list, list):
                                    notebook.suggested_contacts = [
                                        {
                                            "name": str(c.get("name", "")),
                                            "role": str(c.get("role", "")),
                                            "email": str(c.get("email", ""))
                                        }
                                        for c in suggested_list if c.get("name")
                                    ]
                                    await notebook.save()
                                    logger.info(f"Extracted {len(notebook.suggested_contacts)} suggested contacts for notebook {notebook_id}")
                        except Exception as eext:
                            logger.warning(f"Failed to auto-extract suggested contacts from crawled text: {eext}")

                        # Generate extraction via LLM
                        model = await provision_langchain_model(
                            content=f"{rule.prompt}\n\nContent:\n{clean_text}",
                            model_id=rule.model_override,
                            default_type="chat"
                        )

                        messages = [
                            SystemMessage(content="You are an expert prospecting researcher AI."),
                            HumanMessage(content=f"{rule.prompt}\n\nContent:\n{clean_text}")
                        ]
                        response = await model.ainvoke(messages)
                        output_content = clean_thinking_content(extract_text_content(response.content))
                    except Exception as ce:
                        logger.error(f"Crawling failed for {source_url}: {ce}")
                        output_content = f"Failed to crawl prospect website {source_url}: {str(ce)}"

                        # Crawl failed: set crawl_failed = True
                        notebook.crawl_failed = True
                        await notebook.save()

            elif rule.action_type == "search":
                # Format query
                client_name = notebook.client_name or notebook.name or "the company"
                try:
                    query = rule.query_template.format(
                        client_name=client_name,
                        name=notebook.name,
                        prospect_website=notebook.prospect_website or ""
                    )
                except Exception:
                    query = rule.query_template
                    if "{client_name}" in query:
                        query = query.replace("{client_name}", client_name)
                    if "{name}" in query:
                        query = query.replace("{name}", notebook.name)
                    if "{prospect_website}" in query:
                        query = query.replace("{prospect_website}", notebook.prospect_website or "")

                try:
                    search_results = await execute_web_search(query, search_engine=getattr(rule, "search_engine", "default"))
                    if not search_results:
                        output_content = f"Web search for '{query}' returned no results."
                    else:
                        # Compile context from results
                        search_context_blocks = []
                        for i, res in enumerate(search_results, 1):
                            search_context_blocks.append(
                                f"[{i}] {res['title']}\nURL: {res['url']}\nSnippet: {res['content']}"
                            )
                        search_context = "\n\n".join(search_context_blocks)

                        # Create and link a first-class Source for search results
                        search_source_title = f"Web Search: {query}"
                        source = Source(
                            title=search_source_title,
                            full_text=search_context,
                        )
                        await source.save()
                        await source.add_to_notebook(notebook_id)
                        try:
                            await source.vectorize()
                            logger.info(f"Submitted vectorization job for search source: {source.id}")
                        except Exception as ve:
                            logger.warning(f"Failed to submit vectorization for search source {source.id}: {ve}")

                        # Summarize via LLM
                        model = await provision_langchain_model(
                            content=f"{rule.prompt}\n\nSearch Context:\n{search_context}",
                            model_id=rule.model_override,
                            default_type="chat"
                        )

                        messages = [
                            SystemMessage(content="You are an expert market analyst AI."),
                            HumanMessage(content=f"{rule.prompt}\n\nSearch Context:\n{search_context}")
                        ]
                        response = await model.ainvoke(messages)
                        output_content = clean_thinking_content(extract_text_content(response.content))
                except Exception as se:
                    logger.error(f"Search failed for query '{query}': {se}")
                    output_content = f"Failed to complete web search for query '{query}': {str(se)}"

            # Create note in the database and link it
            if output_content:
                title = f"{rule.action_type.capitalize()} Intelligence: {stage}"
                note = Note(
                    title=title,
                    content=output_content,
                    note_type="ai"
                )
                await note.save()
                await note.add_to_notebook(notebook_id)
                logger.info(f"Saved note '{title}' for notebook {notebook_id}")

        except Exception as re:
            logger.error(f"Error executing rule {rule.id}: {re}")
        finally:
            # Decrement active scans
            ACTIVE_SCANS[notebook_id] = max(0, ACTIVE_SCANS.get(notebook_id, 0) - 1)
            if ACTIVE_SCANS[notebook_id] == 0:
                ACTIVE_SCANS.pop(notebook_id, None)
