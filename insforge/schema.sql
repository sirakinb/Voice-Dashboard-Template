CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_call_id TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  caller_name TEXT,
  caller_phone TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'completed',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  could_ai_answer BOOLEAN NOT NULL DEFAULT FALSE,
  callback_requested BOOLEAN NOT NULL DEFAULT FALSE,
  after_hours BOOLEAN NOT NULL DEFAULT FALSE,
  transcript_preview TEXT,
  call_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT call_events_status_check CHECK (
    status IN ('completed', 'missed', 'voicemail')
  )
);

ALTER TABLE public.call_events
  ALTER COLUMN user_id SET DEFAULT auth.uid();

CREATE INDEX IF NOT EXISTS call_events_user_created_idx
  ON public.call_events (user_id, created_time DESC);

CREATE INDEX IF NOT EXISTS call_events_user_category_idx
  ON public.call_events (user_id, category);

CREATE UNIQUE INDEX IF NOT EXISTS call_events_external_call_id_idx
  ON public.call_events (user_id, external_call_id)
  WHERE external_call_id IS NOT NULL;

DROP TRIGGER IF EXISTS call_events_updated_at ON public.call_events;
CREATE TRIGGER call_events_updated_at
  BEFORE UPDATE ON public.call_events
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS call_events_select_own ON public.call_events;
CREATE POLICY call_events_select_own
  ON public.call_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS call_events_insert_own ON public.call_events;
CREATE POLICY call_events_insert_own
  ON public.call_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS call_events_update_own ON public.call_events;
CREATE POLICY call_events_update_own
  ON public.call_events
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS call_events_delete_own ON public.call_events;
CREATE POLICY call_events_delete_own
  ON public.call_events
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_events TO authenticated;

CREATE OR REPLACE VIEW public.daily_call_metrics
WITH (security_invoker = true) AS
SELECT
  ce.created_time::date AS day_date,
  TRIM(TO_CHAR(ce.created_time AT TIME ZONE 'UTC', 'Dy')) AS day_label,
  COUNT(*)::INT AS total_calls,
  COUNT(*) FILTER (WHERE ce.could_ai_answer)::INT AS ai_calls,
  COUNT(*) FILTER (WHERE ce.callback_requested)::INT AS callbacks
FROM public.call_events ce
WHERE ce.user_id = auth.uid()
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.hourly_call_metrics
WITH (security_invoker = true) AS
SELECT
  DATE_TRUNC('hour', ce.created_time) AS hour_ts,
  TO_CHAR(DATE_TRUNC('hour', ce.created_time AT TIME ZONE 'UTC'), 'HH24:00') AS hour_label,
  COUNT(*)::INT AS total_calls,
  COUNT(*) FILTER (WHERE ce.could_ai_answer)::INT AS ai_calls
FROM public.call_events ce
WHERE ce.user_id = auth.uid()
GROUP BY 1, 2;

GRANT SELECT ON public.daily_call_metrics TO authenticated;
GRANT SELECT ON public.hourly_call_metrics TO authenticated;

