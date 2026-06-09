import pytest
import os
import time
from playwright.sync_api import sync_playwright

HTML_PATH = "file://" + os.path.abspath("docs/notebook-features-rev-3/bento-console/index.html")

@pytest.fixture(scope="session")
def playwright_instance():
    with sync_playwright() as p:
        yield p

@pytest.fixture(scope="session")
def browser(playwright_instance):
    browser = playwright_instance.chromium.launch(headless=True)
    yield browser
    browser.close()

@pytest.fixture
def page(browser):
    context = browser.new_context()
    page = context.new_page()
    page.goto(HTML_PATH, wait_until="domcontentloaded")
    page.wait_for_selector("#search-input")
    yield page
    context.close()

# ==========================================
# TIER 1: FEATURE COVERAGE (25 Tests)
# ==========================================

# --- F1: Layout & Grid Structure ---
def test_t1_f1_grid_existence(page):
    grid = page.locator("main > div.grid")
    assert grid.is_visible()

def test_t1_f1_card_count(page):
    cards = page.locator(".cyber-glass-card")
    assert cards.count() == 6

def test_t1_f1_card_spans(page):
    card1 = page.locator(".cyber-glass-card").first
    assert "md:col-span-2" in (card1.get_attribute("class") or "")

def test_t1_f1_role_selector(page):
    selector = page.locator("#role-selector")
    assert "Mode: Administrator" in (selector.text_content() or "")

def test_t1_f1_role_selector_action(page):
    page.locator("#role-selector").click()
    selector = page.locator("#role-selector")
    assert "Mode: Operator" in (selector.text_content() or "")

# --- F2: AI Search & Deep Research ---
def test_t1_f2_search_inputs(page):
    assert page.locator("#search-input").is_visible()
    assert page.locator("#search-engine").is_visible()

def test_t1_f2_depth_selection(page):
    radio = page.locator("input[name='research-depth']").first
    assert radio.is_checked()

def test_t1_f2_run_research_inactive(page):
    assert page.evaluate("window.researchActive") is False

def test_t1_f2_progress_bar_hidden(page):
    assert "hidden" in (page.locator("#research-progress-bar-container").get_attribute("class") or "")

def test_t1_f2_agent_thoughts_exist(page):
    assert page.locator("#research-agent-thoughts").is_visible()

# --- F3: WebRTC Voice AI ---
def test_t1_f3_voice_badge_offline(page):
    badge = page.locator("#voice-status")
    assert "Offline" in (badge.text_content() or "")

def test_t1_f3_voice_mute_disabled(page):
    assert page.locator("#btn-mute-voice").is_disabled()

def test_t1_f3_voice_latency_empty(page):
    assert "Latency: -- ms" in (page.locator("#voice-latency").text_content() or "")

def test_t1_f3_voice_orb_exists(page):
    assert page.locator("#voice-avatar-ring").is_visible()

def test_t1_f3_voice_transcript_empty(page):
    assert "No active transcription" in (page.locator("#voice-transcript").text_content() or "")

# --- F4: pgvector Cache Metrics ---
def test_t1_f4_cache_hit_rate(page):
    assert page.evaluate("window.cacheHitRate") == 87.5

def test_t1_f4_vector_count(page):
    assert page.evaluate("window.vectorCount") == 1492

def test_t1_f4_saved_costs(page):
    assert page.evaluate("window.savedCost") == 184.25

def test_t1_f4_pool_size(page):
    size_str = page.locator("#stat-pool-size").text_content()
    assert "34.2 MB" in (size_str or "")

def test_t1_f4_clear_cache_button(page):
    btn = page.locator("button:has-text('Clear Cache')")
    assert btn.is_visible()

# --- F5: Compliance & Containers ---
def test_t1_f5_compliance_score(page):
    assert page.evaluate("window.complianceScore") == 66

def test_t1_f5_compliance_ring(page):
    circle = page.locator("#compliance-svg-circle")
    assert circle.is_visible()

def test_t1_f5_checklist_count(page):
    items = page.locator("#compliance-checklist-container label")
    assert items.count() == 3

def test_t1_f5_container_count(page):
    indicators = page.locator("[id^='container-'][id$='-indicator']")
    assert indicators.count() == 5

def test_t1_f5_postgres_healthy(page):
    assert page.evaluate("window.containers.postgres.health") == "healthy"

# ==========================================
# TIER 2: EDGE CASES & VALIDATION (15 Tests)
# ==========================================

# --- F1: Layout & Mode Switching Edge Cases ---
def test_t2_f1_role_cycle_multiple(page):
    # Cycle twice
    page.locator("#role-selector").click()
    page.locator("#role-selector").click()
    selector = page.locator("#role-selector")
    assert "Mode: Administrator" in (selector.text_content() or "")

def test_t2_f1_camera_recenter_logs(page):
    page.locator("button:has-text('Recenter Map')").click()
    # Check logs
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("Recenter camera" in msg for msg in logs)

def test_t2_f1_empty_search(page):
    # Clear and run
    page.fill("#search-input", "")
    page.locator("#btn-run-research").click()
    val = page.input_value("#search-input")
    assert val == "Rare Earth metals refinery supply chains"

