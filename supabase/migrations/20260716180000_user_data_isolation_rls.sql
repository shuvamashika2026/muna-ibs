-- User data isolation: idempotent RLS reinforcement for personal health tables.
-- Review and apply manually in Supabase SQL Editor or via `supabase db push`.
--
-- Ownership columns (confirmed from repo schema):
--   users.id                         (auth user PK — not user_id)
--   meals.user_id                    symptoms.user_id
--   bowel_movements.user_id          water_logs.user_id
--   sleep_logs.user_id               medication_reminders.user_id
--   trigger_foods.user_id            weekly_reports.user_id
--   user_memory.user_id (PK)         experiments.user_id
--   experiment_checkins.user_id      muna_insights.user_id
--   muna_events.user_id
--   profiles.user_id                 (when profiles is a table; view reads users)
--
-- Shared reference tables (NOT personal): food_items, community_knowledge,
-- verified_scientific_guidance
--
-- Preflight: list policies
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'users', 'meals', 'symptoms', 'bowel_movements', 'water_logs', 'sleep_logs',
--     'medication_reminders', 'trigger_foods', 'weekly_reports', 'user_memory',
--     'experiments', 'experiment_checkins', 'muna_insights', 'muna_events', 'profiles'
--   )
-- ORDER BY tablename, policyname;

-- ---------------------------------------------------------------------------
-- users (ownership column: id)
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can manage own profile'
  ) THEN
    CREATE POLICY "Users can manage own profile"
      ON public.users
      FOR ALL
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Personal log tables (ownership column: user_id)
-- ---------------------------------------------------------------------------

ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bowel_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trigger_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'meals',
    'symptoms',
    'bowel_movements',
    'water_logs',
    'sleep_logs',
    'medication_reminders',
    'trigger_foods',
    'weekly_reports'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'Users can manage own ' || tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)',
        'Users can manage own ' || tbl,
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- user_memory (PK user_id — already unique)
-- ---------------------------------------------------------------------------

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_memory' AND policyname = 'Users can manage own memory'
  ) THEN
    CREATE POLICY "Users can manage own memory"
      ON public.user_memory
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- experiments + experiment_checkins
-- ---------------------------------------------------------------------------

ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_checkins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'experiments' AND policyname = 'Users can manage own experiments'
  ) THEN
    CREATE POLICY "Users can manage own experiments"
      ON public.experiments
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'experiment_checkins' AND policyname = 'Users can manage own experiment checkins'
  ) THEN
    CREATE POLICY "Users can manage own experiment checkins"
      ON public.experiment_checkins
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1
          FROM public.experiments e
          WHERE e.id = experiment_id
            AND e.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- muna_insights (server writes; users read own rows only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.muna_insights ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'muna_insights' AND policyname = 'Users can read own insights'
  ) THEN
    CREATE POLICY "Users can read own insights"
      ON public.muna_insights
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- muna_events (server writes; users read own rows only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.muna_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'muna_events' AND policyname = 'Users can read own timeline events'
  ) THEN
    CREATE POLICY "Users can read own timeline events"
      ON public.muna_events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- profiles table (when deployed as table, not view)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  profiles_kind "char";
BEGIN
  SELECT c.relkind
  INTO profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'profiles';

  IF profiles_kind = 'r' THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = 'profiles'
        AND c.contype = 'u'
        AND pg_get_constraintdef(c.oid) ILIKE '%user_id%'
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique_idx
        ON public.profiles (user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can read own profile row'
    ) THEN
      CREATE POLICY "Users can read own profile row"
        ON public.profiles
        FOR SELECT
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can manage own profile row'
    ) THEN
      CREATE POLICY "Users can manage own profile row"
        ON public.profiles
        FOR ALL
        TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    RAISE NOTICE 'Applied profiles TABLE policies on public.profiles';
  ELSIF profiles_kind = 'v' THEN
    RAISE NOTICE 'public.profiles is a VIEW — RLS enforced on underlying public.users';
  ELSE
    RAISE NOTICE 'public.profiles not found — skipped profiles policies';
  END IF;
END $$;

-- Post-check:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' AND tablename IN ('meals', 'symptoms', 'user_memory')
-- ORDER BY 1, 2;
