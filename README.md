# n8n-nodes-calendar-gate

This is an n8n community node that lets you stop or allow workflow execution based on calendar rules—such as static/recurring public holidays (`01-01-*`, `12-25-*`), days of the week, date & time ranges, and daily time windows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation) · [Operations](#operations) · [Compatibility](#compatibility) · [Usage](#usage) · [Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

1. In n8n, go to **Settings → Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-calendar-gate` in **Enter npm package name**.
4. Agree to the risks of using community nodes and select **Install**.

## Operations

The **Calendar Gate** node evaluates incoming items against one or more calendar rules in a chosen IANA timezone:

- **Gate Mode**:
  - **Stop Workflow on Match**: Halts execution if the calendar rules match (e.g., stop on public holidays or weekends).
  - **Allow Only on Match**: Passes items through only when the calendar rules match (e.g., allow only during business hours).
- **On Stop Action**:
  - **Halt Branch (Return No Items)**: Silently stops downstream nodes by returning an empty output.
  - **Throw Error**: Fails the execution with a descriptive error message.
- **Match Logic**:
  - **Any Rule Matches (OR)**: Triggers if at least one rule matches.
  - **All Rules Match (AND)**: Triggers only if every configured rule matches.
- **Calendar Rules** (add as many rules as needed):
  - **Public Holiday / Recurring Date**: Comma-separated patterns supporting `MM-DD-*` (e.g. `01-01-*, 12-25-*`), `MM-DD`, and exact `YYYY-MM-DD` dates.
  - **Day of Week**: Multi-select days (`Sunday`–`Saturday`) with an optional `HH:mm` start/end time window.
  - **Date & Time Range**: Start and end `dateTime` bounds.
  - **Daily Time Window**: `HH:mm` start and end times (supports overnight wrap-around such as `22:00`–`06:00`).
- **Timezone**: Any IANA timezone (e.g., `UTC`, `America/Chicago`, `Asia/Ho_Chi_Minh`).
- **Reference Date/Time**: Leave empty to evaluate the current time, or pass an ISO timestamp expression (e.g. `{{$json.timestamp}}`).

## Compatibility

- Tested with n8n `1.x` (`n8nNodesApiVersion: 1`).
- Requires Node.js `>= 18` (zero external runtime dependencies; uses built-in `Intl.DateTimeFormat`).

## Usage

### Example 1: Stop Workflow on Public Holidays and Weekends

1. Set **Gate Mode** to `Stop Workflow on Match`.
2. Set **Match Logic** to `Any Rule Matches (OR)`.
3. Set **Timezone** to your local IANA timezone (e.g. `America/Chicago`).
4. Add a **Public Holiday / Recurring Date** rule with patterns: `01-01-*, 12-25-*`.
5. Add a **Day of Week** rule and select `Saturday` and `Sunday`.

### Example 2: Run Only During Business Hours (Mon–Fri, 09:00–17:00)

1. Set **Gate Mode** to `Allow Only on Match`.
2. Add a **Day of Week** rule with `Monday`–`Friday`, **Start Time** `09:00`, and **End Time** `17:00`.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [GitHub repository](https://github.com/tedious-code/n8n-nodes-calendar-gate)

## License

[MIT](https://opensource.org/licenses/MIT)
