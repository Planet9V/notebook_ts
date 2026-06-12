# E2E Test Infra: Loom Topological Operations Map Mockup

## Test Philosophy
- Opaque-box and grey-box testing. Playwright loads the static mockup HTML directly.
- Coverage of all key features (Force-Directed Graph, Connections, Sidebar Inspector, Controls Dashboard, SRE Simulation).
- Structured in 4 Tiers to guarantee feature coverage, boundaries, combinations, and real-world workloads.

## Feature Inventory
| # | Feature | Selector/API | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|--------------|:------:|:------:|:------:|:------:|
| F1| Force-Directed Graph | `#loomCanvas`, `window.nodes` | 5 | 5 | ✓ | ✓ |
| F2| Connections/Particles | `window.connections` | 5 | 5 | ✓ | ✓ |
| F3| Sidebar Inspector | `#inspector-panel`, `#inspector-content` | 5 | 5 | ✓ | ✓ |
| F4| Controls Dashboard | `#control-panel`, `#spawner-panel`, HUD | 5 | 5 | ✓ | ✓ |
| F5| SRE Simulation | `#logs-panel`, `window.sreLoop` | 5 | 5 | ✓ | ✓ |

## Test Architecture
- Test runner: `pytest` with `pytest-playwright` plugin.
- Target URL: `file:///Users/jimmcknney/notebook_tetrel/docs/notebook-features-rev-3/loom-next-gen/index.html`
- File location: `tests/test_loom_mockup.py`

## Test Cases Plan

### Tier 1: Feature Coverage (25 tests)
#### F1: Force-Directed Graph
1. Test Canvas existence and visible size.
2. Test initial nodes loaded (7 nodes) via page evaluate check on `window.nodes`.
3. Test canvas drag (mouse interaction) doesn't crash the page.
4. Test node dragging updates its coordinates in `window.nodes`.
5. Test mousewheel zoom updates the `window.zoom` value.

#### F2: Connections/Particles
6. Test initial connections loaded (6 connections) via page evaluate check on `window.connections`.
7. Test active particles are updated in the connection objects (particles have non-zero `t` values).
8. Test dynamic connection creation by adding a connection in code or UI and verifying connection length increases.
9. Test connection style evaluates to 'error' when target node is in error state.
10. Test connection style evaluates to 'active' when a node is in processing state.

#### F3: Sidebar Inspector
11. Test clicking a node opens the `#inspector-panel`.
12. Test inspector title displays node label correctly.
13. Test inspector content updates depending on node type (e.g. CSET compliance checklist for compliance nodes).
14. Test closing the inspector panel sets `window.selectedNode` to null.
15. Test checklist toggle in inspector triggers appropriate console log.

#### F4: Cybernetic Controls Dashboard
16. Test HUD Zoom In/Zoom Out buttons update the zoom level.
17. Test Recenter Map button resets pan and zoom to baseline.
18. Test speed throttling slider updates `window.simulationSpeed`.
19. Test filters toggle visibility (shows/hides nodes from rendering/interaction logic).
20. Test spawning a node (e.g. Client Lead) increases node list size and logs the event.

#### F5: SRE Simulation & Logs
21. Test SRE loop starts in IDLE status.
22. Test manual trigger of SRE Diagnostics immediately enters FAULT_INJECTION.
23. Test logging terminal `#logs-panel` displays initial boot logs.
24. Test terminal logs filter by severity (clicking INFO hides non-INFO log lines).
25. Test clear log button clears the terminal.

---

### Tier 2: Boundary & Corner Cases (25 tests)
#### F1: Force-Directed Graph
26. Test zoom bounds: verify zoom cannot exceed 4.0 or go below 0.15.
27. Test empty canvas: hidden nodes do not generate forces.
28. Test extreme coordinates: physics integrations damp velocity.
29. Test draggedNode is not affected by gravitational forces.
30. Test collision bounds: coordinates do not escape reasonable bounds.

#### F2: Connections/Particles
31. Test connection between same nodes is blocked (prevent duplicates).
32. Test connection from a node to itself is not allowed or is handled gracefully.
33. Test particles loop back to `t = 0.0` when they reach `1.0`.
34. Test temporary link exists and updates during active drag-to-connect.
35. Test deleting/fading temporary connections when connection completes.

#### F3: Sidebar Inspector
36. Test selecting a non-existent or hidden node closes the inspector.
37. Test extreme values in sales deal size (negative numbers, overflow values).
38. Test checklist toggle when all items are checked sets compliance score to 100%.
39. Test automatic audit button sets compliance score to 100% directly.
40. Test clicking a node when inspector is open transitions details smoothly to the new node.

#### F4: Cybernetic Controls Dashboard
41. Test spawning multiple nodes in rapid succession increments IDs correctly.
42. Test speed slider at maximum (3x) updates physics simulation speed.
43. Test speed slider at minimum (0.25x) updates physics simulation speed.
44. Test toggling all filter checkboxes to hidden leaves canvas empty.
45. Test role switching cycles through all 4 roles.

#### F5: SRE Simulation & Logs
46. Test database node error status transitions db connection state to warning.
47. Test PR node spawned has correct temporary connections.
48. Test logs auto-scroll property is preserved.
49. Test search box filters logs correctly.
50. Test SRE loop state machine does not advance when simulation is paused.

---

### Tier 3: Cross-Feature Combinations (5 tests)
51. Test SRE Fault injection and opening Database inspector details.
52. Test Spawning a node, filtering its category, and verifying inspector closes.
53. Test Zooming out, panning, and then clicking Recenter Map resets view properly.
54. Test Triggering Research Run while running SRE Diagnostic loop concurrently.
55. Test Dragging a node while SRE auto-healing PR node is spawned and verifying simulation does not crash.

---

### Tier 4: Real-World Scenarios (5 tests)
56. Full SRE Auto-healing walkthrough: Fault injection -> diagnosing -> hotfix -> PR -> integration tests -> heal -> cleanup.
57. Complete Sales workflow: Spawn lead -> select lead -> update deal value -> sign contract -> check closed-won status.
58. Compliance upgrade workflow: Select refinery node -> notice sub-90% compliance -> run automatic CSET audit -> check 100% score.
59. Deep research pipeline simulation: Click "Run Deep Research" -> check logs for Valyu crawl -> verify status changes from Idle -> Polling -> Complete.
60. Concurrent multi-process simulation: Trigger research, compliance audit, and podcast generation, then check speed throttling and logs terminal throughput.
