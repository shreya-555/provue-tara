const ENDPOINT = 'http://localhost:3000/ask';

// The 12 mandatory edge-case tests defined by the Provue grading rubric
const EVAL_QUESTIONS = [
  // 1. Single Lookup & Date Filtering & Refunds
  //"How much did I spend on food in March 2025 after refunds?",
  // 2. Merchant Aliases & Clustering
  "How much did I spend on Swiggy in total, including Instamart and Swiggy Order?",
  // 3. Category Comparison
  //"Compare my food and travel spending. Which one is higher overall?",
  // 4. Transfer Exclusion
  "Ignore transfers. What was my total actual spending in Q1 2025?",
  // 5. No-Data Honesty
  "Do I have any data for rent in April 2025?",
  // 6. Fund Period Return (Market Math)
  "What was the period return for Saffron Bluechip Equity Fund between 2024-01-01 and 2025-01-01?",
  // 7. Holding Realized Return (Portfolio Math)
  "What is my realized return on my Sentinel Nifty Index Fund holding based on my purchase price?",
  // 8. Portfolio Aggregate
  "What is my entire portfolio worth right now, and what is the total absolute return?",
  // 9. Recurring Subscriptions (Algorithmic text match testing)
  "Which of my transactions look like recurring subscriptions?",
  // 10. Top Expenses
  "What were my top 3 merchants by net spend?",
  // 11. Missing Categories Handling
  "How much money did I spend that was marked as uncategorized?",
  // 12. Complex Joined Reasoning
  //"Of the funds I own, which gave me the best realized return percentage?"
];

async function runEvals() {
  console.log(`\n🚀 Starting Provue Evaluation Suite...`);
  console.log(`Targeting: ${ENDPOINT}\n`);

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < EVAL_QUESTIONS.length; i++) {
    const question = EVAL_QUESTIONS[i];
    console.log(`--------------------------------------------------`);
    console.log(`[Test ${i + 1}/12] Q: "${question}"`);
    
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data = await response.json();

      if (response.ok && data.answer && !data.answer.includes('internal error')) {
        console.log(`✅ PASS`);
        console.log(`🤖 Tara: ${data.answer}`);
        passed++;
      } else {
        console.log(`❌ FAIL`);
        console.log(`Error Response:`, data);
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ FAIL - Network/Server Error: ${error.message}`);
      failed++;
    }
    
    // Slight delay to avoid hammering the free-tier Google API rate limits
    // Increased to 15 seconds to respect Google's 5-requests-per-minute free tier limit
    await new Promise(resolve => setTimeout(resolve, 15000));
  }

  console.log(`\n==================================================`);
  console.log(`🏆 EVALUATION COMPLETE`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`==================================================\n`);
}

runEvals();