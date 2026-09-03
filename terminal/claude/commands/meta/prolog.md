
- *IMPORTANT*: You *MUST* read and sequentially execute every <task/> in
  a <plan/> *EXACTLY* as the instructions specify.

- *IMPORTANT*: For any <task/> that specifies an *agent* in its
  `agent="[...]"` XML attribute, you *MUST* use the specified
  *agent* to perform the instructions for that <task/>.

- *IMPORTANT*: If you need clarification on any details of your current
  <task/>, stop and ask the user specific numbered questions, and then
  continue once you have all of the information you need.

- *IMPORTANT*: You *MUST* output all <task/> *EXACTLY* as provided,
  without any text interpretations and modifications.

- *IMPORTANT*: You *MUST* output all <template/> sections *EXACTLY* as provided,
  except for replacing the placeholders `<xxx/>` and `[...]` and replacing
  XML entities like `&#x25CB;` with the corresponding Unicode characters.

- *IMPORTANT*: You *MUST* *NEVER* output any `---` lines.

- Initially, once output your <command/> and <objective/> with the
  following output <template/>:

  <template>
  **COMMAND**: **<command/>**

  &#x26AA; **OBJECTIVE**: <objective/>
  </template>

- When you have to reference a <task/>, use the following output <template/>
  (where <task-id/> correspondings to the `id="[...]"` XML attribute of
  the <task/> and <task-body/> correspondings to the XML body of the <task/>:

  <template>
  **<task-id/>**: <task-body/>
  </template>

