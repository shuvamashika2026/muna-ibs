import { runCriticalBlockersVerification } from "../src/lib/critical-blockers-verification.ts";

const result = await runCriticalBlockersVerification();
console.log(JSON.stringify(result, null, 2));
process.exit(result.failed > 0 ? 1 : 0);
