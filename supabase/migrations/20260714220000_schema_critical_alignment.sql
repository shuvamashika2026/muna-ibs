-- Critical schema alignment for closed beta (additive, idempotent).
-- Extends users for profile UI, optionally exposes profiles view for MIE/AI reads,
-- adds food_items reference catalog, and extends symptoms for current inserts.
--
-- ============================================================================
-- PREFLIGHT — run these queries in Supabase SQL Editor BEFORE applying
-- ============================================================================
--
-- 1) Object types (profiles, food_items, symptoms, users)
-- SELECT c.relname AS object_name,
--        CASE c.relkind
--          WHEN 'r' THEN 'table'
--          WHEN 'v' THEN 'view'
--          WHEN 'm' THEN 'materialized view'
--          ELSE c.relkind::text
--        END AS object_type
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relname IN ('profiles', 'food_items', 'symptoms', 'users')
-- ORDER BY c.relname;
--
-- 2) Existing users profile columns
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'users'
--   AND column_name IN (
--     'age', 'date_of_birth', 'gender', 'country', 'ibs_type', 'diagnosis_year',
--     'height_cm', 'weight_kg', 'food_allergies', 'current_medication',
--     'dietary_preference', 'preferred_units', 'sleep_goal', 'emergency_contact'
--   )
-- ORDER BY column_name;
--
-- 3) Existing symptoms columns
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'symptoms'
--   AND column_name IN (
--     'notes', 'pain_level', 'bloating_level', 'gas_level', 'energy_level', 'mood',
--     'severity', 'stress_level'
--   )
-- ORDER BY column_name;
--
-- 4) Existing constraints on users and symptoms
-- SELECT c.conrelid::regclass AS table_name,
--        c.conname AS constraint_name,
--        pg_get_constraintdef(c.oid) AS definition
-- FROM pg_constraint c
-- JOIN pg_class t ON t.oid = c.conrelid
-- JOIN pg_namespace n ON n.oid = t.relnamespace
-- WHERE n.nspname = 'public'
--   AND t.relname IN ('users', 'symptoms', 'food_items')
-- ORDER BY 1, 2;
--
-- 5) Existing RLS policies
-- SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('food_items', 'users', 'symptoms')
-- ORDER BY tablename, policyname;
--
-- 6) Invalid severity/stress values (must return 0 rows before constraint upgrade)
-- SELECT id, severity, stress_level
-- FROM public.symptoms
-- WHERE (severity IS NOT NULL AND (severity < 0 OR severity > 10))
--    OR (stress_level IS NOT NULL AND (stress_level < 0 OR stress_level > 10));
--
-- 7) Invalid level columns (must return 0 rows before adding level checks)
-- SELECT id, pain_level, bloating_level, gas_level, energy_level
-- FROM public.symptoms
-- WHERE (pain_level IS NOT NULL AND (pain_level < 0 OR pain_level > 10))
--    OR (bloating_level IS NOT NULL AND (bloating_level < 0 OR bloating_level > 10))
--    OR (gas_level IS NOT NULL AND (gas_level < 0 OR gas_level > 10))
--    OR (energy_level IS NOT NULL AND (energy_level < 0 OR energy_level > 10));
--
-- ============================================================================
-- POST-APPLY VERIFICATION — run after migration (or after partial rerun)
-- ============================================================================
--
-- SELECT c.relname,
--        CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' ELSE c.relkind::text END AS kind
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relname = 'profiles';
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'users'
--   AND column_name IN ('age', 'ibs_type', 'sleep_goal', 'emergency_contact');
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'symptoms'
--   AND column_name IN ('notes', 'pain_level', 'mood');
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'public.symptoms'::regclass AND contype = 'c'
-- ORDER BY conname;
--
-- SELECT policyname FROM pg_policies
-- WHERE schemaname = 'public' AND tablename = 'food_items';