# --- F2: Research Validation & Triggers ---
def test_t2_f2_research_active_during_run(page):
    page.locator("#btn-run-research").click()
    assert page.evaluate("window.researchActive") is True

def test_t2_f2_research_run_progress(page):
    page.locator("#btn-run-research").click()
    # Wait for progress bar to appear
    page.wait_for_selector("#research-progress-bar-container:not(.hidden)")
    assert page.locator("#research-progress-bar-container").is_visible()


def test_t2_f2_research_duplicate_prevention(page):
    page.locator("#btn-run-research").click()
    # Triggering again should not raise error
    page.locator("#btn-run-research").click()
    assert page.evaluate("window.researchActive") is True

# --- F3: Voice WebRTC States ---
def test_t2_f3_voice_connection_transition(page):
    page.locator("#btn-toggle-voice").click()
    # Wait for connected state
    page.wait_for_function("window.voiceConnected === true")
    badge = page.locator("#voice-status")
    assert "Connected" in (badge.text_content() or "")

def test_t2_f3_voice_mute_toggle(page):
    page.locator("#btn-toggle-voice").click()
    page.wait_for_function("window.voiceConnected === true")
    # Click mute
    page.locator("#btn-mute-voice").click()
    assert page.evaluate("window.voiceMuted") is True

def test_t2_f3_voice_disconnect(page):
    page.locator("#btn-toggle-voice").click()
    page.wait_for_function("window.voiceConnected === true")
    page.locator("#btn-toggle-voice").click()
    assert page.evaluate("window.voiceConnected") is False

# --- F4: pgvector Cache Truncation ---
def test_t2_f4_clear_cache_action(page):
    page.locator("button:has-text('Clear Cache')").click()
    page.wait_for_function("window.vectorCount === 0")
    assert page.evaluate("window.vectorCount") == 0
    assert page.evaluate("window.savedCost") == 0.0

def test_t2_f4_clear_cache_log(page):
    page.locator("button:has-text('Clear Cache')").click()
    page.wait_for_function("window.vectorCount === 0")
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("Truncated" in msg or "cleared" in msg for msg in logs)

def test_t2_f4_search_refreshes_cache(page):
    page.locator("button:has-text('Clear Cache')").click()
    page.wait_for_function("window.vectorCount === 0")
    # Trigger search
    page.locator("#btn-run-research").click()
    # Wait for completion
    page.wait_for_function("window.researchActive === false", timeout=12000)
    assert page.evaluate("window.vectorCount") == 12

# --- F5: Compliance & Telemetry Edge Cases ---
def test_t2_f5_checklist_uncheck_all(page):
    page.locator("#chk-boundary").uncheck()
    page.locator("#chk-auth").uncheck()
    page.locator("#chk-physical").uncheck()
    assert page.evaluate("window.complianceScore") == 0

def test_t2_f5_checklist_check_all(page):
    page.locator("#chk-boundary").check()
    page.locator("#chk-auth").check()
    page.locator("#chk-physical").check()
    assert page.evaluate("window.complianceScore") == 100
    badge = page.locator("#compliance-badge")
    assert "Healthy" in (badge.text_content() or "")

def test_t2_f5_inject_db_crash(page):
    page.locator("button:has-text('Simulate DB Crash')").click()
    assert page.evaluate("window.containers.postgres.health") == "offline"
    badge = page.locator("#containers-overall-badge")
    assert "Degraded" in (badge.text_content() or "")

# ==========================================
# TIER 3: MULTI-PROCESS INTEGRATIONS (10 Tests)
# ==========================================

def test_t3_research_during_voice(page):
    # Connect Voice
    page.locator("#btn-toggle-voice").click()
    page.wait_for_function("window.voiceConnected === true")
    # Run Research
    page.locator("#btn-run-research").click()
    assert page.evaluate("window.researchActive") is True
    assert page.evaluate("window.voiceConnected") is True

def test_t3_manual_audit_logs(page):
    page.locator("button:has-text('Run CSET Audit')").click()
    page.wait_for_timeout(600)
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("CSET scan" in msg for msg in logs)

def test_t3_log_level_filtering(page):
    # Filter error logs
    page.locator(".log-tab[data-level='ERROR']").click()
    assert page.evaluate("window.logQueue.currentFilter") == "ERROR"

def test_t3_log_search(page):
    page.fill("#logSearch", "postgres")
    assert page.evaluate("window.logQueue.searchQuery") == "postgres"

def test_t3_log_auto_scroll(page):
    page.locator("#logAutoScroll").uncheck()
    assert page.evaluate("window.logQueue.autoScroll") is False

def test_t3_log_clear(page):
    page.locator("button:has-text('Clear Logs')").click()
    assert len(page.evaluate("window.logQueue.logs")) == 0

def test_t3_sre_auto_healing_logs(page):
    page.locator("button:has-text('Simulate DB Crash')").click()
    page.wait_for_timeout(1500)
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("postgres container unhealthy" in msg for msg in logs)

