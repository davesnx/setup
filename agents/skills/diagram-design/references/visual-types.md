# Visual types

Load this catalog when choosing a layout or checking its complexity budget. Load the selected type reference before drawing; do not load all types.

## Selection

When behavior, state, enforcement, or risk carries the meaning, first load [semantic-patterns.md](semantic-patterns.md) and choose one primary pattern. Then choose the nearest visual type for layout. If no pattern matches, choose the type directly.

| Behavioral trigger | Semantic pattern → nearest type |
|---|---|
| Fan-in, queue depth, finite capacity, bottleneck | **Fan-in queue / bottleneck** → Data flow |
| Repeated Question / Input / Governance / Output slots across stages | **Stage framework with semantic slots** → Process |
| Conversation or loose input becomes a structured durable artifact | **Unstructured input → structured artifact** → Data flow |
| Two rule traces need pass/fail/skipped/not-reached and first divergence | **Paired policy-evaluation traces** → Flowchart |
| Trust boundaries plus permitted/forbidden ingress or deploy paths | **Secure paved road** → Architecture |
| Controls grouped by where they are enforced | **Governance / control catalog** → Layer stack |
| Defenses compensate for prior gaps and residual risk propagates | **Compensating security layers** → Layer stack |

The pattern owns semantic primitives and its tighter budget; the type owns layout grammar. Pick the dominant axis rather than mixing two layout grammars.

## Visual-type guide (39)

| If you're showing… | Use | Reference |
|---|---|---|
| Components + connections in a system | **Architecture** | [type-architecture.md](type-architecture.md) |
| Legacy IT landscape grouped by phase/department; documents the *before* state in modernization proposals | **IT current-state** | [type-it-state.md](type-it-state.md) |
| Decision logic with branches | **Flowchart** | [type-flowchart.md](type-flowchart.md) |
| Time-ordered messages between actors | **Sequence** | [type-sequence.md](type-sequence.md) |
| States + transitions + guards | **State machine** | [type-state.md](type-state.md) |
| Entities + fields + relationships | **ER / data model** | [type-er.md](type-er.md) |
| Events positioned in time | **Timeline** | [type-timeline.md](type-timeline.md) |
| Cross-functional process with handoffs | **Swimlane** | [type-swimlane.md](type-swimlane.md) |
| Two-axis positioning / prioritization | **Quadrant** | [type-quadrant.md](type-quadrant.md) |
| Multiple entities scored across 3–5 quantitative criteria | **Radar / Spider** | [type-radar.md](type-radar.md) |
| One quantitative series across cyclic categories; angle=category, radius=magnitude | **Polar chart** | [type-polar.md](type-polar.md) |
| Reinforcing cycle / flywheel where the last step feeds the first and a shared hub accumulates state | **Loop** | [type-loop.md](type-loop.md) |
| Hierarchy through containment / scope | **Nested** | [type-nested.md](type-nested.md) |
| Parent → children relationships | **Tree** | [type-tree.md](type-tree.md) |
| Human/agent/team ownership, reporting, routing, escalation | **Org chart** | [type-org-chart.md](type-org-chart.md) |
| Stacked abstraction levels | **Layer stack** | [type-layers.md](type-layers.md) |
| Overlap between sets | **Venn** | [type-venn.md](type-venn.md) |
| Ranked hierarchy or conversion drop-off | **Pyramid / funnel** | [type-pyramid.md](type-pyramid.md) |
| Quantitative comparison across categories | **Bar chart** | [type-bar.md](type-bar.md) |
| Part-of-whole where the relative sizes are the story | **Treemap** | [type-treemap.md](type-treemap.md) |
| Continuous trends over time, change between exactly two states (slopegraph), or one distribution per series (ridgeline) | **Line chart** | [type-line.md](type-line.md) |
| Tasks and phases on a timeline | **Gantt** | [type-gantt.md](type-gantt.md) |
| Distribution and correlation between two variables, or three with area-sized marks (bubble) | **Scatter plot** | [type-scatter.md](type-scatter.md) |
| End-to-end data stack on a container cluster | **High-Level** | [type-high-level.md](type-high-level.md) |
| Multi-actor sequential process with data handoffs | **Process** | [type-process.md](type-process.md) |
| Multi-tier data storage with quality levels and access policies | **Medallion** | [type-medallion.md](type-medallion.md) |
| Role-scoped data flow: who does what at each pipeline step | **Data flow** | [type-data-flow.md](type-data-flow.md) |
| Integration topology of a data platform — sources → core → consumers | **DP integration** | [type-dp-integration.md](type-dp-integration.md) |
| Per-role / per-component access permissions matrix | **DP security matrix** | [type-dp-security-matrix.md](type-dp-security-matrix.md) |
| A quantity splitting and merging across stages, band width = amount | **Sankey** | [type-sankey.md](type-sankey.md) |
| Causes of one observed effect, grouped by category (root-cause analysis) | **Fishbone** | [type-fishbone.md](type-fishbone.md) |
| Value chain against evolution — what to build, buy, and what is moving | **Wardley map** | [type-wardley.md](type-wardley.md) |
| Work-in-progress by state, with WIP limits and blocked items | **Kanban** | [type-kanban.md](type-kanban.md) |
| What a person does across stages of an experience, and how it feels | **User journey** | [type-journey.md](type-journey.md) |
| Where software runs — zones, hosts, artifacts, replicas, ports | **Deployment** | [type-deployment.md](type-deployment.md) |
| What depends on what, with fan-in and cycles a tree cannot express | **Dependency graph** | [type-dependency.md](type-dependency.md) |
| Classes with operations, inheritance, composition (other UML routes elsewhere) | **UML class** | [type-uml-class.md](type-uml-class.md) |
| Narrative backbone sliced into releases, with the cut line | **Story map** | [type-story-map.md](type-story-map.md) |
| Physical tables: SQL types, constraints, indexes, column-level FKs | **Database schema** | [type-db-schema.md](type-db-schema.md) |

