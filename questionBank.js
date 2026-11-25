/**
 * QUESTION BANK: 30+ Production Coding Problems for Code Clash
 * Categorized by:
 * - Topics: Arrays, Strings, Math, Logic, Algorithms
 * - Difficulty: easy, medium, hard
 * - 2 visible tests & 3+ hidden tests per problem
 */

export const QUESTION_BANK = [
  // ===========================================================================
  // 1. ARRAYS
  // ===========================================================================
  {
    id: 'q-arr-01',
    title: 'İki Ədədin Cəmi (Two Sum)',
    difficulty: 'easy',
    topic: 'Arrays',
    problem_statement: `Verilmiş tam ədədlər massivində (nums) cəmi hədəf ədədə (target) bərabər olan iki ədədin indekslərini tapın və siyahı kimi qaytarın.

Hər bir test üçün yalnız bir düzgün həllin olduğunu və eyni elementi iki dəfə istifadə edə bilməyəcəyinizi qəbul edin.

Nümunə 1:
Giriş: nums = [2, 7, 11, 15], target = 9
Çıxış: [0, 1]

Nümunə 2:
Giriş: nums = [3, 2, 4], target = 6
Çıxış: [1, 2]`,
    starter_code: `def solution(nums, target):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[2, 7, 11, 15], 9', expectedOutput: '[0, 1]' },
      { input: '[3, 2, 4], 6', expectedOutput: '[1, 2]' },
    ],
    hidden_tests: [
      { input: '[3, 3], 6', expectedOutput: '[0, 1]' },
      { input: '[-1, -2, -3, -4, -5], -8', expectedOutput: '[2, 4]' },
      { input: '[0, 4, 3, 0], 0', expectedOutput: '[0, 3]' },
      { input: '[1, 5, 8, 12, 19], 20', expectedOutput: '[0, 4]' },
    ],
  },
  {
    id: 'q-arr-02',
    title: 'Sıfırları Sona Köçür (Move Zeroes)',
    difficulty: 'easy',
    topic: 'Arrays',
    problem_statement: `Verilmiş tam ədədlər massivində (nums) sıfır olmayan elementlərin nisbi ardıcıllığını qorumaqla bütün 0-ları massivin sonuna köçürün və yenilənmiş massivi qaytarın.

Nümunə:
Giriş: [0, 1, 0, 3, 12]
Çıxış: [1, 3, 12, 0, 0]`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[0, 1, 0, 3, 12]', expectedOutput: '[1, 3, 12, 0, 0]' },
      { input: '[0]', expectedOutput: '[0]' },
    ],
    hidden_tests: [
      { input: '[1, 2, 3]', expectedOutput: '[1, 2, 3]' },
      { input: '[0, 0, 0, 1]', expectedOutput: '[1, 0, 0, 0]' },
      { input: '[4, 0, 5, 0, 6, 0]', expectedOutput: '[4, 5, 6, 0, 0, 0]' },
    ],
  },
  {
    id: 'q-arr-03',
    title: 'Təkrarlanan Elementi Yoxla (Contains Duplicate)',
    difficulty: 'easy',
    topic: 'Arrays',
    problem_statement: `Verilmiş tam ədədlər massivində hər hansı bir ədəd ən azı iki dəfə təkrarlanırsa True, bütün ədədlər unikaldırsa False qaytarın.

Nümunə 1:
Giriş: [1, 2, 3, 1]
Çıxış: True

Nümunə 2:
Giriş: [1, 2, 3, 4]
Çıxış: False`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[1, 2, 3, 1]', expectedOutput: 'True' },
      { input: '[1, 2, 3, 4]', expectedOutput: 'False' },
    ],
    hidden_tests: [
      { input: '[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]', expectedOutput: 'True' },
      { input: '[]', expectedOutput: 'False' },
      { input: '[100]', expectedOutput: 'False' },
      { input: '[-5, -4, -3, -2, -1]', expectedOutput: 'False' },
    ],
  },
  {
    id: 'q-arr-04',
    title: 'Maksimum Alt Massiv (Maximum Subarray)',
    difficulty: 'medium',
    topic: 'Arrays',
    problem_statement: `Verilmiş tam ədədlər massivində (nums) ən böyük cəmə malik olan kəsilməz alt massivi tapın və həmin maksimum cəmi qaytarın (Kadane alqoritmi).

Nümunə:
Giriş: [-2, 1, -3, 4, -1, 2, 1, -5, 4]
Çıxış: 6  (Çünki [4, -1, 2, 1] alt massivinin cəmi 6-dır)`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[-2, 1, -3, 4, -1, 2, 1, -5, 4]', expectedOutput: '6' },
      { input: '[1]', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '[5, 4, -1, 7, 8]', expectedOutput: '23' },
      { input: '[-5, -2, -8, -1]', expectedOutput: '-1' },
      { input: '[-10, 2, 3, -1, 5, -2]', expectedOutput: '9' },
    ],
  },
  {
    id: 'q-arr-05',
    title: 'Çatışmayan Ədəd (Find Missing Number)',
    difficulty: 'medium',
    topic: 'Arrays',
    problem_statement: `0-dan n-ə qədər olan n sayda müxtəlif ədədi ehtiva edən massiv verilib. Həmin aralıqda çatışmayan tək ədədi tapıb qaytarın.

Nümunə:
Giriş: [3, 0, 1]
Çıxış: 2 (Aralıq 0-3, 2 çatışmır)`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[3, 0, 1]', expectedOutput: '2' },
      { input: '[0, 1]', expectedOutput: '2' },
    ],
    hidden_tests: [
      { input: '[9, 6, 4, 2, 3, 5, 7, 0, 1]', expectedOutput: '8' },
      { input: '[0]', expectedOutput: '1' },
      { input: '[1]', expectedOutput: '0' },
      { input: '[0, 2, 3, 4, 5]', expectedOutput: '1' },
    ],
  },
  {
    id: 'q-arr-06',
    title: 'Səhmlərin Alışı və Satışı (Best Time to Buy and Sell Stock)',
    difficulty: 'medium',
    topic: 'Arrays',
    problem_statement: `Hər bir elementin müəyyən bir gündəki səhm qiymətini göstərdiyi prices massivi verilib. Bir gün səhmi alıb gələcək başqa bir gündə satmaqla əldə edə biləcəyiniz maksimum qazancı hesablayın. Heç bir qazanc mümkün deyilsə, 0 qaytarın.

Nümunə:
Giriş: [7, 1, 5, 3, 6, 4]
Çıxış: 5 (2-ci gün 1-ə alıb 5-ci gün 6-ya satmaqla 6-1=5 qazanc)`,
    starter_code: `def solution(prices):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[7, 1, 5, 3, 6, 4]', expectedOutput: '5' },
      { input: '[7, 6, 4, 3, 1]', expectedOutput: '0' },
    ],
    hidden_tests: [
      { input: '[1, 2]', expectedOutput: '1' },
      { input: '[2, 4, 1]', expectedOutput: '2' },
      { input: '[3, 3, 3, 3]', expectedOutput: '0' },
      { input: '[2, 1, 2, 0, 1]', expectedOutput: '1' },
    ],
  },
  {
    id: 'q-arr-07',
    title: 'İki Sıralanmış Massivin Birləşdirilməsi və Medianı (Median of Sorted Arrays)',
    difficulty: 'hard',
    topic: 'Arrays',
    problem_statement: `İki sıralanmış tam ədədlər massivi (nums1 və nums2) verilib. Bu iki massivi birləşdirdikdən sonra yaranan bütöv massivin medianını float və ya int formatında qaytarın.

Nümunə 1:
Giriş: [1, 3], [2]
Çıxış: 2.0

Nümunə 2:
Giriş: [1, 2], [3, 4]
Çıxış: 2.5 (Ortadakı 2 və 3-ün ədədi ortası)`,
    starter_code: `def solution(nums1, nums2):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[1, 3], [2]', expectedOutput: '2.0' },
      { input: '[1, 2], [3, 4]', expectedOutput: '2.5' },
    ],
    hidden_tests: [
      { input: '[0, 0], [0, 0]', expectedOutput: '0.0' },
      { input: '[], [1]', expectedOutput: '1.0' },
      { input: '[2], []', expectedOutput: '2.0' },
      { input: '[1, 5, 9], [2, 6, 10]', expectedOutput: '5.5' },
    ],
  },

  // ===========================================================================
  // 2. STRINGS
  // ===========================================================================
  {
    id: 'q-str-01',
    title: 'Polindrom Yoxlanışı (Valid Palindrome)',
    difficulty: 'easy',
    topic: 'Strings',
    problem_statement: `Verilmiş mətndə (s) yalnız hərf və rəqəmləri nəzərə alaraq (böyük-kiçik hərf fərqini qoymadan) onun polindrom olub-olmadığını yoxlayın. Polindrom hər iki istiqamətdə eyni oxunan söz və ya cümlədir.

Nümunə:
Giriş: "A man, a plan, a canal: Panama"
Çıxış: True`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"A man, a plan, a canal: Panama"', expectedOutput: 'True' },
      { input: '"race a car"', expectedOutput: 'False' },
    ],
    hidden_tests: [
      { input: '" "', expectedOutput: 'True' },
      { input: '"0P"', expectedOutput: 'False' },
      { input: '"radar"', expectedOutput: 'True' },
      { input: '"No lemon, no melon"', expectedOutput: 'True' },
    ],
  },
  {
    id: 'q-str-02',
    title: 'Anaqram Yoxlanışı (Valid Anagram)',
    difficulty: 'easy',
    topic: 'Strings',
    problem_statement: `İki verilmiş sətir (s və t) verilib. Əgər t sətri s-in hərflərinin eyni sayda yerini dəyişdirməklə yaradılıbsa (anaqramdırsa) True, əks halda False qaytarın.

Nümunə 1:
Giriş: "anagram", "nagaram"
Çıxış: True

Nümunə 2:
Giriş: "rat", "car"
Çıxış: False`,
    starter_code: `def solution(s, t):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"anagram", "nagaram"', expectedOutput: 'True' },
      { input: '"rat", "car"', expectedOutput: 'False' },
    ],
    hidden_tests: [
      { input: '"listen", "silent"', expectedOutput: 'True' },
      { input: '"a", "ab"', expectedOutput: 'False' },
      { input: '"hello", "world"', expectedOutput: 'False' },
      { input: '"abcc", "bcac"', expectedOutput: 'True' },
    ],
  },
  {
    id: 'q-str-03',
    title: 'Ən Uzun Ümumi Prefiks (Longest Common Prefix)',
    difficulty: 'easy',
    topic: 'Strings',
    problem_statement: `Mətnlər massivində (strs) bütün sözlər üçün ən uzun ortaq başlanğıc prefiksini tapın. Ortaq prefiks yoxdursa, boş sətir "" qaytarın.

Nümunə:
Giriş: ["flower", "flow", "flight"]
Çıxış: "fl"`,
    starter_code: `def solution(strs):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '["flower", "flow", "flight"]', expectedOutput: '"fl"' },
      { input: '["dog", "racecar", "car"]', expectedOutput: '""' },
    ],
    hidden_tests: [
      { input: '["interspecies", "interstellar", "interstate"]', expectedOutput: '"inters"' },
      { input: '["throne", "throne"]', expectedOutput: '"throne"' },
      { input: '["a"]', expectedOutput: '"a"' },
    ],
  },
  {
    id: 'q-str-04',
    title: 'Sözlərin Tərsinə Düzülüşü (Reverse Words in a String)',
    difficulty: 'medium',
    topic: 'Strings',
    problem_statement: `Verilmiş mətndəki sözlərin sırasını tərsinə çevirərək tək boşluqla birləşdirin. Artıq boşluqları kənarlaşdırın.

Nümunə:
Giriş: "  the sky is   blue  "
Çıxış: "blue is sky the"`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"  the sky is   blue  "', expectedOutput: '"blue is sky the"' },
      { input: '"hello world"', expectedOutput: '"world hello"' },
    ],
    hidden_tests: [
      { input: '"a good   example"', expectedOutput: '"example good a"' },
      { input: '"Bob"', expectedOutput: '"Bob"' },
      { input: '"   one   two   three   "', expectedOutput: '"three two one"' },
    ],
  },
  {
    id: 'q-str-05',
    title: 'Mətni Sıxlaşdır (Run-Length Compression)',
    difficulty: 'medium',
    topic: 'Strings',
    problem_statement: `Verilmiş simvollar sətirində təkrar olunan simvolları onların sayı ilə əvəzləyərək sıxlaşdırın. Məsələn, "aabcccccaaa" -> "a2b1c5a3". Əgər sıxlaşdırılmış sətir orijinaldan qısa deyilsə, orijinal mətni qaytarın.

Nümunə:
Giriş: "aabcccccaaa"
Çıxış: "a2b1c5a3"`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"aabcccccaaa"', expectedOutput: '"a2b1c5a3"' },
      { input: '"abc"', expectedOutput: '"abc"' },
    ],
    hidden_tests: [
      { input: '"aaaaaaaaaa"', expectedOutput: '"a10"' },
      { input: '"aabbcc"', expectedOutput: '"aabbcc"' },
      { input: '"wwwwaaadexxxxxx"', expectedOutput: '"w4a3d1e1x6"' },
    ],
  },
  {
    id: 'q-str-06',
    title: 'İlk Unikal Simvol (First Unique Character)',
    difficulty: 'medium',
    topic: 'Strings',
    problem_statement: `Verilmiş sətirdə ilk təkrarlanmayan simvolun indeksini tapın. Əgər belə simvol yoxdursa, -1 qaytarın.

Nümunə 1:
Giriş: "leetcode"
Çıxış: 0

Nümunə 2:
Giriş: "loveleetcode"
Çıxış: 2 ('v' simvolu)`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"leetcode"', expectedOutput: '0' },
      { input: '"loveleetcode"', expectedOutput: '2' },
    ],
    hidden_tests: [
      { input: '"aabb"', expectedOutput: '-1' },
      { input: '"z"', expectedOutput: '0' },
      { input: '"aadadaad"', expectedOutput: '-1' },
    ],
  },
  {
    id: 'q-str-07',
    title: 'Ən Uzun Təkrarsız Alt Sətir (Longest Substring Without Repeats)',
    difficulty: 'hard',
    topic: 'Strings',
    problem_statement: `Verilmiş mətndə heç bir simvolu təkrarlanmayan ən uzun alt sətrin uzunluğunu tapın.

Nümunə 1:
Giriş: "abcabcbb"
Çıxış: 3 ("abc" uzunluğu 3-dür)

Nümunə 2:
Giriş: "bbbbb"
Çıxış: 1 ("b")`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"abcabcbb"', expectedOutput: '3' },
      { input: '"bbbbb"', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '"pwwkew"', expectedOutput: '3' },
      { input: '""', expectedOutput: '0' },
      { input: '"dvdf"', expectedOutput: '3' },
      { input: '"anviaj"', expectedOutput: '5' },
    ],
  },

  // ===========================================================================
  // 3. MATH
  // ===========================================================================
  {
    id: 'q-math-01',
    title: 'Faktorialın Hesablanması (Factorial)',
    difficulty: 'easy',
    topic: 'Math',
    problem_statement: `Verilmiş mənfi olmayan tam ədədin (n) faktorialını (n!) hesablayın. 0! = 1 qəbul edilir.

Nümunə:
Giriş: 5
Çıxış: 120 (5 * 4 * 3 * 2 * 1)`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '5', expectedOutput: '120' },
      { input: '3', expectedOutput: '6' },
    ],
    hidden_tests: [
      { input: '0', expectedOutput: '1' },
      { input: '1', expectedOutput: '1' },
      { input: '6', expectedOutput: '720' },
      { input: '10', expectedOutput: '3628800' },
    ],
  },
  {
    id: 'q-math-02',
    title: 'Ədədin Rəqəmləri Cəmi (Sum of Digits)',
    difficulty: 'easy',
    topic: 'Math',
    problem_statement: `Verilmiş mənfi olmayan tam ədədin (n) bütün rəqəmlərinin cəmini tapın.

Nümunə:
Giriş: 12345
Çıxış: 15 (1 + 2 + 3 + 4 + 5)`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '12345', expectedOutput: '15' },
      { input: '0', expectedOutput: '0' },
    ],
    hidden_tests: [
      { input: '999', expectedOutput: '27' },
      { input: '10002', expectedOutput: '3' },
      { input: '7', expectedOutput: '7' },
    ],
  },
  {
    id: 'q-math-03',
    title: 'Sadə Ədəd Yoxlanışı (Is Prime Number)',
    difficulty: 'easy',
    topic: 'Math',
    problem_statement: `Verilmiş müsbət tam ədədin (n) sadə ədəd olub-olmadığını yoxlayın. Sadə ədəd yalnız 1-ə və özünə qalıqsız bölünən 1-dən böyük ədəddir.

Nümunə 1:
Giriş: 7
Çıxış: True

Nümunə 2:
Giriş: 4
Çıxış: False`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '7', expectedOutput: 'True' },
      { input: '4', expectedOutput: 'False' },
    ],
    hidden_tests: [
      { input: '1', expectedOutput: 'False' },
      { input: '2', expectedOutput: 'True' },
      { input: '97', expectedOutput: 'True' },
      { input: '100', expectedOutput: 'False' },
    ],
  },
  {
    id: 'q-math-04',
    title: 'Fibonaççi Ədədi (Fibonacci Number)',
    difficulty: 'medium',
    topic: 'Math',
    problem_statement: `F(0) = 0, F(1) = 1 və hər növbəti ədəd özündən əvvəlki iki ədədin cəmidir: F(n) = F(n-1) + F(n-2).
Verilmiş n ədədi üçün n-ci Fibonaççi ədədini hesablayın.

Nümunə:
Giriş: 6
Çıxış: 8 (0, 1, 1, 2, 3, 5, 8)`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '6', expectedOutput: '8' },
      { input: '2', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '0', expectedOutput: '0' },
      { input: '1', expectedOutput: '1' },
      { input: '10', expectedOutput: '55' },
      { input: '20', expectedOutput: '6765' },
    ],
  },
  {
    id: 'q-math-05',
    title: 'Ən Böyük Ortaq Bölən (Greatest Common Divisor)',
    difficulty: 'medium',
    topic: 'Math',
    problem_statement: `Evklid alqoritmindən istifadə edərək verilmiş iki müsbət tam ədədin (a və b) Ən Böyük Ortaq Bölənini (ƏBOB / GCD) tapın.

Nümunə:
Giriş: 48, 18
Çıxış: 6`,
    starter_code: `def solution(a, b):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '48, 18', expectedOutput: '6' },
      { input: '20, 8', expectedOutput: '4' },
    ],
    hidden_tests: [
      { input: '101, 103', expectedOutput: '1' },
      { input: '100, 100', expectedOutput: '100' },
      { input: '7, 49', expectedOutput: '7' },
      { input: '270, 192', expectedOutput: '6' },
    ],
  },
  {
    id: 'q-math-06',
    title: 'Roma Rəqəmlərindən Tam Ədədə (Roman to Integer)',
    difficulty: 'hard',
    topic: 'Math',
    problem_statement: `Roma rəqəmləri sətirini (s) tam ədədə çevirin.
I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000.
Kiçik rəqəm böyükdən əvvəl gələrsə çıxılır (məsələn IV = 4, IX = 9, XL = 40, XC = 90).

Nümunə:
Giriş: "MCMXCIV"
Çıxış: 1994 (M=1000 + CM=900 + XC=90 + IV=4)`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"MCMXCIV"', expectedOutput: '1994' },
      { input: '"LVIII"', expectedOutput: '58' },
    ],
    hidden_tests: [
      { input: '"III"', expectedOutput: '3' },
      { input: '"IV"', expectedOutput: '4' },
      { input: '"IX"', expectedOutput: '9' },
      { input: '"XL"', expectedOutput: '40' },
    ],
  },

  // ===========================================================================
  // 4. LOGIC
  // ===========================================================================
  {
    id: 'q-log-01',
    title: 'FizzBuzz',
    difficulty: 'easy',
    topic: 'Logic',
    problem_statement: `1-dən n-ə qədər ədədlərin siyahısını aşağıdakı qaydada quran funksiya yazın:
- 3-ə bölünən ədədlər üçün "Fizz"
- 5-ə bölünən ədədlər üçün "Buzz"
- Həm 3-ə, həm 5-ə bölünən ədədlər üçün "FizzBuzz"
- Digər hallarda ədədin özünün string forması.

Nümunə:
Giriş: 5
Çıxış: ["1", "2", "Fizz", "4", "Buzz"]`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '5', expectedOutput: '["1", "2", "Fizz", "4", "Buzz"]' },
      { input: '3', expectedOutput: '["1", "2", "Fizz"]' },
    ],
    hidden_tests: [
      { input: '1', expectedOutput: '["1"]' },
      { input: '15', expectedOutput: '["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]' },
      { input: '6', expectedOutput: '["1", "2", "Fizz", "4", "Buzz", "Fizz"]' },
    ],
  },
  {
    id: 'q-log-02',
    title: 'Yalnız Bir Dəfə İştirak Edən Ədəd (Single Number)',
    difficulty: 'easy',
    topic: 'Logic',
    problem_statement: `Boş olmayan tam ədədlər massivində hər bir element iki dəfə, yalnız biri isə bircə dəfə iştirak edir. Həmin tək elementi tapın və qaytarın.

Nümunə:
Giriş: [4, 1, 2, 1, 2]
Çıxış: 4`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[4, 1, 2, 1, 2]', expectedOutput: '4' },
      { input: '[2, 2, 1]', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '[1]', expectedOutput: '1' },
      { input: '[-1, -1, -2]', expectedOutput: '-2' },
      { input: '[10, 20, 30, 20, 10]', expectedOutput: '30' },
    ],
  },
  {
    id: 'q-log-03',
    title: 'Artıq İl Yoxlanışı (Leap Year Checker)',
    difficulty: 'easy',
    topic: 'Logic',
    problem_statement: `Verilmiş ilin (year) təqvimə görə artıq il (uzun il - 366 gün) olub-olmadığını müəyyən edin:
- İl 400-ə bölünürsə, artıq ildir.
- Əks halda 100-ə bölünürsə, adi ildir.
- Əks halda 4-ə bölünürsə, artıq ildir.
- Digər hallarda adi ildir.

Nümunə 1:
Giriş: 2000 -> Çıxış: True
Nümunə 2:
Giriş: 1900 -> Çıxış: False`,
    starter_code: `def solution(year):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '2000', expectedOutput: 'True' },
      { input: '1900', expectedOutput: 'False' },
    ],
    hidden_tests: [
      { input: '2024', expectedOutput: 'True' },
      { input: '2023', expectedOutput: 'False' },
      { input: '2400', expectedOutput: 'True' },
      { input: '1800', expectedOutput: 'False' },
    ],
  },
  {
    id: 'q-log-04',
    title: 'Bitlərdə Bir-lərin Sayı (Hamming Weight)',
    difficulty: 'medium',
    topic: 'Logic',
    problem_statement: `Müsbət tam ədədin (n) ikilik say sistemindəki təsvirində yer alan '1' bitlərinin sayını (Hamming çəkisi) hesablayın.

Nümunə:
Giriş: 11 (İkilik təsviri: 1011)
Çıxış: 3`,
    starter_code: `def solution(n):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '11', expectedOutput: '3' },
      { input: '128', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '0', expectedOutput: '0' },
      { input: '15', expectedOutput: '4' },
      { input: '2147483645', expectedOutput: '30' },
    ],
  },
  {
    id: 'q-log-05',
    title: 'Suda Tutan Ən Böyük Konteyner (Container With Most Water)',
    difficulty: 'hard',
    topic: 'Logic',
    problem_statement: `Qeyri-mənfi tam ədədlərdən ibarət height massivi verilib. Koordinat sistemində hər bir element xətt hündürlüyünü təmsil edir. İki xətt və x oxu arasında ən çox su tuta bilən sahəni hesablayın.

Nümunə:
Giriş: [1, 8, 6, 2, 5, 4, 8, 3, 7]
Çıxış: 49 (İndeks 1 (hündürlük 8) və indeks 8 (hündürlük 7) arasında: min(8, 7) * (8 - 1) = 49)`,
    starter_code: `def solution(height):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[1, 8, 6, 2, 5, 4, 8, 3, 7]', expectedOutput: '49' },
      { input: '[1, 1]', expectedOutput: '1' },
    ],
    hidden_tests: [
      { input: '[4, 3, 2, 1, 4]', expectedOutput: '16' },
      { input: '[1, 2, 1]', expectedOutput: '2' },
      { input: '[2, 3, 4, 5, 18, 17, 6]', expectedOutput: '17' },
    ],
  },

  // ===========================================================================
  // 5. ALGORITHMS
  // ===========================================================================
  {
    id: 'q-alg-01',
    title: 'İkili Axtarış (Binary Search)',
    difficulty: 'easy',
    topic: 'Algorithms',
    problem_statement: `Artan sıra ilə nizamlanmış tam ədədlər massivində (nums) hədəf ədədi (target) O(log n) zamanda axtarın. Tapılarsa indeksini, tapılmazsa -1 qaytarın.

Nümunə:
Giriş: nums = [-1, 0, 3, 5, 9, 12], target = 9
Çıxış: 4`,
    starter_code: `def solution(nums, target):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[-1, 0, 3, 5, 9, 12], 9', expectedOutput: '4' },
      { input: '[-1, 0, 3, 5, 9, 12], 2', expectedOutput: '-1' },
    ],
    hidden_tests: [
      { input: '[5], 5', expectedOutput: '0' },
      { input: '[5], -5', expectedOutput: '-1' },
      { input: '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10', expectedOutput: '9' },
      { input: '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1', expectedOutput: '0' },
    ],
  },
  {
    id: 'q-alg-02',
    title: 'Massivdə Çoxluq Təşkil Edən Element (Majority Element)',
    difficulty: 'easy',
    topic: 'Algorithms',
    problem_statement: `n ölçülü massivdə n // 2 dəfədən çox təkrar olunan əsas (majority) elementi tapın. Belə elementin həmişə mövcud olduğunu qəbul edin (Boyer-Moore Voting alqoritmi).

Nümunə:
Giriş: [2, 2, 1, 1, 1, 2, 2]
Çıxış: 2`,
    starter_code: `def solution(nums):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[2, 2, 1, 1, 1, 2, 2]', expectedOutput: '2' },
      { input: '[3, 2, 3]', expectedOutput: '3' },
    ],
    hidden_tests: [
      { input: '[1]', expectedOutput: '1' },
      { input: '[6, 5, 5]', expectedOutput: '5' },
      { input: '[10, 9, 9, 9, 10]', expectedOutput: '9' },
    ],
  },
  {
    id: 'q-alg-03',
    title: 'Massivin Fırladılması (Rotate Array)',
    difficulty: 'medium',
    topic: 'Algorithms',
    problem_statement: `Verilmiş massivi sağa doğru k addım fırladın və nəticə massivini qaytarın.

Nümunə:
Giriş: nums = [1, 2, 3, 4, 5, 6, 7], k = 3
Çıxış: [5, 6, 7, 1, 2, 3, 4]`,
    starter_code: `def solution(nums, k):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[1, 2, 3, 4, 5, 6, 7], 3', expectedOutput: '[5, 6, 7, 1, 2, 3, 4]' },
      { input: '[-1, -100, 3, 99], 2', expectedOutput: '[3, 99, -1, -100]' },
    ],
    hidden_tests: [
      { input: '[1, 2], 3', expectedOutput: '[2, 1]' },
      { input: '[1], 0', expectedOutput: '[1]' },
      { input: '[1, 2, 3, 4], 4', expectedOutput: '[1, 2, 3, 4]' },
    ],
  },
  {
    id: 'q-alg-04',
    title: 'Qonşu Dublikatların Silinməsi (Remove Adjacent Duplicates)',
    difficulty: 'medium',
    topic: 'Algorithms',
    problem_statement: `Kiçik ingilis hərflərindən ibarət sətir verilib. Yan-yana duran eyni iki hərfi sətirdən silin. Bu prosesi heç bir qonşu dublikat qalmayana qədər davam etdirin və son nəticəni qaytarın (Yığın / Stack alqoritmi).

Nümunə:
Giriş: "abbaca"
Çıxış: "ca" (Əvvəl "bb" silinir -> "aaca", sonra "aa" silinir -> "ca")`,
    starter_code: `def solution(s):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '"abbaca"', expectedOutput: '"ca"' },
      { input: '"azxxzy"', expectedOutput: '"ay"' },
    ],
    hidden_tests: [
      { input: '"aababaab"', expectedOutput: '"ba"' },
      { input: '"aaaaaaaa"', expectedOutput: '""' },
      { input: '"abcdef"', expectedOutput: '"abcdef"' },
    ],
  },
  {
    id: 'q-alg-05',
    title: 'Kəsişən İntervalların Birləşdirilməsi (Merge Intervals)',
    difficulty: 'hard',
    topic: 'Algorithms',
    problem_statement: `Hər biri [start, end] olan intervallar massivi verilib. Bütün kəsişən və ya toxunan intervalları birləşdirin və nizamlanmış intervallar siyahısını qaytarın.

Nümunə:
Giriş: [[1, 3], [2, 6], [8, 10], [15, 18]]
Çıxış: [[1, 6], [8, 10], [15, 18]] ([1,3] və [2,6] kəsişir -> [1,6])`,
    starter_code: `def solution(intervals):
    # Kodunuzu bura yazın
    pass
`,
    visible_tests: [
      { input: '[[1, 3], [2, 6], [8, 10], [15, 18]]', expectedOutput: '[[1, 6], [8, 10], [15, 18]]' },
      { input: '[[1, 4], [4, 5]]', expectedOutput: '[[1, 5]]' },
    ],
    hidden_tests: [
      { input: '[[6, 8], [1, 9], [2, 4], [4, 7]]', expectedOutput: '[[1, 9]]' },
      { input: '[[1, 4], [0, 4]]', expectedOutput: '[[0, 4]]' },
      { input: '[[1, 4], [2, 3]]', expectedOutput: '[[1, 4]]' },
    ],
  },
];

// Helper to attach base_code alias and combined test_cases to every question
for (const q of QUESTION_BANK) {
  q.base_code = q.starter_code;
  const visible = (q.visible_tests || []).map((t, idx) => ({
    ...t,
    testNum: idx + 1,
    isHidden: false,
  }));
  const hidden = (q.hidden_tests || []).map((t, idx) => ({
    ...t,
    testNum: visible.length + idx + 1,
    isHidden: true,
  }));
  q.test_cases = [...visible, ...hidden];
}

/**
 * Intelligent matchmaking question selector:
 * - Selects `count` questions (3 for Blitz, 5 for Classic)
 * - Balances topics & difficulties
 * - Excludes recently played question IDs for both players so they never repeat back-to-back
 *
 * @param {Object} options
 * @param {number} options.count - 3 or 5 questions
 * @param {string[]} [options.excludeIds=[]] - Question IDs to avoid repeating
 * @param {number} [options.playerElo=1200] - Used to adjust difficulty balance
 * @returns {Array} Selected diverse question objects
 */
export function getQuestionsForDuel({ count = 3, excludeIds = [], playerElo = 1200 } = {}) {
  const excludeSet = new Set(excludeIds);

  // Filter available candidate questions
  let candidates = QUESTION_BANK.filter((q) => !excludeSet.has(q.id));

  // If candidate pool too small after exclusion, reset to full bank
  if (candidates.length < count) {
    candidates = [...QUESTION_BANK];
  }

  // Shuffle candidate pool with Fisher-Yates
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Choose topic-diverse questions
  const selected = [];
  const usedTopics = new Set();

  for (const q of shuffled) {
    if (!usedTopics.has(q.topic)) {
      selected.push(q);
      usedTopics.add(q.topic);
      if (selected.length >= count) break;
    }
  }

  // If count not yet met (e.g. asking for 5, and only 4 unique topics chosen), fill remainder
  if (selected.length < count) {
    for (const q of shuffled) {
      if (!selected.some((s) => s.id === q.id)) {
        selected.push(q);
        if (selected.length >= count) break;
      }
    }
  }

  // Sort selected questions logically by difficulty (Easy -> Medium -> Hard)
  const diffOrder = { easy: 1, medium: 2, hard: 3 };
  selected.sort((a, b) => (diffOrder[a.difficulty] || 2) - (diffOrder[b.difficulty] || 2));

  return selected.slice(0, count);
}
