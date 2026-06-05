# Provue Finance-Research Agent: Tara

Tara is an AI-powered personal finance-research persona built with the Mastra SDK. She allows users to ask natural-language questions about their spending, portfolio holdings, and market returns. Tara answers by executing deterministic, heavily constrained tools against a PostgreSQL database to ensure absolute grounding and mathematical accuracy.

## Tech Stack
* **Agent Framework:** Mastra SDK 
* **Backend:** Node.js / Express 5 / TypeScript
* **Database:** PostgreSQL (14+)
* **ORM:** Drizzle ORM
* **LLM Provider:** Google (`@ai-sdk/google` using `gemini-2.5-flash`)

## Deployed API URL
* **Base URL:** `https://provue-tara.onrender.com/` 
* **Endpoint:** `POST /ask`
* **Note on Deployment Limits:** This service and its PostgreSQL database are hosted on Render's Free Tier. If the service has not received a request in the last 15 minutes, the environment will spin down. The first subsequent request may experience a **30 to 50-second cold-start latency** while the server wakes up.

## Local Postgres Setup
During local development, this project was built using a local PostgreSQL instance. 
1. Ensure PostgreSQL 14+ is installed and running.
2. Create a local database (e.g., `provue_tara`).
3. Connect the application using the `DATABASE_URL` environment variable.

## Environment Variables

To run this project locally or deploy your own instance, create a `.env` file in the root of the project. 

By default, the project is configured to use Google's Gemini, but you can securely provide keys for your preferred enterprise models:

```env
# Your connection string to your local or hosted PostgreSQL database
DATABASE_URL=postgres://postgres:password@localhost:5432/provue_tara

# Default: Google AI Studio API Key (for gemini-2.5-flash)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# Optional: Bring Your Own LLM (OpenAI, Anthropic, etc.)
# OPENAI_API_KEY=sk-your_openai_key_here
# ANTHROPIC_API_KEY=sk-ant-your_anthropic_key_here

# (Optional) Port for the Express server. Defaults to 3000.
PORT=3000
🔌 Bring Your Own LLM (Enterprise Models)
Because this agent is built on the Mastra SDK, it is entirely LLM-agnostic. You are not locked into using Google Gemini. If your organization requires the use of a different enterprise model (like OpenAI's gpt-4o, Anthropic's claude-3-5-sonnet, or a local model), you can easily swap it out.

To use a different provider:

Add your provider's API key to the .env file (e.g., OPENAI_API_KEY).

Open src/agent/index.ts.

Swap the provider import and model string. For example, to use OpenAI:

TypeScript
// Remove Google import
// import { google } from '@ai-sdk/google';

// Add OpenAI import
import { openai } from '@ai-sdk/openai';

// Inside the agent configuration:
model: openai("gpt-4o"),
Local Installation & Setup
1. Install Dependencies

Bash
npm install
2. Ingest the Data
The agent does not read JSON files at runtime. You must ingest a snapshot into the PostgreSQL database. The ingestion script dynamically handles table generation and data parsing.

Pass the path to the desired snapshot folder using the DATA_DIR environment variable:

Bash
# Example using sample_c
DATA_DIR=./data/sample_c npx tsx scripts/ingest.ts
3. Run the Server
Start the Express server to expose the /ask endpoint locally:

Bash
npm run dev
4. Test the Endpoint
Send a POST request to the local server to interact with Tara:

Bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How much did I spend on food in March 2025 after refunds?"}'
Running the Evaluation Suite
The project includes a robust, automated evaluation script that tests 12 specific edge cases (date boundaries, merchant aliases, portfolio math, etc.).

Note: The script is currently configured to test the live deployed Render URL, so you do not need to boot the local server to run it.

To run the full suite, open a terminal window and execute:

Bash
npx tsx tests/eval.ts
Documentation
Please refer to DESIGN.md for a comprehensive breakdown of the database schema, tool design, mathematical formulas, and architectural tradeoffs.
