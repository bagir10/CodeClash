-- =============================================================================
-- CODE CLASH: SEED 30 DIVERSE PYTHON QUESTIONS MIGRATION
-- Compatible with Supabase PostgreSQL
-- Topics: Arrays (7), Strings (7), Math (6), Logic (5), Algorithms (5)
-- Total Questions: 30
-- =============================================================================

-- 1. Ensure type and columns exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_difficulty') THEN
        CREATE TYPE public.question_difficulty AS ENUM ('easy', 'medium', 'hard');
    END IF;
END $$;

ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'General';
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS starter_code TEXT;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS visible_tests JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS hidden_tests JSONB DEFAULT '[]'::jsonb;

-- Optional: ensure title is unique for upsert idempotency
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'questions_title_unique'
    ) THEN
        ALTER TABLE public.questions ADD CONSTRAINT questions_title_unique UNIQUE (title);
    END IF;
EXCEPTION
    WHEN duplicate_table OR duplicate_object THEN
        NULL;
END $$;

-- 2. Insert or update the 30 production questions

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'İki Ədədin Cəmi (Two Sum)',
    'Arrays',
    'easy'::public.question_difficulty,
    'Verilmiş tam ədədlər massivində (nums) cəmi hədəf ədədə (target) bərabər olan iki ədədin indekslərini tapın və siyahı kimi qaytarın.

Hər bir test üçün yalnız bir düzgün həllin olduğunu və eyni elementi iki dəfə istifadə edə bilməyəcəyinizi qəbul edin.

Nümunə 1:
Giriş: nums = [2, 7, 11, 15], target = 9
Çıxış: [0, 1]

Nümunə 2:
Giriş: nums = [3, 2, 4], target = 6
Çıxış: [1, 2]',
    'def solution(nums, target):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums, target):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[2, 7, 11, 15], 9","expectedOutput":"[0, 1]"},{"input":"[3, 2, 4], 6","expectedOutput":"[1, 2]"}]'::jsonb,
    '[{"input":"[3, 3], 6","expectedOutput":"[0, 1]"},{"input":"[-1, -2, -3, -4, -5], -8","expectedOutput":"[2, 4]"},{"input":"[0, 4, 3, 0], 0","expectedOutput":"[0, 3]"},{"input":"[1, 5, 8, 12, 19], 20","expectedOutput":"[0, 4]"}]'::jsonb,
    '[{"input":"[2, 7, 11, 15], 9","expectedOutput":"[0, 1]","testNum":1,"isHidden":false},{"input":"[3, 2, 4], 6","expectedOutput":"[1, 2]","testNum":2,"isHidden":false},{"input":"[3, 3], 6","expectedOutput":"[0, 1]","testNum":3,"isHidden":true},{"input":"[-1, -2, -3, -4, -5], -8","expectedOutput":"[2, 4]","testNum":4,"isHidden":true},{"input":"[0, 4, 3, 0], 0","expectedOutput":"[0, 3]","testNum":5,"isHidden":true},{"input":"[1, 5, 8, 12, 19], 20","expectedOutput":"[0, 4]","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Sıfırları Sona Köçür (Move Zeroes)',
    'Arrays',
    'easy'::public.question_difficulty,
    'Verilmiş tam ədədlər massivində (nums) sıfır olmayan elementlərin nisbi ardıcıllığını qorumaqla bütün 0-ları massivin sonuna köçürün və yenilənmiş massivi qaytarın.

Nümunə:
Giriş: [0, 1, 0, 3, 12]
Çıxış: [1, 3, 12, 0, 0]',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[0, 1, 0, 3, 12]","expectedOutput":"[1, 3, 12, 0, 0]"},{"input":"[0]","expectedOutput":"[0]"}]'::jsonb,
    '[{"input":"[1, 2, 3]","expectedOutput":"[1, 2, 3]"},{"input":"[0, 0, 0, 1]","expectedOutput":"[1, 0, 0, 0]"},{"input":"[4, 0, 5, 0, 6, 0]","expectedOutput":"[4, 5, 6, 0, 0, 0]"}]'::jsonb,
    '[{"input":"[0, 1, 0, 3, 12]","expectedOutput":"[1, 3, 12, 0, 0]","testNum":1,"isHidden":false},{"input":"[0]","expectedOutput":"[0]","testNum":2,"isHidden":false},{"input":"[1, 2, 3]","expectedOutput":"[1, 2, 3]","testNum":3,"isHidden":true},{"input":"[0, 0, 0, 1]","expectedOutput":"[1, 0, 0, 0]","testNum":4,"isHidden":true},{"input":"[4, 0, 5, 0, 6, 0]","expectedOutput":"[4, 5, 6, 0, 0, 0]","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Təkrarlanan Elementi Yoxla (Contains Duplicate)',
    'Arrays',
    'easy'::public.question_difficulty,
    'Verilmiş tam ədədlər massivində hər hansı bir ədəd ən azı iki dəfə təkrarlanırsa True, bütün ədədlər unikaldırsa False qaytarın.

Nümunə 1:
Giriş: [1, 2, 3, 1]
Çıxış: True

Nümunə 2:
Giriş: [1, 2, 3, 4]
Çıxış: False',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[1, 2, 3, 1]","expectedOutput":"True"},{"input":"[1, 2, 3, 4]","expectedOutput":"False"}]'::jsonb,
    '[{"input":"[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]","expectedOutput":"True"},{"input":"[]","expectedOutput":"False"},{"input":"[100]","expectedOutput":"False"},{"input":"[-5, -4, -3, -2, -1]","expectedOutput":"False"}]'::jsonb,
    '[{"input":"[1, 2, 3, 1]","expectedOutput":"True","testNum":1,"isHidden":false},{"input":"[1, 2, 3, 4]","expectedOutput":"False","testNum":2,"isHidden":false},{"input":"[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]","expectedOutput":"True","testNum":3,"isHidden":true},{"input":"[]","expectedOutput":"False","testNum":4,"isHidden":true},{"input":"[100]","expectedOutput":"False","testNum":5,"isHidden":true},{"input":"[-5, -4, -3, -2, -1]","expectedOutput":"False","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Maksimum Alt Massiv (Maximum Subarray)',
    'Arrays',
    'medium'::public.question_difficulty,
    'Verilmiş tam ədədlər massivində (nums) ən böyük cəmə malik olan kəsilməz alt massivi tapın və həmin maksimum cəmi qaytarın (Kadane alqoritmi).

