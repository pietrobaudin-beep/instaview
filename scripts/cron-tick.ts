/**
 * Local cron tick — runs due monitoring jobs once, then exits.
 * Handy for local development without Vercel Cron:
 *
 *   npm run cron:tick            # one tick
 *   watch -n 60 npm run cron:tick   # every 60s (macOS: use a loop)
 *
 * Or just hit the HTTP endpoint:
 *   curl -X POST localhost:3000/api/cron -H "Authorization: Bearer $CRON_SECRET"
 */
import { runDueJobs } from "../src/lib/monitoring/runner";

runDueJobs()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
