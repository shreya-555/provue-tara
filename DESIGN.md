# Design Document: Tara (Provue Finance-Research Agent)

This document outlines the architectural decisions, database schema, tool design, and engineering tradeoffs made while building Tara, the finance-research AI agent.

## 1. Database Schema & Architecture

I used PostgreSQL paired with Drizzle ORM to ensure type-safe, predictable database interactions. The schema is designed for analytical querying, isolating raw transactions from normalized market data.

* **transactions**: Stores user spending.
  * Columns: `id`, `date` (mapped to txDate), `merchant`, `category`, `amount` (numeric(12, 2) for precision), `currency`, `memo`.
  * Indexes: Added `tx_date_idx`, `tx_merchant_idx`, and `tx_category_idx`. Since the LLM frequently filters by date boundaries, specific merchants, and categories, these indexes prevent full table scans.
* **funds**: Stores core mutual fund metadata (`id`, `name`, `category`).
* **fund_nav_history**: Normalized market data representing historical pricing.
  * Columns: `fund_id` (Foreign Key to funds.id), `nav_date`, `nav` (numeric(10, 4)).
  * Why: A separate time-series table allows deterministic, pure-SQL calculation of period returns without mixing state. Using precision 4 prevents floating-point drift.
* **holdings**: Represents the user's specific portfolio.
  * Columns: `fund_id` (FK to funds.id), `fund_name`, `units` (numeric(10, 4)), `purchase_date`, `purchase_nav`.

## 2. Tool Design & Strategy

Following best practices for LLM tool calling, I optimized for fewer, more expressive tools rather than a bloated context window full of narrow, overlapping tools.

* **query_transactions**: A highly parameterized tool handling all spend queries. It accepts optional arguments (`startDate`, `endDate`, `category`, `merchantPattern`). Instead of separate tools for "top merchants" vs "monthly spend," the LLM dynamically combines these parameters.
* **calculate_returns**: I consolidated the portfolio and market math into a single domain tool. By passing an intent parameter (e.g., `market_period` vs `portfolio_realized`), the LLM routes the user's question to the correct deterministic math function.

## 3. Grounding & Anti-Hallucination Guarantees

Grounding is enforced strictly through tool boundaries and systemic instructions:

* **No Raw Math**: The LLM is explicitly instructed never to perform arithmetic on raw rows in prose. All totals and percentages are calculated natively via PostgreSQL aggregations (`SUM`) or strict TypeScript logic.
* **Data Honesty**: If a Drizzle query returns an empty array or null, the tool explicitly returns a `{ status: "no_data" }` payload. The system prompt forces Tara to state "No data found" instead of hallucinating a zero or inventing a figure.
* **Untrusted Memos**: The prompt dictates that memo fields are noisy, unverified third-party text and must not be parsed as behavioral instructions.

## 4. Exact Formulas Used

Math is handled deterministically via code, never by the LLM.

* **Spend & Net Spend**: Computed via SQL `SUM(amount)`. Because refunds are ingested as negative values, the SUM naturally and accurately calculates net spend without complex conditional logic.
* **Merchant Matching**: Uses PostgreSQL `ILIKE` via Drizzle (`ilike(transactions.merchant, '%${merchantPattern}%')`). This allows a parameter like "Swiggy" to natively capture aliases like "Swiggy Instamart" or "SWIGGY ORDER" without hardcoding alias maps.
* **Fund Period Return (Market Math)**: `((End NAV - Start NAV) / Start NAV) * 100`. (Calculated using the `fund_nav_history` table).
* **Holding Realized Return (Portfolio Math)**: The dataset provides units and purchase_nav. The formula is: `(Units * Current Latest NAV) - (Units * Purchase NAV)`.

## 5. Evaluation Script

I built a repeatable evaluation script (`tests/eval.ts`) using `tsx` that targets the **live deployed `/ask` cloud endpoint (hosted on Render)**. 

To gracefully navigate Google Gemini's free-tier rate limits, the script includes a robust retry loop with algorithmic delays. It safely tests 12 specific edge cases required by the prompt, including:
* Single lookup & date filtering boundaries.
* Wildcard merchant alias matching (Swiggy).
* Ignoring self-transfers during spending calculations.
* Handling missing/empty categories ("uncategorized").
* Strict distinction between Market Period returns and Portfolio Realized returns.
* The "No Data" edge case (Rent in April 2025).

## 6. Long-Running Async Tool Milestone

I intentionally skipped the long-running async tool milestone (e.g., integrating BullMQ) for this submission.

* **Reasoning**: I budgeted my 8 hours entirely toward schema design, tool correctness, handling data anomalies (refunds, aliases), and ensuring flawless mathematical accuracy. Adding a message queue would have compromised the time needed to perfect the core deterministic logic. I designed the Express endpoint synchronously, though the codebase is structured so that `calculate_returns` could be offloaded to a worker without refactoring the AI agent itself.

## 7. Known Failure Modes & Future Improvements

If I had more time, I would address the following system vulnerabilities:

* **Fuzzy Search Limitations**: `ILIKE` is effective but primitive. A typo in the user's prompt ("Swigy") will yield 0 results. I would install the `pg_trgm` extension to enable true fuzzy text matching on merchants.
* **LLM Formatting Errors**: Occasionally, free-tier or smaller models output invalid JSON when calling complex tools. I would implement Zod schema validation with an auto-retry loop to catch and fix broken JSON payloads before they crash the Express handler.
* **Analytical Bottlenecks**: Currently, the agent queries the primary operational database. At scale, grouping massive transaction tables would cause latency. I would eventually route the agent's analytical read queries to a read-replica database.