Nümunə:
Giriş: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Çıxış: 6  (Çünki [4, -1, 2, 1] alt massivinin cəmi 6-dır)',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[-2, 1, -3, 4, -1, 2, 1, -5, 4]","expectedOutput":"6"},{"input":"[1]","expectedOutput":"1"}]'::jsonb,
    '[{"input":"[5, 4, -1, 7, 8]","expectedOutput":"23"},{"input":"[-5, -2, -8, -1]","expectedOutput":"-1"},{"input":"[-10, 2, 3, -1, 5, -2]","expectedOutput":"9"}]'::jsonb,
    '[{"input":"[-2, 1, -3, 4, -1, 2, 1, -5, 4]","expectedOutput":"6","testNum":1,"isHidden":false},{"input":"[1]","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"[5, 4, -1, 7, 8]","expectedOutput":"23","testNum":3,"isHidden":true},{"input":"[-5, -2, -8, -1]","expectedOutput":"-1","testNum":4,"isHidden":true},{"input":"[-10, 2, 3, -1, 5, -2]","expectedOutput":"9","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Çatışmayan Ədəd (Find Missing Number)',
    'Arrays',
    'medium'::public.question_difficulty,
    '0-dan n-ə qədər olan n sayda müxtəlif ədədi ehtiva edən massiv verilib. Həmin aralıqda çatışmayan tək ədədi tapıb qaytarın.

Nümunə:
Giriş: [3, 0, 1]
Çıxış: 2 (Aralıq 0-3, 2 çatışmır)',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[3, 0, 1]","expectedOutput":"2"},{"input":"[0, 1]","expectedOutput":"2"}]'::jsonb,
    '[{"input":"[9, 6, 4, 2, 3, 5, 7, 0, 1]","expectedOutput":"8"},{"input":"[0]","expectedOutput":"1"},{"input":"[1]","expectedOutput":"0"},{"input":"[0, 2, 3, 4, 5]","expectedOutput":"1"}]'::jsonb,
    '[{"input":"[3, 0, 1]","expectedOutput":"2","testNum":1,"isHidden":false},{"input":"[0, 1]","expectedOutput":"2","testNum":2,"isHidden":false},{"input":"[9, 6, 4, 2, 3, 5, 7, 0, 1]","expectedOutput":"8","testNum":3,"isHidden":true},{"input":"[0]","expectedOutput":"1","testNum":4,"isHidden":true},{"input":"[1]","expectedOutput":"0","testNum":5,"isHidden":true},{"input":"[0, 2, 3, 4, 5]","expectedOutput":"1","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Səhmlərin Alışı və Satışı (Best Time to Buy and Sell Stock)',
    'Arrays',
    'medium'::public.question_difficulty,
    'Hər bir elementin müəyyən bir gündəki səhm qiymətini göstərdiyi prices massivi verilib. Bir gün səhmi alıb gələcək başqa bir gündə satmaqla əldə edə biləcəyiniz maksimum qazancı hesablayın. Heç bir qazanc mümkün deyilsə, 0 qaytarın.

Nümunə:
Giriş: [7, 1, 5, 3, 6, 4]
Çıxış: 5 (2-ci gün 1-ə alıb 5-ci gün 6-ya satmaqla 6-1=5 qazanc)',
    'def solution(prices):
    # Kodunuzu bura yazın
    pass
',
    'def solution(prices):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[7, 1, 5, 3, 6, 4]","expectedOutput":"5"},{"input":"[7, 6, 4, 3, 1]","expectedOutput":"0"}]'::jsonb,
    '[{"input":"[1, 2]","expectedOutput":"1"},{"input":"[2, 4, 1]","expectedOutput":"2"},{"input":"[3, 3, 3, 3]","expectedOutput":"0"},{"input":"[2, 1, 2, 0, 1]","expectedOutput":"1"}]'::jsonb,
    '[{"input":"[7, 1, 5, 3, 6, 4]","expectedOutput":"5","testNum":1,"isHidden":false},{"input":"[7, 6, 4, 3, 1]","expectedOutput":"0","testNum":2,"isHidden":false},{"input":"[1, 2]","expectedOutput":"1","testNum":3,"isHidden":true},{"input":"[2, 4, 1]","expectedOutput":"2","testNum":4,"isHidden":true},{"input":"[3, 3, 3, 3]","expectedOutput":"0","testNum":5,"isHidden":true},{"input":"[2, 1, 2, 0, 1]","expectedOutput":"1","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'İki Sıralanmış Massivin Birləşdirilməsi və Medianı (Median of Sorted Arrays)',
    'Arrays',
    'hard'::public.question_difficulty,
    'İki sıralanmış tam ədədlər massivi (nums1 və nums2) verilib. Bu iki massivi birləşdirdikdən sonra yaranan bütöv massivin medianını float və ya int formatında qaytarın.

Nümunə 1:
Giriş: [1, 3], [2]
Çıxış: 2.0