-- ---------------------------------------------------------------------------
-- users: profile fields written by src/app/profile/page.tsx
-- ---------------------------------------------------------------------------

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ibs_type text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS diagnosis_year integer;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS height_cm numeric(5, 2);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS weight_kg numeric(5, 2);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS food_allergies text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_medication text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS dietary_preference text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_units text DEFAULT 'metric';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS sleep_goal numeric(4, 2);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emergency_contact text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.conname = 'users_age_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_age_check
      CHECK (age IS NULL OR (age >= 0 AND age <= 120));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.conname = 'users_diagnosis_year_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_diagnosis_year_check
      CHECK (diagnosis_year IS NULL OR (diagnosis_year >= 1900 AND diagnosis_year <= 2100));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.conname = 'users_height_cm_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_height_cm_check
      CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 250));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.conname = 'users_weight_kg_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_weight_kg_check
      CHECK (weight_kg IS NULL OR (weight_kg >= 20 AND weight_kg <= 300));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'users'
      AND c.conname = 'users_sleep_goal_check'
  ) THEN
    ALTER TABLE public.users ADD CONSTRAINT users_sleep_goal_check
      CHECK (sleep_goal IS NULL OR (sleep_goal >= 0 AND sleep_goal <= 24));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- profiles: read-only view for MIE/AI when no conflicting object exists
-- Maps users.daily_water_goal (cups) to liter/ml fields expected by engines.
--
-- If public.profiles already exists as a TABLE (common in deployed Supabase):
--   - this migration preserves it and does NOT drop or replace it;
--   - profile UI continues to read/write public.users;
--   - MIE/AI code reads public.profiles directly (see docs/MIGRATION_RUNBOOK.md).
-- If public.profiles is absent: create the view below.
-- If public.profiles is already a view: replace definition safely.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  profiles_kind "char";
BEGIN
  SELECT c.relkind
  INTO profiles_kind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'profiles';

  IF profiles_kind IS NULL THEN
    CREATE VIEW public.profiles
    WITH (security_invoker = true)
    AS
    SELECT
      u.id AS user_id,
      u.full_name,
      u.ibs_type,
      u.ibs_type AS ibs_subtype,
      u.dietary_preference,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 0.25)::numeric(6, 2)
        ELSE NULL
      END AS water_goal_liters,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 250)::integer
        ELSE NULL
      END AS water_goal_ml,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 0.25)::numeric(6, 2)
        ELSE NULL
      END AS daily_water_goal_liters,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 250)::integer
        ELSE NULL
      END AS daily_water_goal_ml,
      u.created_at,
      now() AS updated_at
    FROM public.users u;

    GRANT SELECT ON public.profiles TO authenticated;
    GRANT SELECT ON public.profiles TO service_role;

    RAISE NOTICE 'migration 20260714220000: created public.profiles view from public.users';
  ELSIF profiles_kind = 'v' THEN
    CREATE OR REPLACE VIEW public.profiles
    WITH (security_invoker = true)
    AS
    SELECT
      u.id AS user_id,
      u.full_name,
      u.ibs_type,
      u.ibs_type AS ibs_subtype,
      u.dietary_preference,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 0.25)::numeric(6, 2)
        ELSE NULL
      END AS water_goal_liters,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 250)::integer
        ELSE NULL
      END AS water_goal_ml,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 0.25)::numeric(6, 2)
        ELSE NULL
      END AS daily_water_goal_liters,
      CASE
        WHEN u.daily_water_goal IS NOT NULL AND u.daily_water_goal > 0
          THEN (u.daily_water_goal * 250)::integer
        ELSE NULL
      END AS daily_water_goal_ml,
      u.created_at,
      now() AS updated_at
    FROM public.users u;

    GRANT SELECT ON public.profiles TO authenticated;
    GRANT SELECT ON public.profiles TO service_role;

    RAISE NOTICE 'migration 20260714220000: replaced existing public.profiles view';
  ELSIF profiles_kind = 'r' THEN
    RAISE NOTICE
      'migration 20260714220000: public.profiles is a TABLE — preserved unchanged. '
      'Profile UI writes public.users; MIE/AI reads public.profiles. '
      'Ensure the table exposes user_id and water goal fields expected by src/lib/insights/types.ts.';
  ELSE
    RAISE WARNING
      'migration 20260714220000: public.profiles exists with unexpected relkind %. Skipped.',
      profiles_kind;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- food_items: shared reference catalog (src/lib/food.ts)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.food_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_name text NOT NULL,
  category text,
  fodmap_level text,
  common_triggers text[],
  cuisine text,
  country text,
  aliases text[],
  ingredients_summary text,
  user_verified boolean DEFAULT false,
  ai_confidence numeric(5, 2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS food_name text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS fodmap_level text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS common_triggers text[];
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS cuisine text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS aliases text[];
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS ingredients_summary text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS user_verified boolean DEFAULT false;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS ai_confidence numeric(5, 2);
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.food_items ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS food_items_food_name_idx
  ON public.food_items (food_name);

CREATE INDEX IF NOT EXISTS food_items_fodmap_level_idx
  ON public.food_items (fodmap_level);

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'food_items'
      AND policyname = 'Authenticated users can read food items'
  ) THEN
    CREATE POLICY "Authenticated users can read food items"
      ON public.food_items
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- symptoms: notes + level columns; align severity/stress to UI range 0–10
-- ---------------------------------------------------------------------------

ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS pain_level integer;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS bloating_level integer;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS gas_level integer;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS energy_level integer;
ALTER TABLE public.symptoms ADD COLUMN IF NOT EXISTS mood text;

