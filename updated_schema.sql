-- =============================================================================
-- CODE CLASH: COMPLETE CLEAN RESET & DATABASE MIGRATION
-- Engine: Supabase (PostgreSQL 15+)
-- =============================================================================

-- =============================================================================
-- 1. CLEAN TEARDOWN: WIPE PREVIOUS SCHEMAS & PREVENT CONFLICTS
-- =============================================================================

-- Drop legacy views
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.questions_public CASCADE;

-- Drop all existing tables (CASCADE eliminates all foreign key blockers)
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.matches CASCADE;
DROP TABLE IF EXISTS public.cheat_logs CASCADE;
DROP TABLE IF EXISTS public.room_participants CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing types/enums to ensure fresh creation
DROP TYPE IF EXISTS public.cheat_event_type CASCADE;
DROP TYPE IF EXISTS public.question_difficulty CASCADE;
DROP TYPE IF EXISTS public.room_mode CASCADE;
DROP TYPE IF EXISTS public.room_status CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- 2. ENUMS & TYPES
-- =============================================================================

CREATE TYPE public.user_role AS ENUM ('student', 'teacher');
CREATE TYPE public.room_status AS ENUM ('waiting', 'active', 'finished');
CREATE TYPE public.room_mode AS ENUM ('duel', 'tournament');
CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE public.cheat_event_type AS ENUM (
    'tab_switch',
    'window_blur',
    'fullscreen_exit',
    'devtools_opened'
);

-- =============================================================================
-- 3. TABLES DEFINITION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 Profiles Table (Synced directly with Supabase auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    role public.user_role NOT NULL DEFAULT 'student',
    total_wins INTEGER NOT NULL DEFAULT 0 CHECK (total_wins >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT username_length_check CHECK (char_length(username) >= 3 AND char_length(username) <= 32)
);

-- Convenient view alias so queries to "users" work interchangeably
CREATE OR REPLACE VIEW public.users AS
SELECT id, username, role, total_wins, created_at, updated_at
FROM public.profiles;

-- -----------------------------------------------------------------------------
-- 3.2 Questions Table (Question Library managed by Teachers)
-- -----------------------------------------------------------------------------
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    difficulty public.question_difficulty NOT NULL DEFAULT 'medium',
    base_code TEXT NOT NULL DEFAULT '',
    test_cases JSONB NOT NULL DEFAULT '[]'::jsonb, -- Hidden test cases with inputs & expected outputs
    is_public BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 3.3 Rooms Table (Supports 1v1 Duels and Multi-User Tournaments / Exams)
-- -----------------------------------------------------------------------------
CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code VARCHAR(8) NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
    title TEXT NOT NULL DEFAULT 'Code Clash Arena',
    creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode public.room_mode NOT NULL DEFAULT 'duel',
    status public.room_status NOT NULL DEFAULT 'waiting',
    max_players INTEGER NOT NULL DEFAULT 2 CHECK (max_players >= 2 AND max_players <= 100),
    duration_seconds INTEGER NOT NULL DEFAULT 900 CHECK (duration_seconds >= 60 AND duration_seconds <= 14400),
    selected_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 3.4 Room Participants Table (Tracks all students in a duel or tournament lobby)
-- -----------------------------------------------------------------------------
CREATE TABLE public.room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    has_submitted BOOLEAN NOT NULL DEFAULT FALSE,
    is_disqualified BOOLEAN NOT NULL DEFAULT FALSE,
    score INTEGER NOT NULL DEFAULT 0,
    execution_time_ms INTEGER,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    finished_at TIMESTAMPTZ,
    CONSTRAINT unique_room_participant UNIQUE (room_id, user_id)
);