Nümunə 2:
Giriş: [1, 2], [3, 4]
Çıxış: 2.5 (Ortadakı 2 və 3-ün ədədi ortası)',
    'def solution(nums1, nums2):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums1, nums2):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[1, 3], [2]","expectedOutput":"2.0"},{"input":"[1, 2], [3, 4]","expectedOutput":"2.5"}]'::jsonb,
    '[{"input":"[0, 0], [0, 0]","expectedOutput":"0.0"},{"input":"[], [1]","expectedOutput":"1.0"},{"input":"[2], []","expectedOutput":"2.0"},{"input":"[1, 5, 9], [2, 6, 10]","expectedOutput":"5.5"}]'::jsonb,
    '[{"input":"[1, 3], [2]","expectedOutput":"2.0","testNum":1,"isHidden":false},{"input":"[1, 2], [3, 4]","expectedOutput":"2.5","testNum":2,"isHidden":false},{"input":"[0, 0], [0, 0]","expectedOutput":"0.0","testNum":3,"isHidden":true},{"input":"[], [1]","expectedOutput":"1.0","testNum":4,"isHidden":true},{"input":"[2], []","expectedOutput":"2.0","testNum":5,"isHidden":true},{"input":"[1, 5, 9], [2, 6, 10]","expectedOutput":"5.5","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Polindrom Yoxlanışı (Valid Palindrome)',
    'Strings',
    'easy'::public.question_difficulty,
    'Verilmiş mətndə (s) yalnız hərf və rəqəmləri nəzərə alaraq (böyük-kiçik hərf fərqini qoymadan) onun polindrom olub-olmadığını yoxlayın. Polindrom hər iki istiqamətdə eyni oxunan söz və ya cümlədir.

Nümunə:
Giriş: "A man, a plan, a canal: Panama"
Çıxış: True',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"A man, a plan, a canal: Panama\"","expectedOutput":"True"},{"input":"\"race a car\"","expectedOutput":"False"}]'::jsonb,
    '[{"input":"\" \"","expectedOutput":"True"},{"input":"\"0P\"","expectedOutput":"False"},{"input":"\"radar\"","expectedOutput":"True"},{"input":"\"No lemon, no melon\"","expectedOutput":"True"}]'::jsonb,
    '[{"input":"\"A man, a plan, a canal: Panama\"","expectedOutput":"True","testNum":1,"isHidden":false},{"input":"\"race a car\"","expectedOutput":"False","testNum":2,"isHidden":false},{"input":"\" \"","expectedOutput":"True","testNum":3,"isHidden":true},{"input":"\"0P\"","expectedOutput":"False","testNum":4,"isHidden":true},{"input":"\"radar\"","expectedOutput":"True","testNum":5,"isHidden":true},{"input":"\"No lemon, no melon\"","expectedOutput":"True","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Anaqram Yoxlanışı (Valid Anagram)',
    'Strings',
    'easy'::public.question_difficulty,
    'İki verilmiş sətir (s və t) verilib. Əgər t sətri s-in hərflərinin eyni sayda yerini dəyişdirməklə yaradılıbsa (anaqramdırsa) True, əks halda False qaytarın.

Nümunə 1:
Giriş: "anagram", "nagaram"
Çıxış: True

Nümunə 2:
Giriş: "rat", "car"
Çıxış: False',
    'def solution(s, t):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s, t):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"anagram\", \"nagaram\"","expectedOutput":"True"},{"input":"\"rat\", \"car\"","expectedOutput":"False"}]'::jsonb,
    '[{"input":"\"listen\", \"silent\"","expectedOutput":"True"},{"input":"\"a\", \"ab\"","expectedOutput":"False"},{"input":"\"hello\", \"world\"","expectedOutput":"False"},{"input":"\"abcc\", \"bcac\"","expectedOutput":"True"}]'::jsonb,
    '[{"input":"\"anagram\", \"nagaram\"","expectedOutput":"True","testNum":1,"isHidden":false},{"input":"\"rat\", \"car\"","expectedOutput":"False","testNum":2,"isHidden":false},{"input":"\"listen\", \"silent\"","expectedOutput":"True","testNum":3,"isHidden":true},{"input":"\"a\", \"ab\"","expectedOutput":"False","testNum":4,"isHidden":true},{"input":"\"hello\", \"world\"","expectedOutput":"False","testNum":5,"isHidden":true},{"input":"\"abcc\", \"bcac\"","expectedOutput":"True","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Ən Uzun Ümumi Prefiks (Longest Common Prefix)',
    'Strings',
    'easy'::public.question_difficulty,
    'Mətnlər massivində (strs) bütün sözlər üçün ən uzun ortaq başlanğıc prefiksini tapın. Ortaq prefiks yoxdursa, boş sətir "" qaytarın.

Nümunə:
Giriş: ["flower", "flow", "flight"]
Çıxış: "fl"',
    'def solution(strs):
    # Kodunuzu bura yazın
    pass
',
    'def solution(strs):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[\"flower\", \"flow\", \"flight\"]","expectedOutput":"\"fl\""},{"input":"[\"dog\", \"racecar\", \"car\"]","expectedOutput":"\"\""}]'::jsonb,
    '[{"input":"[\"interspecies\", \"interstellar\", \"interstate\"]","expectedOutput":"\"inters\""},{"input":"[\"throne\", \"throne\"]","expectedOutput":"\"throne\""},{"input":"[\"a\"]","expectedOutput":"\"a\""}]'::jsonb,
    '[{"input":"[\"flower\", \"flow\", \"flight\"]","expectedOutput":"\"fl\"","testNum":1,"isHidden":false},{"input":"[\"dog\", \"racecar\", \"car\"]","expectedOutput":"\"\"","testNum":2,"isHidden":false},{"input":"[\"interspecies\", \"interstellar\", \"interstate\"]","expectedOutput":"\"inters\"","testNum":3,"isHidden":true},{"input":"[\"throne\", \"throne\"]","expectedOutput":"\"throne\"","testNum":4,"isHidden":true},{"input":"[\"a\"]","expectedOutput":"\"a\"","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Sözlərin Tərsinə Düzülüşü (Reverse Words in a String)',
    'Strings',
    'medium'::public.question_difficulty,
    'Verilmiş mətndəki sözlərin sırasını tərsinə çevirərək tək boşluqla birləşdirin. Artıq boşluqları kənarlaşdırın.