## Complexity budget

| Limit | Rule |
|---|---|
| Max nodes | 9 |
| Max arrows / transitions | 12 |
| Max coral elements | 2 |
| Max lifelines (sequence) | 5 |
| Max combined fragments (sequence) | 1 (default); 2 only if each is single-region `opt`/`loop` |
| Max `alt` regions (sequence) | 2 |
| Max fragment nesting (sequence) | 1 |
| Max lanes (swimlane) | 5 |
| Max items (quadrant) | 12 |
| Max entities (ER) | 8 |
| Max nesting levels (nested) | 6 |
| Max tree depth | 4 |
| Max org chart depth | 4 |
| Max org chart nodes | 12 |
| Max layers (layer stack) | 6 |
| Max circles (venn) | 3 |
| Max layers (pyramid) | 6 |
| Max radar axes | 5 |
| Max radar series | 5 |
| Max focal radar series | 1 |
| Max polar categories | 8 |
| Max polar series | 1 |
| Max focal polar categories | 1 |
| Max bars (bar chart) | 8 |
| Max cells (treemap) | 8 |
| Max series (line chart) | 5 |
| Max tasks (Gantt) | 12 |
| Max points (scatter plot) | 30 |
| Max stages / nodes / flows (sankey) | 3 / 8 / 12 |
| Max categories (fishbone) | 6 bones, 3 sub-causes each |
| Max components / links (wardley) | 9 / 12, 2 movement arrows |
| Max columns / cards (kanban) | 5 / 12 total, 4 per column |
| Max stages / rows (user journey) | 6 / 3, 2 pain markers |
| Max zones / nodes / paths (deployment) | 3 / 6 / 8, 9 artifacts |
| Max nodes / edges (dependency) | 9 / 14, 4 ranks, 1 cycle |
| Max classes / relationships (UML class) | 7 / 8, 5 members per compartment |
| Max activities / slices / cards (story map) | 5 / 3 / 12 |
| Max tables / columns / FKs (db schema) | 5 / 8 shown / 6 |
| Max annotation callouts | 2 |
| Max motion (optional) | 8 steps, 12 marked items, 2 simultaneous items — see [animation.md](animation.md) |

If you exceed, split into overview + detail. Apply the selected type's geometry limits and any tighter semantic-pattern budget. For imports, only `faithful` grants the conditional budget exemption in [output-spec.md](output-spec.md#3-detail-level); connector rules never relax because of import density.
