# Logic prototype

Build one self-contained HTML file that answers a question about business logic, state transitions, data shape, or an interface before production implementation begins.

## Process

1. Put the exact question in a visible introduction. A prototype that answers another question is waste.
2. Isolate the logic in a small pure module inside one script block. Use a reducer, explicit state machine, pure functions, or a state-owning module according to the question. The logic must not depend on the DOM.
3. Keep all state in memory unless persistence is the question under test.
4. Render the current domain state in readable labels after every action.
5. Add free-play controls for every action.
6. Add guided scenarios for the happy path, the difficult edge case, and an illegal transition. Starting a scenario resets known state.
7. Use plain HTML, CSS, and JavaScript with no framework, bundler, server, external resource, or installation step.
8. Use domain language for every label. A non-developer must be able to drive the model.
9. Open or share the file, gather the user's reaction, and record the question, result, and rejected assumptions.
10. When the question is settled, move the validated logic into the real architecture through normal TDD. The HTML shell stays a prototype and does not ship.

Skip tests, persistence, generalization, production error handling, and visual polish. The prototype exists to learn quickly, not to become production by accident.

Source integrated from `mattpocock/skills`, `skills/engineering/prototype/LOGIC.md`, read August 19, 2026. The UI prototype branch was not copied because `impeccable` Live mode already owns visual variants.