Nümunə:
Giriş: "  the sky is   blue  "
Çıxış: "blue is sky the"',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"  the sky is   blue  \"","expectedOutput":"\"blue is sky the\""},{"input":"\"hello world\"","expectedOutput":"\"world hello\""}]'::jsonb,
    '[{"input":"\"a good   example\"","expectedOutput":"\"example good a\""},{"input":"\"Bob\"","expectedOutput":"\"Bob\""},{"input":"\"   one   two   three   \"","expectedOutput":"\"three two one\""}]'::jsonb,
    '[{"input":"\"  the sky is   blue  \"","expectedOutput":"\"blue is sky the\"","testNum":1,"isHidden":false},{"input":"\"hello world\"","expectedOutput":"\"world hello\"","testNum":2,"isHidden":false},{"input":"\"a good   example\"","expectedOutput":"\"example good a\"","testNum":3,"isHidden":true},{"input":"\"Bob\"","expectedOutput":"\"Bob\"","testNum":4,"isHidden":true},{"input":"\"   one   two   three   \"","expectedOutput":"\"three two one\"","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Mətni Sıxlaşdır (Run-Length Compression)',
    'Strings',
    'medium'::public.question_difficulty,
    'Verilmiş simvollar sətirində təkrar olunan simvolları onların sayı ilə əvəzləyərək sıxlaşdırın. Məsələn, "aabcccccaaa" -> "a2b1c5a3". Əgər sıxlaşdırılmış sətir orijinaldan qısa deyilsə, orijinal mətni qaytarın.

Nümunə:
Giriş: "aabcccccaaa"
Çıxış: "a2b1c5a3"',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"aabcccccaaa\"","expectedOutput":"\"a2b1c5a3\""},{"input":"\"abc\"","expectedOutput":"\"abc\""}]'::jsonb,
    '[{"input":"\"aaaaaaaaaa\"","expectedOutput":"\"a10\""},{"input":"\"aabbcc\"","expectedOutput":"\"aabbcc\""},{"input":"\"wwwwaaadexxxxxx\"","expectedOutput":"\"w4a3d1e1x6\""}]'::jsonb,
    '[{"input":"\"aabcccccaaa\"","expectedOutput":"\"a2b1c5a3\"","testNum":1,"isHidden":false},{"input":"\"abc\"","expectedOutput":"\"abc\"","testNum":2,"isHidden":false},{"input":"\"aaaaaaaaaa\"","expectedOutput":"\"a10\"","testNum":3,"isHidden":true},{"input":"\"aabbcc\"","expectedOutput":"\"aabbcc\"","testNum":4,"isHidden":true},{"input":"\"wwwwaaadexxxxxx\"","expectedOutput":"\"w4a3d1e1x6\"","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'İlk Unikal Simvol (First Unique Character)',
    'Strings',
    'medium'::public.question_difficulty,
    'Verilmiş sətirdə ilk təkrarlanmayan simvolun indeksini tapın. Əgər belə simvol yoxdursa, -1 qaytarın.

Nümunə 1:
Giriş: "leetcode"
Çıxış: 0

Nümunə 2:
Giriş: "loveleetcode"
Çıxış: 2 (''v'' simvolu)',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"leetcode\"","expectedOutput":"0"},{"input":"\"loveleetcode\"","expectedOutput":"2"}]'::jsonb,
    '[{"input":"\"aabb\"","expectedOutput":"-1"},{"input":"\"z\"","expectedOutput":"0"},{"input":"\"aadadaad\"","expectedOutput":"-1"}]'::jsonb,
    '[{"input":"\"leetcode\"","expectedOutput":"0","testNum":1,"isHidden":false},{"input":"\"loveleetcode\"","expectedOutput":"2","testNum":2,"isHidden":false},{"input":"\"aabb\"","expectedOutput":"-1","testNum":3,"isHidden":true},{"input":"\"z\"","expectedOutput":"0","testNum":4,"isHidden":true},{"input":"\"aadadaad\"","expectedOutput":"-1","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Ən Uzun Təkrarsız Alt Sətir (Longest Substring Without Repeats)',
    'Strings',
    'hard'::public.question_difficulty,
    'Verilmiş mətndə heç bir simvolu təkrarlanmayan ən uzun alt sətrin uzunluğunu tapın.

Nümunə 1:
Giriş: "abcabcbb"
Çıxış: 3 ("abc" uzunluğu 3-dür)

Nümunə 2:
Giriş: "bbbbb"
Çıxış: 1 ("b")',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"abcabcbb\"","expectedOutput":"3"},{"input":"\"bbbbb\"","expectedOutput":"1"}]'::jsonb,
    '[{"input":"\"pwwkew\"","expectedOutput":"3"},{"input":"\"\"","expectedOutput":"0"},{"input":"\"dvdf\"","expectedOutput":"3"},{"input":"\"anviaj\"","expectedOutput":"5"}]'::jsonb,
    '[{"input":"\"abcabcbb\"","expectedOutput":"3","testNum":1,"isHidden":false},{"input":"\"bbbbb\"","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"\"pwwkew\"","expectedOutput":"3","testNum":3,"isHidden":true},{"input":"\"\"","expectedOutput":"0","testNum":4,"isHidden":true},{"input":"\"dvdf\"","expectedOutput":"3","testNum":5,"isHidden":true},{"input":"\"anviaj\"","expectedOutput":"5","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Faktorialın Hesablanması (Factorial)',
    'Math',
    'easy'::public.question_difficulty,
    'Verilmiş mənfi olmayan tam ədədin (n) faktorialını (n!) hesablayın. 0! = 1 qəbul edilir.