DO $$
DECLARE
  con record;
  invalid_count integer;
  target_def text := '(severity IS NULL OR (severity >= 0 AND severity <= 10))';
  already_aligned boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND c.conname = 'symptoms_severity_check'
      AND pg_get_constraintdef(c.oid) ILIKE '%>= 0%'
      AND pg_get_constraintdef(c.oid) ILIKE '%<= 10%'
  ) INTO already_aligned;

  IF already_aligned THEN
    RAISE NOTICE 'symptoms_severity_check already allows 0–10';
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO invalid_count
  FROM public.symptoms
  WHERE severity IS NOT NULL
    AND (severity < 0 OR severity > 10);

  IF invalid_count > 0 THEN
    RAISE WARNING
      'Skipping symptoms_severity_check upgrade: % row(s) outside 0–10. Run preflight query #6 and fix data, then rerun.',
      invalid_count;
    RETURN;
  END IF;

  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND a.attname = 'severity'
      AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.symptoms DROP CONSTRAINT %I', con.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND c.conname = 'symptoms_severity_check'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_severity_check CHECK %s',
      target_def
    );
  END IF;
END $$;

DO $$
DECLARE
  con record;
  invalid_count integer;
  target_def text := '(stress_level IS NULL OR (stress_level >= 0 AND stress_level <= 10))';
  already_aligned boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND c.conname = 'symptoms_stress_level_check'
      AND pg_get_constraintdef(c.oid) ILIKE '%>= 0%'
      AND pg_get_constraintdef(c.oid) ILIKE '%<= 10%'
  ) INTO already_aligned;

  IF already_aligned THEN
    RAISE NOTICE 'symptoms_stress_level_check already allows 0–10';
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO invalid_count
  FROM public.symptoms
  WHERE stress_level IS NOT NULL
    AND (stress_level < 0 OR stress_level > 10);

  IF invalid_count > 0 THEN
    RAISE WARNING
      'Skipping symptoms_stress_level_check upgrade: % row(s) outside 0–10. Run preflight query #6 and fix data, then rerun.',
      invalid_count;
    RETURN;
  END IF;

  FOR con IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND a.attname = 'stress_level'
      AND c.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.symptoms DROP CONSTRAINT %I', con.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'symptoms'
      AND c.conname = 'symptoms_stress_level_check'
  ) THEN
    EXECUTE format(
      'ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_stress_level_check CHECK %s',
      target_def
    );
  END IF;
END $$;

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM public.symptoms
  WHERE (pain_level IS NOT NULL AND (pain_level < 0 OR pain_level > 10))
     OR (bloating_level IS NOT NULL AND (bloating_level < 0 OR bloating_level > 10))
     OR (gas_level IS NOT NULL AND (gas_level < 0 OR gas_level > 10))
     OR (energy_level IS NOT NULL AND (energy_level < 0 OR energy_level > 10));

  IF invalid_count > 0 THEN
    RAISE WARNING
      'Skipping level-column check constraints: % row(s) outside 0–10. Run preflight query #7 and fix data, then rerun.',
      invalid_count;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'symptoms' AND c.conname = 'symptoms_pain_level_check'
  ) THEN
    ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_pain_level_check
      CHECK (pain_level IS NULL OR (pain_level >= 0 AND pain_level <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'symptoms' AND c.conname = 'symptoms_bloating_level_check'
  ) THEN
    ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_bloating_level_check
      CHECK (bloating_level IS NULL OR (bloating_level >= 0 AND bloating_level <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'symptoms' AND c.conname = 'symptoms_gas_level_check'
  ) THEN
    ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_gas_level_check
      CHECK (gas_level IS NULL OR (gas_level >= 0 AND gas_level <= 10));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND t.relname = 'symptoms' AND c.conname = 'symptoms_energy_level_check'
  ) THEN
    ALTER TABLE public.symptoms ADD CONSTRAINT symptoms_energy_level_check
      CHECK (energy_level IS NULL OR (energy_level >= 0 AND energy_level <= 10));
  END IF;
END $$;
