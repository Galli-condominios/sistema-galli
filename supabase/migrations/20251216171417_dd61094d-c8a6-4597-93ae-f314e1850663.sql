-- Create helper functions for managing the cron schedule

-- Function to unschedule existing monthly charges job
CREATE OR REPLACE FUNCTION public.unschedule_monthly_charges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM cron.unschedule('process-monthly-charges');
EXCEPTION
  WHEN OTHERS THEN
    -- Job might not exist, ignore error
    NULL;
END;
$$;

-- Function to schedule monthly charges job
CREATE OR REPLACE FUNCTION public.schedule_monthly_charges(
  cron_expression TEXT,
  function_url TEXT,
  auth_token TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- First try to unschedule existing job
  PERFORM public.unschedule_monthly_charges();
  
  -- Schedule new job
  PERFORM cron.schedule(
    'process-monthly-charges',
    cron_expression,
    format(
      'SELECT net.http_post(url := %L, headers := ''{"Content-Type": "application/json", "Authorization": "Bearer %s"}''::jsonb, body := ''{}''::jsonb)',
      function_url,
      auth_token
    )
  );
END;
$$;

-- Function to get current cron schedule
CREATE OR REPLACE FUNCTION public.get_cron_schedule()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job_record RECORD;
  parts TEXT[];
  result jsonb;
BEGIN
  SELECT * INTO job_record 
  FROM cron.job 
  WHERE jobname = 'process-monthly-charges'
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN '{"day": 1, "hour": 2, "minute": 0}'::jsonb;
  END IF;
  
  -- Parse cron expression: minute hour day * *
  parts := string_to_array(job_record.schedule, ' ');
  
  result := jsonb_build_object(
    'minute', COALESCE(parts[1]::int, 0),
    'hour', COALESCE(parts[2]::int, 2),
    'day', COALESCE(parts[3]::int, 1)
  );
  
  RETURN result;
END;
$$;