CREATE OR REPLACE FUNCTION public.get_available_report_weeks()
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  label TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  WITH weeks AS (
    SELECT DATE_TRUNC('week', created_time AT TIME ZONE 'UTC')::date AS week_start
    FROM public.call_events
    WHERE user_id = auth.uid()
    GROUP BY 1
  )
  SELECT
    weeks.week_start,
    weeks.week_start + 6,
    TO_CHAR(weeks.week_start, 'Mon DD') || ' - ' || TO_CHAR(weeks.week_start + 6, 'Mon DD, YYYY')
  FROM weeks
  ORDER BY weeks.week_start DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_report(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY INVOKER
AS $$
  WITH date_bounds AS (
    SELECT
      p_start_date AS start_date,
      p_end_date AS end_date,
      GREATEST((p_end_date - p_start_date) + 1, 0)::INT AS total_days
  ),
  filtered_calls AS (
    SELECT *
    FROM public.call_events
    WHERE user_id = auth.uid()
      AND created_time >= p_start_date::timestamptz
      AND created_time < (p_end_date + 1)::timestamptz
  ),
  totals AS (
    SELECT
      COUNT(*)::INT AS total_calls,
      COUNT(*) FILTER (WHERE after_hours)::INT AS after_hours_calls
    FROM filtered_calls
  ),
  peak_day AS (
    SELECT
      created_time::date AS peak_date,
      COUNT(*)::INT AS total_calls
    FROM filtered_calls
    GROUP BY 1
    ORDER BY COUNT(*) DESC, peak_date ASC
    LIMIT 1
  ),
  category_breakdown AS (
    SELECT
      COALESCE(category, 'Uncategorized') AS category,
      COUNT(*)::INT AS count,
      COALESCE(
        ROUND((COUNT(*) * 100.0) / NULLIF((SELECT total_calls FROM totals), 0)),
        0
      )::INT AS percentage
    FROM filtered_calls
    GROUP BY 1
    ORDER BY count DESC, category ASC
  ),
  days_in_window AS (
    SELECT GENERATE_SERIES(p_start_date, p_end_date, INTERVAL '1 day')::date AS calendar_day
  ),
  day_breakdown AS (
    SELECT
      EXTRACT(ISODOW FROM diw.calendar_day)::INT AS day_number,
      TRIM(TO_CHAR(diw.calendar_day, 'FMDay')) AS day_name,
      COUNT(fc.id)::INT AS total_calls,
      ROUND(COUNT(fc.id)::NUMERIC / NULLIF(COUNT(*), 0), 1) AS avg_calls
    FROM days_in_window diw
    LEFT JOIN filtered_calls fc
      ON fc.created_time::date = diw.calendar_day
    GROUP BY 1, 2
    ORDER BY 1
  ),
  daily_data AS (
    SELECT
      diw.calendar_day,
      TRIM(TO_CHAR(diw.calendar_day, 'Dy')) AS day_label,
      TRIM(TO_CHAR(diw.calendar_day, 'FMDay')) AS day_name,
      COUNT(fc.id)::INT AS total_calls,
      COUNT(fc.id) FILTER (WHERE fc.could_ai_answer)::INT AS ai_handled
    FROM days_in_window diw
    LEFT JOIN filtered_calls fc
      ON fc.created_time::date = diw.calendar_day
    GROUP BY 1, 2, 3
    ORDER BY 1
  )
  SELECT JSONB_BUILD_OBJECT(
    'periodStart', p_start_date,
    'periodEnd', p_end_date,
    'totalDays', (SELECT total_days FROM date_bounds),
    'totalCalls', COALESCE((SELECT total_calls FROM totals), 0),
    'avgDailyCalls', COALESCE(
      ROUND(
        (SELECT total_calls FROM totals)::NUMERIC /
        NULLIF((SELECT total_days FROM date_bounds), 0),
        1
      ),
      0
    ),
    'afterHoursCalls', COALESCE((SELECT after_hours_calls FROM totals), 0),
    'afterHoursPercentage', COALESCE(
      ROUND(
        ((SELECT after_hours_calls FROM totals) * 100.0) /
        NULLIF((SELECT total_calls FROM totals), 0)
      ),
      0
    )::INT,
    'peakDay', JSONB_BUILD_OBJECT(
      'date', (SELECT peak_date FROM peak_day),
      'calls', COALESCE((SELECT total_calls FROM peak_day), 0)
    ),
    'categoryBreakdown', COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'category', category,
            'count', count,
            'percentage', percentage
          )
          ORDER BY count DESC, category ASC
        )
        FROM category_breakdown
      ),
      '[]'::JSONB
    ),
    'dayOfWeekBreakdown', COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'day', day_name,
            'dayNumber', day_number,
            'total', total_calls,
            'avg', avg_calls
          )
          ORDER BY day_number ASC
        )
        FROM day_breakdown
      ),
      '[]'::JSONB
    ),
    'dailyData', COALESCE(
      (
        SELECT JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'date', calendar_day,
            'dayLabel', day_label,
            'dayName', day_name,
            'totalCalls', total_calls,
            'aiHandled', ai_handled
          )
          ORDER BY calendar_day ASC
        )
        FROM daily_data
      ),
      '[]'::JSONB
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_available_report_weeks() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weekly_report(DATE, DATE) TO authenticated;
