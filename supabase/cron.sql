-- Run ONCE in Supabase → SQL Editor after the app is deployed (phase 12).
-- Replace the two placeholders first. Calls the reminder dispatcher every 5 minutes.
--
-- Needs the pg_cron and pg_net extensions:
-- Supabase → Database → Extensions → enable "pg_cron" and "pg_net".

select cron.schedule(
  'berdua-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url     := 'https://YOUR-APP.vercel.app/api/reminders/dispatch',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer YOUR_CRON_SECRET',
                 'Content-Type',  'application/json'),
    body    := '{}'::jsonb
  );
  $$
);

-- Check it's running:   select * from cron.job_run_details order by start_time desc limit 5;
-- Stop it:              select cron.unschedule('berdua-reminders');