Nümunə:
Giriş: 5
Çıxış: 120 (5 * 4 * 3 * 2 * 1)',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"5","expectedOutput":"120"},{"input":"3","expectedOutput":"6"}]'::jsonb,
    '[{"input":"0","expectedOutput":"1"},{"input":"1","expectedOutput":"1"},{"input":"6","expectedOutput":"720"},{"input":"10","expectedOutput":"3628800"}]'::jsonb,
    '[{"input":"5","expectedOutput":"120","testNum":1,"isHidden":false},{"input":"3","expectedOutput":"6","testNum":2,"isHidden":false},{"input":"0","expectedOutput":"1","testNum":3,"isHidden":true},{"input":"1","expectedOutput":"1","testNum":4,"isHidden":true},{"input":"6","expectedOutput":"720","testNum":5,"isHidden":true},{"input":"10","expectedOutput":"3628800","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Ədədin Rəqəmləri Cəmi (Sum of Digits)',
    'Math',
    'easy'::public.question_difficulty,
    'Verilmiş mənfi olmayan tam ədədin (n) bütün rəqəmlərinin cəmini tapın.

Nümunə:
Giriş: 12345
Çıxış: 15 (1 + 2 + 3 + 4 + 5)',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"12345","expectedOutput":"15"},{"input":"0","expectedOutput":"0"}]'::jsonb,
    '[{"input":"999","expectedOutput":"27"},{"input":"10002","expectedOutput":"3"},{"input":"7","expectedOutput":"7"}]'::jsonb,
    '[{"input":"12345","expectedOutput":"15","testNum":1,"isHidden":false},{"input":"0","expectedOutput":"0","testNum":2,"isHidden":false},{"input":"999","expectedOutput":"27","testNum":3,"isHidden":true},{"input":"10002","expectedOutput":"3","testNum":4,"isHidden":true},{"input":"7","expectedOutput":"7","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Sadə Ədəd Yoxlanışı (Is Prime Number)',
    'Math',
    'easy'::public.question_difficulty,
    'Verilmiş müsbət tam ədədin (n) sadə ədəd olub-olmadığını yoxlayın. Sadə ədəd yalnız 1-ə və özünə qalıqsız bölünən 1-dən böyük ədəddir.

Nümunə 1:
Giriş: 7
Çıxış: True

Nümunə 2:
Giriş: 4
Çıxış: False',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"7","expectedOutput":"True"},{"input":"4","expectedOutput":"False"}]'::jsonb,
    '[{"input":"1","expectedOutput":"False"},{"input":"2","expectedOutput":"True"},{"input":"97","expectedOutput":"True"},{"input":"100","expectedOutput":"False"}]'::jsonb,
    '[{"input":"7","expectedOutput":"True","testNum":1,"isHidden":false},{"input":"4","expectedOutput":"False","testNum":2,"isHidden":false},{"input":"1","expectedOutput":"False","testNum":3,"isHidden":true},{"input":"2","expectedOutput":"True","testNum":4,"isHidden":true},{"input":"97","expectedOutput":"True","testNum":5,"isHidden":true},{"input":"100","expectedOutput":"False","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Fibonaççi Ədədi (Fibonacci Number)',
    'Math',
    'medium'::public.question_difficulty,
    'F(0) = 0, F(1) = 1 və hər növbəti ədəd özündən əvvəlki iki ədədin cəmidir: F(n) = F(n-1) + F(n-2).
Verilmiş n ədədi üçün n-ci Fibonaççi ədədini hesablayın.

Nümunə:
Giriş: 6
Çıxış: 8 (0, 1, 1, 2, 3, 5, 8)',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"6","expectedOutput":"8"},{"input":"2","expectedOutput":"1"}]'::jsonb,
    '[{"input":"0","expectedOutput":"0"},{"input":"1","expectedOutput":"1"},{"input":"10","expectedOutput":"55"},{"input":"20","expectedOutput":"6765"}]'::jsonb,
    '[{"input":"6","expectedOutput":"8","testNum":1,"isHidden":false},{"input":"2","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"0","expectedOutput":"0","testNum":3,"isHidden":true},{"input":"1","expectedOutput":"1","testNum":4,"isHidden":true},{"input":"10","expectedOutput":"55","testNum":5,"isHidden":true},{"input":"20","expectedOutput":"6765","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Ən Böyük Ortaq Bölən (Greatest Common Divisor)',
    'Math',
    'medium'::public.question_difficulty,
    'Evklid alqoritmindən istifadə edərək verilmiş iki müsbət tam ədədin (a və b) Ən Böyük Ortaq Bölənini (ƏBOB / GCD) tapın.

Nümunə:
Giriş: 48, 18
Çıxış: 6',
    'def solution(a, b):
    # Kodunuzu bura yazın
    pass
',
    'def solution(a, b):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"48, 18","expectedOutput":"6"},{"input":"20, 8","expectedOutput":"4"}]'::jsonb,
    '[{"input":"101, 103","expectedOutput":"1"},{"input":"100, 100","expectedOutput":"100"},{"input":"7, 49","expectedOutput":"7"},{"input":"270, 192","expectedOutput":"6"}]'::jsonb,
    '[{"input":"48, 18","expectedOutput":"6","testNum":1,"isHidden":false},{"input":"20, 8","expectedOutput":"4","testNum":2,"isHidden":false},{"input":"101, 103","expectedOutput":"1","testNum":3,"isHidden":true},{"input":"100, 100","expectedOutput":"100","testNum":4,"isHidden":true},{"input":"7, 49","expectedOutput":"7","testNum":5,"isHidden":true},{"input":"270, 192","expectedOutput":"6","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Roma Rəqəmlərindən Tam Ədədə (Roman to Integer)',
    'Math',
    'hard'::public.question_difficulty,
    'Roma rəqəmləri sətirini (s) tam ədədə çevirin.
I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000.
Kiçik rəqəm böyükdən əvvəl gələrsə çıxılır (məsələn IV = 4, IX = 9, XL = 40, XC = 90).

