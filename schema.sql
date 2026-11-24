-- =============================================================================
-- CODE CLASH: PRODUCTION DATABASE SCHEMA & ROW LEVEL SECURITY (RLS)
-- Database Engine: Supabase (PostgreSQL 15+)
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 1. ENUMS & DOMAINS
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('student', 'teacher');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE public.room_status AS ENUM ('waiting', 'active', 'finished');
    END IF;
END $$;

-- =============================================================================
-- 2. TABLES CREATION
-- =============================================================================

-- 2.1 Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'student',
    total_wins INTEGER NOT NULL DEFAULT 0 CHECK (total_wins >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 30)
);

-- 2.2 Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    base_code TEXT NOT NULL DEFAULT '',
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.3 Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status public.room_status NOT NULL DEFAULT 'waiting',
    max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players >= 2 AND max_players <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.4 Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2.5 Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    execution_time_ms INTEGER NOT NULL CHECK (execution_time_ms >= 0),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- =============================================================================
-- 3. INDEXES FOR HIGH-THROUGHPUT PERFORMANCE
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON public.questions(created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_matches_room_id ON public.matches(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_match_id ON public.submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON public.submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_question_id ON public.submissions(question_id);

-- =============================================================================
-- 4. UTILITY & AUTOMATION FUNCTIONS / TRIGGERS
-- =============================================================================

-- Automatic updated_at timestamp handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_questions_updated_at ON public.questions;
CREATE TRIGGER set_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_rooms_updated_at ON public.rooms;
CREATE TRIGGER set_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatically provision profile record on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, username, role)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'username',
            'coder_' || SUBSTRING(NEW.id::text, 1, 8)
        ),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'student'::public.user_role)
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Secure helper function to check teacher role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_teacher(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_user_id
          AND role = 'teacher'
    );
END;
$$;

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS across all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 5.1 Profiles Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read profiles"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 5.2 Questions Policies & Column Security
-- -----------------------------------------------------------------------------
-- Authenticated users can read questions
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.questions;
CREATE POLICY "Authenticated users can read questions"
    ON public.questions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only users with the 'teacher' role can insert questions
DROP POLICY IF EXISTS "Teachers can insert questions" ON public.questions;
CREATE POLICY "Teachers can insert questions"
    ON public.questions
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_teacher(auth.uid()));

-- Only users with the 'teacher' role can update questions
DROP POLICY IF EXISTS "Teachers can update questions" ON public.questions;
CREATE POLICY "Teachers can update questions"
    ON public.questions
    FOR UPDATE
    TO authenticated
    USING (public.is_teacher(auth.uid()))
    WITH CHECK (public.is_teacher(auth.uid()));

-- Only users with the 'teacher' role can delete questions
DROP POLICY IF EXISTS "Teachers can delete questions" ON public.questions;
CREATE POLICY "Teachers can delete questions"
    ON public.questions
    FOR DELETE
    TO authenticated
    USING (public.is_teacher(auth.uid()));

-- -----------------------------------------------------------------------------
-- 5.3 Security Hardening for Hidden Test Cases:
-- In Postgres/Supabase, RLS controls row access. To guarantee standard clients
-- cannot directly inspect hidden test_cases, we enforce Column-Level Security (CLS)
-- and expose a safe client view. The backend execution engine / Edge Function
-- accesses test_cases using the SUPABASE_SERVICE_ROLE_KEY (which bypasses RLS/CLS).
-- -----------------------------------------------------------------------------

-- Restrict column SELECT permissions on public.questions for standard clients
REVOKE SELECT ON TABLE public.questions FROM authenticated, anon;
GRANT SELECT (id, created_by, title, problem_statement, base_code, created_at, updated_at)
    ON TABLE public.questions TO authenticated;

-- Expose a safe client-facing view for simple queries: supabase.from('questions_public').select('*')
CREATE OR REPLACE VIEW public.questions_public
WITH (security_invoker = true)
AS
SELECT
    id,
    created_by,
    title,
    problem_statement,
    base_code,
    created_at,
    updated_at
FROM public.questions;

GRANT SELECT ON public.questions_public TO authenticated;

-- Secure RPC function enabling authenticated Teachers to inspect full question details with test cases
CREATE OR REPLACE FUNCTION public.get_question_with_tests(p_question_id UUID)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    title TEXT,
    problem_statement TEXT,
    base_code TEXT,
    test_cases JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_teacher(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied. Teacher role required to view test cases.';
    END IF;

    RETURN QUERY
    SELECT q.id, q.created_by, q.title, q.problem_statement, q.base_code, q.test_cases, q.created_at, q.updated_at
    FROM public.questions q
    WHERE q.id = p_question_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 5.4 Rooms Policies
-- -----------------------------------------------------------------------------
-- Authenticated users can read active rooms (and rooms they host)
DROP POLICY IF EXISTS "Authenticated users can read active rooms" ON public.rooms;
CREATE POLICY "Authenticated users can read active rooms"
    ON public.rooms
    FOR SELECT
    TO authenticated
    USING (status = 'active' OR host_id = auth.uid());

-- Authenticated users can create rooms
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.rooms;
CREATE POLICY "Authenticated users can create rooms"
    ON public.rooms
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own rooms (e.g., change status to active/finished)
DROP POLICY IF EXISTS "Hosts can update own rooms" ON public.rooms;
CREATE POLICY "Hosts can update own rooms"
    ON public.rooms
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);

-- -----------------------------------------------------------------------------
-- 5.5 Matches Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read matches" ON public.matches;
CREATE POLICY "Authenticated users can read matches"
    ON public.matches
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Room hosts can create matches" ON public.matches;
CREATE POLICY "Room hosts can create matches"
    ON public.matches
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.rooms
            WHERE id = room_id AND host_id = auth.uid()
        )
    );

-- -----------------------------------------------------------------------------
-- 5.6 Submissions Policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read submissions" ON public.submissions;
CREATE POLICY "Authenticated users can read submissions"
    ON public.submissions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert submissions" ON public.submissions;
CREATE POLICY "Authenticated users can insert submissions"
    ON public.submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