def test_t3_sre_auto_healing_completion(page):
    page.locator("button:has-text('Simulate DB Crash')").click()
    # Wait for self healing to complete
    page.wait_for_function("window.containers.postgres.health === 'healthy'", timeout=8000)
    assert page.evaluate("window.containers.postgres.health") == "healthy"

def test_t3_auto_audit_complete(page):
    page.locator("button:has-text('Auto Audit')").click()
    page.wait_for_function("window.complianceScore === 100", timeout=3000)
    assert page.evaluate("window.complianceScore") == 100

def test_t3_auto_audit_logs(page):
    page.locator("button:has-text('Auto Audit')").click()
    page.wait_for_function("window.complianceScore === 100", timeout=3000)
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("Audit complete" in msg or "auto-audit complete" in msg for msg in logs)

# ==========================================
# TIER 4: WORKFLOWS & BUSINESS SCENARIOS (10 Tests)
# ==========================================

def test_t4_full_analyst_flow(page):
    # Truncate cache
    page.locator("button:has-text('Clear Cache')").click()
    page.wait_for_function("window.vectorCount === 0")
    
    # Enter search and trigger deep research
    page.fill("#search-input", "competitor tech Moats")
    page.locator("#btn-run-research").click()
    
    # Wait for research to compile
    page.wait_for_function("window.researchActive === false", timeout=12000)
    
    # Check stats incremented
    assert page.evaluate("window.vectorCount") == 12
    assert page.evaluate("window.savedCost") > 0.0
    
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("competitor tech Moats" in msg for msg in logs)

def test_t4_full_compliance_remediation_flow(page):
    # Uncheck controls
    page.locator("#chk-boundary").uncheck()
    page.locator("#chk-auth").uncheck()
    page.locator("#chk-physical").uncheck()
    assert page.evaluate("window.complianceScore") == 0
    
    # Run Auto Audit
    page.locator("button:has-text('Auto Audit')").click()
    
    # Wait for remediation
    page.wait_for_function("window.complianceScore === 100", timeout=3000)
    assert page.evaluate("window.complianceScore") == 100
    
    badge = page.locator("#compliance-badge")
    assert "Healthy" in (badge.text_content() or "")

def test_t4_sre_crash_and_healing_flow(page):
    page.locator("button:has-text('Simulate DB Crash')").click()
    assert page.evaluate("window.containers.postgres.health") == "offline"
    
    # Check degraded badge
    assert "Degraded" in (page.locator("#containers-overall-badge").text_content() or "")
    
    # Wait for healing
    page.wait_for_function("window.containers.postgres.health === 'healthy'", timeout=8000)
    assert page.locator("#container-postgres-cpu").text_content() != "0.0%"
    assert "All Healthy" in (page.locator("#containers-overall-badge").text_content() or "")

def test_t4_voice_assistant_webrtc_concurrency(page):
    page.locator("#btn-toggle-voice").click()
    page.wait_for_function("window.voiceConnected === true")
    
    # Wait for a transcript to stream
    page.wait_for_timeout(6000)
    transcript = page.locator("#voice-transcript").text_content() or ""
    assert "[ASSISTANT]" in transcript or "[USER]" in transcript

def test_t4_concurrent_research_and_voice(page):
    # Connect voice
    page.locator("#btn-toggle-voice").click()
    page.wait_for_function("window.voiceConnected === true")
    
    # Run research
    page.locator("#btn-run-research").click()
    
    # Wait for research compilation while voice stays connected
    page.wait_for_function("window.researchActive === false", timeout=12000)
    assert page.evaluate("window.voiceConnected") is True
    assert page.evaluate("window.vectorCount") == 1504

def test_t4_log_terminal_management(page):
    # Crash to inject log messages
    page.locator("button:has-text('Simulate DB Crash')").click()
    page.wait_for_timeout(2000)
    
    # Search for "unhealthy"
    page.fill("#logSearch", "unhealthy")
    page.wait_for_timeout(300)
    
    stream_content = page.locator("#logStream").text_content() or ""
    assert "unhealthy" in stream_content.lower()
    
    # Clear search
    page.fill("#logSearch", "")
    page.locator("button:has-text('Clear Logs')").click()
    assert len(page.evaluate("window.logQueue.logs")) == 0

def test_t4_role_based_permissions_log(page):
    # Switch role
    page.locator("#role-selector").click()
    page.wait_for_timeout(300)
    
    logs = page.evaluate("window.logQueue.logs.map(l => l.message)")
    assert any("switched role to Operator" in msg for msg in logs)

def test_t4_cset_custom_audit_scenarios(page):
    page.locator("#chk-boundary").uncheck()
    page.locator("#chk-auth").check()
    page.locator("#chk-physical").uncheck()
    assert page.evaluate("window.complianceScore") == 33

def test_t4_micro_telemetry_monitoring(page):
    postgres_cpu = page.locator("#container-postgres-cpu").text_content() or ""
    assert "%" in postgres_cpu
    assert postgres_cpu != "0.0%"

def test_t4_database_pruning_and_observability(page):
    logs = page.evaluate("window.logQueue.logs")
    assert len(logs) > 0
    assert "severity" in logs[0]
    assert "tag" in logs[0]