Nümunə:
Giriş: "MCMXCIV"
Çıxış: 1994 (M=1000 + CM=900 + XC=90 + IV=4)',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"MCMXCIV\"","expectedOutput":"1994"},{"input":"\"LVIII\"","expectedOutput":"58"}]'::jsonb,
    '[{"input":"\"III\"","expectedOutput":"3"},{"input":"\"IV\"","expectedOutput":"4"},{"input":"\"IX\"","expectedOutput":"9"},{"input":"\"XL\"","expectedOutput":"40"}]'::jsonb,
    '[{"input":"\"MCMXCIV\"","expectedOutput":"1994","testNum":1,"isHidden":false},{"input":"\"LVIII\"","expectedOutput":"58","testNum":2,"isHidden":false},{"input":"\"III\"","expectedOutput":"3","testNum":3,"isHidden":true},{"input":"\"IV\"","expectedOutput":"4","testNum":4,"isHidden":true},{"input":"\"IX\"","expectedOutput":"9","testNum":5,"isHidden":true},{"input":"\"XL\"","expectedOutput":"40","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'FizzBuzz',
    'Logic',
    'easy'::public.question_difficulty,
    '1-dən n-ə qədər ədədlərin siyahısını aşağıdakı qaydada quran funksiya yazın:
- 3-ə bölünən ədədlər üçün "Fizz"
- 5-ə bölünən ədədlər üçün "Buzz"
- Həm 3-ə, həm 5-ə bölünən ədədlər üçün "FizzBuzz"
- Digər hallarda ədədin özünün string forması.

Nümunə:
Giriş: 5
Çıxış: ["1", "2", "Fizz", "4", "Buzz"]',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"5","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\"]"},{"input":"3","expectedOutput":"[\"1\", \"2\", \"Fizz\"]"}]'::jsonb,
    '[{"input":"1","expectedOutput":"[\"1\"]"},{"input":"15","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\", \"Fizz\", \"7\", \"8\", \"Fizz\", \"Buzz\", \"11\", \"Fizz\", \"13\", \"14\", \"FizzBuzz\"]"},{"input":"6","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\", \"Fizz\"]"}]'::jsonb,
    '[{"input":"5","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\"]","testNum":1,"isHidden":false},{"input":"3","expectedOutput":"[\"1\", \"2\", \"Fizz\"]","testNum":2,"isHidden":false},{"input":"1","expectedOutput":"[\"1\"]","testNum":3,"isHidden":true},{"input":"15","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\", \"Fizz\", \"7\", \"8\", \"Fizz\", \"Buzz\", \"11\", \"Fizz\", \"13\", \"14\", \"FizzBuzz\"]","testNum":4,"isHidden":true},{"input":"6","expectedOutput":"[\"1\", \"2\", \"Fizz\", \"4\", \"Buzz\", \"Fizz\"]","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Yalnız Bir Dəfə İştirak Edən Ədəd (Single Number)',
    'Logic',
    'easy'::public.question_difficulty,
    'Boş olmayan tam ədədlər massivində hər bir element iki dəfə, yalnız biri isə bircə dəfə iştirak edir. Həmin tək elementi tapın və qaytarın.

Nümunə:
Giriş: [4, 1, 2, 1, 2]
Çıxış: 4',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[4, 1, 2, 1, 2]","expectedOutput":"4"},{"input":"[2, 2, 1]","expectedOutput":"1"}]'::jsonb,
    '[{"input":"[1]","expectedOutput":"1"},{"input":"[-1, -1, -2]","expectedOutput":"-2"},{"input":"[10, 20, 30, 20, 10]","expectedOutput":"30"}]'::jsonb,
    '[{"input":"[4, 1, 2, 1, 2]","expectedOutput":"4","testNum":1,"isHidden":false},{"input":"[2, 2, 1]","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"[1]","expectedOutput":"1","testNum":3,"isHidden":true},{"input":"[-1, -1, -2]","expectedOutput":"-2","testNum":4,"isHidden":true},{"input":"[10, 20, 30, 20, 10]","expectedOutput":"30","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Artıq İl Yoxlanışı (Leap Year Checker)',
    'Logic',
    'easy'::public.question_difficulty,
    'Verilmiş ilin (year) təqvimə görə artıq il (uzun il - 366 gün) olub-olmadığını müəyyən edin:
- İl 400-ə bölünürsə, artıq ildir.
- Əks halda 100-ə bölünürsə, adi ildir.
- Əks halda 4-ə bölünürsə, artıq ildir.
- Digər hallarda adi ildir.

Nümunə 1:
Giriş: 2000 -> Çıxış: True
Nümunə 2:
Giriş: 1900 -> Çıxış: False',
    'def solution(year):
    # Kodunuzu bura yazın
    pass
',
    'def solution(year):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"2000","expectedOutput":"True"},{"input":"1900","expectedOutput":"False"}]'::jsonb,
    '[{"input":"2024","expectedOutput":"True"},{"input":"2023","expectedOutput":"False"},{"input":"2400","expectedOutput":"True"},{"input":"1800","expectedOutput":"False"}]'::jsonb,
    '[{"input":"2000","expectedOutput":"True","testNum":1,"isHidden":false},{"input":"1900","expectedOutput":"False","testNum":2,"isHidden":false},{"input":"2024","expectedOutput":"True","testNum":3,"isHidden":true},{"input":"2023","expectedOutput":"False","testNum":4,"isHidden":true},{"input":"2400","expectedOutput":"True","testNum":5,"isHidden":true},{"input":"1800","expectedOutput":"False","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Bitlərdə Bir-lərin Sayı (Hamming Weight)',
    'Logic',
    'medium'::public.question_difficulty,
    'Müsbət tam ədədin (n) ikilik say sistemindəki təsvirində yer alan ''1'' bitlərinin sayını (Hamming çəkisi) hesablayın.

