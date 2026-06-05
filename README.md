# Provue Finance-Research Agent: Tara

Tara is an AI-powered personal finance-research persona built with the Mastra SDK. She allows users to ask natural-language questions about their spending, portfolio holdings, and market returns. Tara answers by executing deterministic, heavily constrained tools against a PostgreSQL database to ensure absolute grounding and mathematical accuracy.

## Tech Stack
* **Agent Framework:** Mastra SDK 
* **Backend:** Node.js / Express 5 / TypeScript
* **Database:** PostgreSQL (14+)
* **ORM:** Drizzle ORM
* **LLM Provider:** Google (`@ai-sdk/google` using `gemini-2.5-flash`)

## Deployed API URL
* **Base URL:** `https://your-app-name.onrender.com` *(Replace this with your actual Render URL)*
* **Endpoint:** `POST /ask`
* **Note on Deployment Limits:** This service and its PostgreSQL database are hosted on Render's Free Tier. If the service has not received a request in the last 15 minutes, the environment will spin down. The first subsequent request may experience a **30 to 50-second cold-start latency** while the server wakes up.

## Local Postgres Setup
During local development, this project was built using a local PostgreSQL instance. 
1. Ensure PostgreSQL 14+ is installed and running.
2. Create a local database (e.g., `provue_tara`).
3. Connect the application using the `DATABASE_URL` environment variable.

## Environment Variables
Create a `.env` file in the root of the project with the following keys:

```env
# Your connection string to your local or hosted PostgreSQL database
DATABASE_URL=postgres://postgres:password@localhost:5432/provue_tara

# Your Google AI Studio API Key (Required for the gemini-2.5-flash model)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key_here

# (Optional) Port for the Express server. Defaults to 3000.
PORT=3000
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
Start the Express server to expose the /ask endpoint:

Bash
npm run dev
4. Test the Endpoint
Send a POST request to the local server to interact with Tara:

Bash
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "How much did I spend on food in March 2025 after refunds?"}'
Running the Evaluation Suite
The project includes a robust, automated evaluation script that tests 12 specific edge cases (date boundaries, merchant aliases, portfolio math, etc.). Make sure your server is running (npm run dev), then open a new terminal window and run:

Bash
npx tsx tests/eval.ts
Documentation
Please refer to DESIGN.md for a comprehensive breakdown of the database schema, tool design, mathematical formulas, and architectural tradeoffs.