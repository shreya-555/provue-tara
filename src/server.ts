import express from 'express';
import { taraAgent } from './agent/index.js';
import { AgentLogger } from './utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.post('/ask', async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'Invalid request. "question" string is required.' });
  }

  const trace = AgentLogger.startTrace(question);

  try {
    // Execute the Mastra agent loop synchronously
    const response = await taraAgent.generate(question);

    AgentLogger.endTrace(trace, 'success');

    // Return the exact JSON shape Provue requires
    return res.json({ answer: response.text });

  } catch (error: any) {
    AgentLogger.endTrace(trace, 'failure', error.message);
    
    // Fallback response ensures the API contract doesn't completely break on LLM timeout
    return res.status(500).json({ 
      answer: "I'm sorry, I encountered an internal error while trying to process your financial data.",
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀 Tara Finance Agent is live and listening on http://localhost:${PORT}`);
  console.log(`Testing endpoint: POST http://localhost:${PORT}/ask`);
});