Nümunə:
Giriş: 11 (İkilik təsviri: 1011)
Çıxış: 3',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    'def solution(n):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"11","expectedOutput":"3"},{"input":"128","expectedOutput":"1"}]'::jsonb,
    '[{"input":"0","expectedOutput":"0"},{"input":"15","expectedOutput":"4"},{"input":"2147483645","expectedOutput":"30"}]'::jsonb,
    '[{"input":"11","expectedOutput":"3","testNum":1,"isHidden":false},{"input":"128","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"0","expectedOutput":"0","testNum":3,"isHidden":true},{"input":"15","expectedOutput":"4","testNum":4,"isHidden":true},{"input":"2147483645","expectedOutput":"30","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Suda Tutan Ən Böyük Konteyner (Container With Most Water)',
    'Logic',
    'hard'::public.question_difficulty,
    'Qeyri-mənfi tam ədədlərdən ibarət height massivi verilib. Koordinat sistemində hər bir element xətt hündürlüyünü təmsil edir. İki xətt və x oxu arasında ən çox su tuta bilən sahəni hesablayın.

Nümunə:
Giriş: [1, 8, 6, 2, 5, 4, 8, 3, 7]
Çıxış: 49 (İndeks 1 (hündürlük 8) və indeks 8 (hündürlük 7) arasında: min(8, 7) * (8 - 1) = 49)',
    'def solution(height):
    # Kodunuzu bura yazın
    pass
',
    'def solution(height):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[1, 8, 6, 2, 5, 4, 8, 3, 7]","expectedOutput":"49"},{"input":"[1, 1]","expectedOutput":"1"}]'::jsonb,
    '[{"input":"[4, 3, 2, 1, 4]","expectedOutput":"16"},{"input":"[1, 2, 1]","expectedOutput":"2"},{"input":"[2, 3, 4, 5, 18, 17, 6]","expectedOutput":"17"}]'::jsonb,
    '[{"input":"[1, 8, 6, 2, 5, 4, 8, 3, 7]","expectedOutput":"49","testNum":1,"isHidden":false},{"input":"[1, 1]","expectedOutput":"1","testNum":2,"isHidden":false},{"input":"[4, 3, 2, 1, 4]","expectedOutput":"16","testNum":3,"isHidden":true},{"input":"[1, 2, 1]","expectedOutput":"2","testNum":4,"isHidden":true},{"input":"[2, 3, 4, 5, 18, 17, 6]","expectedOutput":"17","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'İkili Axtarış (Binary Search)',
    'Algorithms',
    'easy'::public.question_difficulty,
    'Artan sıra ilə nizamlanmış tam ədədlər massivində (nums) hədəf ədədi (target) O(log n) zamanda axtarın. Tapılarsa indeksini, tapılmazsa -1 qaytarın.

Nümunə:
Giriş: nums = [-1, 0, 3, 5, 9, 12], target = 9
Çıxış: 4',
    'def solution(nums, target):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums, target):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[-1, 0, 3, 5, 9, 12], 9","expectedOutput":"4"},{"input":"[-1, 0, 3, 5, 9, 12], 2","expectedOutput":"-1"}]'::jsonb,
    '[{"input":"[5], 5","expectedOutput":"0"},{"input":"[5], -5","expectedOutput":"-1"},{"input":"[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10","expectedOutput":"9"},{"input":"[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1","expectedOutput":"0"}]'::jsonb,
    '[{"input":"[-1, 0, 3, 5, 9, 12], 9","expectedOutput":"4","testNum":1,"isHidden":false},{"input":"[-1, 0, 3, 5, 9, 12], 2","expectedOutput":"-1","testNum":2,"isHidden":false},{"input":"[5], 5","expectedOutput":"0","testNum":3,"isHidden":true},{"input":"[5], -5","expectedOutput":"-1","testNum":4,"isHidden":true},{"input":"[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10","expectedOutput":"9","testNum":5,"isHidden":true},{"input":"[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1","expectedOutput":"0","testNum":6,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Massivdə Çoxluq Təşkil Edən Element (Majority Element)',
    'Algorithms',
    'easy'::public.question_difficulty,
    'n ölçülü massivdə n // 2 dəfədən çox təkrar olunan əsas (majority) elementi tapın. Belə elementin həmişə mövcud olduğunu qəbul edin (Boyer-Moore Voting alqoritmi).

Nümunə:
Giriş: [2, 2, 1, 1, 1, 2, 2]
Çıxış: 2',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[2, 2, 1, 1, 1, 2, 2]","expectedOutput":"2"},{"input":"[3, 2, 3]","expectedOutput":"3"}]'::jsonb,
    '[{"input":"[1]","expectedOutput":"1"},{"input":"[6, 5, 5]","expectedOutput":"5"},{"input":"[10, 9, 9, 9, 10]","expectedOutput":"9"}]'::jsonb,
    '[{"input":"[2, 2, 1, 1, 1, 2, 2]","expectedOutput":"2","testNum":1,"isHidden":false},{"input":"[3, 2, 3]","expectedOutput":"3","testNum":2,"isHidden":false},{"input":"[1]","expectedOutput":"1","testNum":3,"isHidden":true},{"input":"[6, 5, 5]","expectedOutput":"5","testNum":4,"isHidden":true},{"input":"[10, 9, 9, 9, 10]","expectedOutput":"9","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Massivin Fırladılması (Rotate Array)',
    'Algorithms',
    'medium'::public.question_difficulty,
    'Verilmiş massivi sağa doğru k addım fırladın və nəticə massivini qaytarın.

Nümunə:
Giriş: nums = [1, 2, 3, 4, 5, 6, 7], k = 3
Çıxış: [5, 6, 7, 1, 2, 3, 4]',
    'def solution(nums, k):
    # Kodunuzu bura yazın
    pass