-- -----------------------------------------------------------------------------
-- 3.5 Cheat Logs Table (Anti-Cheat audit trail: tab switches, window blur, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE public.cheat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type public.cheat_event_type NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- -----------------------------------------------------------------------------
-- 3.6 Submissions Table (Code Evaluation Records)
-- -----------------------------------------------------------------------------
CREATE TABLE public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    execution_time_ms INTEGER NOT NULL DEFAULT 0 CHECK (execution_time_ms >= 0),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- =============================================================================
-- 4. INDEXES FOR HIGH-THROUGHPUT TOURNAMENTS
-- =============================================================================

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_questions_creator ON public.questions(created_by);
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_rooms_code ON public.rooms(room_code);
CREATE INDEX idx_rooms_creator ON public.rooms(creator_id);
CREATE INDEX idx_rooms_status ON public.rooms(status);
CREATE INDEX idx_room_participants_lookup ON public.room_participants(room_id, user_id);
CREATE INDEX idx_room_participants_user ON public.room_participants(user_id);
CREATE INDEX idx_cheat_logs_room_user ON public.cheat_logs(room_id, user_id);
CREATE INDEX idx_cheat_logs_created_at ON public.cheat_logs(created_at DESC);
CREATE INDEX idx_submissions_room_user ON public.submissions(room_id, user_id);

-- =============================================================================
-- 5. TRIGGERS & UTILITY FUNCTIONS
-- =============================================================================

-- Automatic updated_at handler
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-provision public.profiles on auth.users registration
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

-- Non-recursive helper: verify if user is a Teacher
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

-- Non-recursive helper: verify if user is the Room Host
CREATE OR REPLACE FUNCTION public.is_room_host(p_user_id UUID, p_room_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.rooms
        WHERE id = p_room_id
          AND creator_id = p_user_id
    );
END;
$$;

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheat_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 6.1 Profiles Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 6.2 Questions Policies & Test Case Column Security
-- -----------------------------------------------------------------------------
CREATE POLICY "Authenticated users can read questions"
    ON public.questions FOR SELECT
    TO authenticated
    USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Teachers can insert questions"
    ON public.questions FOR INSERT
    TO authenticated
    WITH CHECK (public.is_teacher(auth.uid()));

CREATE POLICY "Teachers can update questions"
    ON public.questions FOR UPDATE
    TO authenticated
    USING (public.is_teacher(auth.uid()))
    WITH CHECK (public.is_teacher(auth.uid()));

CREATE POLICY "Teachers can delete questions"
    ON public.questions FOR DELETE
    TO authenticated
    USING (public.is_teacher(auth.uid()));

-- Protect test_cases from client scraping via PostgREST
REVOKE SELECT ON TABLE public.questions FROM authenticated, anon;
GRANT SELECT (id, created_by, title, problem_statement, difficulty, base_code, is_public, created_at, updated_at)
    ON TABLE public.questions TO authenticated;

-- Public sanitized view for students & battle editors
CREATE OR REPLACE VIEW public.questions_public
WITH (security_invoker = true)
AS
SELECT id, created_by, title, problem_statement, difficulty, base_code, is_public, created_at, updated_at
FROM public.questions;

GRANT SELECT ON public.questions_public TO authenticated;

-- Secure RPC for teachers to view full details with hidden test cases
CREATE OR REPLACE FUNCTION public.get_question_with_tests(p_question_id UUID)
RETURNS TABLE (
    id UUID,
    created_by UUID,
    title TEXT,
    problem_statement TEXT,
    difficulty public.question_difficulty,
    base_code TEXT,
    test_cases JSONB,
    is_public BOOLEAN,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_teacher(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Only teachers may view hidden test cases.';
    END IF;

    RETURN QUERY
    SELECT q.id, q.created_by, q.title, q.problem_statement, q.difficulty, q.base_code, q.test_cases, q.is_public, q.created_at, q.updated_at
    FROM public.questions q
    WHERE q.id = p_question_id;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6.3 Rooms Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read joinable or owned rooms"
    ON public.rooms FOR SELECT
    TO authenticated
    USING (status IN ('waiting', 'active') OR creator_id = auth.uid());

CREATE POLICY "Authenticated users can create rooms"
    ON public.rooms FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Room creators can update their own rooms"
    ON public.rooms FOR UPDATE
    TO authenticated
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- -----------------------------------------------------------------------------
-- 6.4 Room Participants Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Participants can view room roster"
    ON public.room_participants FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.is_room_host(auth.uid(), room_id) OR
        EXISTS (
            SELECT 1 FROM public.room_participants rp
            WHERE rp.room_id = room_participants.room_id
              AND rp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join rooms"
    ON public.room_participants FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Room hosts can update participants"
    ON public.room_participants FOR UPDATE
    TO authenticated
    USING (public.is_room_host(auth.uid(), room_id))
    WITH CHECK (public.is_room_host(auth.uid(), room_id));

-- -----------------------------------------------------------------------------
-- 6.5 Cheat Logs Policies (Anti-Cheat Audit Trail)
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can log their own anti-cheat events"
    ON public.cheat_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers and Hosts can view cheat logs"
    ON public.cheat_logs FOR SELECT
    TO authenticated
    USING (
        public.is_room_host(auth.uid(), room_id) OR
        public.is_teacher(auth.uid())
    );

-- -----------------------------------------------------------------------------
-- 6.6 Submissions Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view submissions for their rooms"
    ON public.submissions FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        public.is_room_host(auth.uid(), room_id)
    );

CREATE POLICY "Users can insert their own submissions"
    ON public.submissions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
