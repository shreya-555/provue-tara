import { randomUUID } from 'crypto';

export interface RequestTrace {
  requestId: string;
  question: string;
  startTime: number;
  status: 'running' | 'success' | 'failure';
  latencyMs?: number;
  error?: string;
}

export class AgentLogger {
  static startTrace(question: string): RequestTrace {
    const trace: RequestTrace = {
      requestId: randomUUID(),
      question,
      startTime: Date.now(),
      status: 'running',
    };
    console.log(`\n[TRACE START] ID: ${trace.requestId} | Q: "${question}"`);
    return trace;
  }

  static endTrace(trace: RequestTrace, status: 'success' | 'failure', error?: string) {
    trace.status = status;
    trace.latencyMs = Date.now() - trace.startTime;
    trace.error = error;
    
    console.log(`[TRACE END] ID: ${trace.requestId} | Status: ${status.toUpperCase()} | Latency: ${trace.latencyMs}ms`);
    if (error) {
      console.error(`[TRACE ERROR] Reason: ${error}`);
    }
  }
}