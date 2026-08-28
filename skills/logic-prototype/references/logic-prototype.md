# Logic prototype

Build one self-contained HTML file that answers a question about a state model,
transition rule, policy, schedule, or algorithm before production design or
implementation begins.

## Process

1. Put the exact question in a visible introduction. A prototype that answers another question is waste.
2. Isolate the logic in a small pure module inside one script block. Use a reducer, explicit state machine, pure functions, or a state-owning module according to the question. The logic must not depend on the DOM.
3. Keep all state in memory unless persistence is the question under test.
4. Render the current domain state in readable labels after every action.
5. Add free-play controls for every action or input the question needs.
6. Add guided scenarios for the main path, the difficult edge case, and an illegal transition, rejected input, or boundary condition. Starting a scenario resets known state.
7. Use plain HTML, CSS, and JavaScript with no framework, bundler, server, external resource, or installation step.
8. Use domain language for every label. A non-developer must be able to drive the model.
9. Check script syntax and scenario outcomes with deterministic local commands. These checks verify the logic without turning the artifact into production code.
10. Open or share the file, gather the user's reaction, and record the question, result, and rejected assumptions.
11. When the question is settled, keep the HTML shell out of production. Carry the validated behavior into production design or implementation as evidence, not as code to copy unchanged.

Skip production test suites, persistence that is not under study,
generalization, production error handling, and visual polish. The prototype
exists to learn quickly, not to become production by accident.

Source integrated from `mattpocock/skills`,
`skills/engineering/prototype/LOGIC.md`, read August 19, 2026. The UI prototype
branch was not copied because `impeccable` Live mode already owns visual
variants.