',
    'def solution(nums, k):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[1, 2, 3, 4, 5, 6, 7], 3","expectedOutput":"[5, 6, 7, 1, 2, 3, 4]"},{"input":"[-1, -100, 3, 99], 2","expectedOutput":"[3, 99, -1, -100]"}]'::jsonb,
    '[{"input":"[1, 2], 3","expectedOutput":"[2, 1]"},{"input":"[1], 0","expectedOutput":"[1]"},{"input":"[1, 2, 3, 4], 4","expectedOutput":"[1, 2, 3, 4]"}]'::jsonb,
    '[{"input":"[1, 2, 3, 4, 5, 6, 7], 3","expectedOutput":"[5, 6, 7, 1, 2, 3, 4]","testNum":1,"isHidden":false},{"input":"[-1, -100, 3, 99], 2","expectedOutput":"[3, 99, -1, -100]","testNum":2,"isHidden":false},{"input":"[1, 2], 3","expectedOutput":"[2, 1]","testNum":3,"isHidden":true},{"input":"[1], 0","expectedOutput":"[1]","testNum":4,"isHidden":true},{"input":"[1, 2, 3, 4], 4","expectedOutput":"[1, 2, 3, 4]","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Qonşu Dublikatların Silinməsi (Remove Adjacent Duplicates)',
    'Algorithms',
    'medium'::public.question_difficulty,
    'Kiçik ingilis hərflərindən ibarət sətir verilib. Yan-yana duran eyni iki hərfi sətirdən silin. Bu prosesi heç bir qonşu dublikat qalmayana qədər davam etdirin və son nəticəni qaytarın (Yığın / Stack alqoritmi).

Nümunə:
Giriş: "abbaca"
Çıxış: "ca" (Əvvəl "bb" silinir -> "aaca", sonra "aa" silinir -> "ca")',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    'def solution(s):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"\"abbaca\"","expectedOutput":"\"ca\""},{"input":"\"azxxzy\"","expectedOutput":"\"ay\""}]'::jsonb,
    '[{"input":"\"aababaab\"","expectedOutput":"\"ba\""},{"input":"\"aaaaaaaa\"","expectedOutput":"\"\""},{"input":"\"abcdef\"","expectedOutput":"\"abcdef\""}]'::jsonb,
    '[{"input":"\"abbaca\"","expectedOutput":"\"ca\"","testNum":1,"isHidden":false},{"input":"\"azxxzy\"","expectedOutput":"\"ay\"","testNum":2,"isHidden":false},{"input":"\"aababaab\"","expectedOutput":"\"ba\"","testNum":3,"isHidden":true},{"input":"\"aaaaaaaa\"","expectedOutput":"\"\"","testNum":4,"isHidden":true},{"input":"\"abcdef\"","expectedOutput":"\"abcdef\"","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

INSERT INTO public.questions (
    title,
    topic,
    difficulty,
    problem_statement,
    starter_code,
    base_code,
    visible_tests,
    hidden_tests,
    test_cases,
    is_public
) VALUES (
    'Kəsişən İntervalların Birləşdirilməsi (Merge Intervals)',
    'Algorithms',
    'hard'::public.question_difficulty,
    'Hər biri [start, end] olan intervallar massivi verilib. Bütün kəsişən və ya toxunan intervalları birləşdirin və nizamlanmış intervallar siyahısını qaytarın.

Nümunə:
Giriş: [[1, 3], [2, 6], [8, 10], [15, 18]]
Çıxış: [[1, 6], [8, 10], [15, 18]] ([1,3] və [2,6] kəsişir -> [1,6])',
    'def solution(intervals):
    # Kodunuzu bura yazın
    pass
',
    'def solution(intervals):
    # Kodunuzu bura yazın
    pass
',
    '[{"input":"[[1, 3], [2, 6], [8, 10], [15, 18]]","expectedOutput":"[[1, 6], [8, 10], [15, 18]]"},{"input":"[[1, 4], [4, 5]]","expectedOutput":"[[1, 5]]"}]'::jsonb,
    '[{"input":"[[6, 8], [1, 9], [2, 4], [4, 7]]","expectedOutput":"[[1, 9]]"},{"input":"[[1, 4], [0, 4]]","expectedOutput":"[[0, 4]]"},{"input":"[[1, 4], [2, 3]]","expectedOutput":"[[1, 4]]"}]'::jsonb,
    '[{"input":"[[1, 3], [2, 6], [8, 10], [15, 18]]","expectedOutput":"[[1, 6], [8, 10], [15, 18]]","testNum":1,"isHidden":false},{"input":"[[1, 4], [4, 5]]","expectedOutput":"[[1, 5]]","testNum":2,"isHidden":false},{"input":"[[6, 8], [1, 9], [2, 4], [4, 7]]","expectedOutput":"[[1, 9]]","testNum":3,"isHidden":true},{"input":"[[1, 4], [0, 4]]","expectedOutput":"[[0, 4]]","testNum":4,"isHidden":true},{"input":"[[1, 4], [2, 3]]","expectedOutput":"[[1, 4]]","testNum":5,"isHidden":true}]'::jsonb,
    true
)
ON CONFLICT (title) DO UPDATE SET
    topic = EXCLUDED.topic,
    difficulty = EXCLUDED.difficulty,
    problem_statement = EXCLUDED.problem_statement,
    starter_code = EXCLUDED.starter_code,
    base_code = EXCLUDED.base_code,
    visible_tests = EXCLUDED.visible_tests,
    hidden_tests = EXCLUDED.hidden_tests,
    test_cases = EXCLUDED.test_cases,
    is_public = EXCLUDED.is_public,
    updated_at = NOW();

-- Verification Query:
-- SELECT id, title, topic, difficulty, jsonb_array_length(visible_tests) AS visible_count, jsonb_array_length(hidden_tests) AS hidden_count FROM public.questions ORDER BY topic, difficulty;
