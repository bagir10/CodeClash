import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

const PYTHON_RUNNER_SCRIPT = `
import ast
import contextlib
import importlib.util
import inspect
import io
import json
import subprocess
import sys
import traceback

def normalize_text(s):
    if s is None:
        return ''
    lines = [line.rstrip() for line in str(s).replace('\\r\\n', '\\n').strip().split('\\n')]
    text = '\\n'.join(lines)
    for ch in ['[', ']', '(', ')', ',', ':']:
        text = text.replace(f' {ch}', ch).replace(f'{ch} ', ch)
    lower = text.lower()
    if lower == 'true':
        return 'true'
    if lower == 'false':
        return 'false'
    if lower in ('none', 'null'):
        return 'none'
    return text

def safe_literal(val_str):
    if val_str is None:
        return True, None
    if isinstance(val_str, (int, float, bool, list, dict, tuple)):
        return True, val_str
    s = str(val_str).strip()
    if s.lower() == 'true':
        return True, True
    if s.lower() == 'false':
        return True, False
    if s.lower() in ('null', 'none'):
        return True, None
    try:
        return True, ast.literal_eval(s)
    except Exception:
        return False, s

def values_equal(actual, expected_raw):
    if expected_raw is None:
        return actual is None

    # 1. Direct or safe_literal comparison
    ok_exp, exp_val = safe_literal(expected_raw)
    if ok_exp:
        if actual == exp_val:
            return True
        if isinstance(actual, (list, tuple)) and isinstance(exp_val, (list, tuple)):
            if list(actual) == list(exp_val):
                return True
        if isinstance(actual, (int, float)) and isinstance(exp_val, (int, float)):
            if abs(float(actual) - float(exp_val)) < 1e-6:
                return True
        ok_act, act_val = safe_literal(actual)
        if ok_act:
            if act_val == exp_val:
                return True
            if isinstance(act_val, (list, tuple)) and isinstance(exp_val, (list, tuple)):
                if list(act_val) == list(exp_val):
                    return True

    # 2. String normalized comparison
    norm_act = normalize_text(actual)
    norm_exp = normalize_text(expected_raw)
    if norm_act == norm_exp:
        return True

    # 3. Strip wrapping quotes if string
    if (norm_exp.startswith('"') and norm_exp.endswith('"')) or (norm_exp.startswith("'") and norm_exp.endswith("'")):
        if norm_act == norm_exp[1:-1]:
            return True
    if (norm_act.startswith('"') and norm_act.endswith('"')) or (norm_act.startswith("'") and norm_act.endswith("'")):
        if norm_act[1:-1] == norm_exp:
            return True

    return False

def parse_args_for_func(raw_input, param_count):
    if param_count == 0:
        return ()
    if raw_input is None:
        return (None,) if param_count == 1 else ()

    text = str(raw_input).strip()
    if text == '':
        return () if param_count == 0 else ('',)

    # 1. Try tuple eval: (arg1, arg2, ...)
    try:
        evaluated = ast.literal_eval(f'({text},)')
        if isinstance(evaluated, tuple):
            if len(evaluated) == param_count:
                return evaluated
            if (
                len(evaluated) == 1
                and param_count > 1
                and isinstance(evaluated[0], (list, tuple))
                and len(evaluated[0]) == param_count
            ):
                return tuple(evaluated[0])
            if param_count == 1 and len(evaluated) == 1:
                return evaluated
    except Exception:
        pass

    # 2. Try newline separated
    lines = [l.strip() for l in text.split('\\n') if l.strip() != '']
    if len(lines) == param_count:
        parsed = []
        for l in lines:
            ok, val = safe_literal(l)
            parsed.append(val if ok else l)
        return tuple(parsed)

    # 3. Single parameter safe_literal
    if param_count == 1:
        ok, val = safe_literal(text)
        return (val if ok else text,)

    # 4. Try whitespace tokens
    tokens = text.split()
    if len(tokens) == param_count:
        parsed = []
        for t in tokens:
            ok, val = safe_literal(t)
            parsed.append(val if ok else t)
        return tuple(parsed)

    return (text,)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            'isCorrect': False,
            'output': '(arqumentlər çatışmır)',
            'error': 'İcraçı fayl arqumentləri düzgün verilməyib.'
        }))
        return

    user_file = sys.argv[1]
    cases_file = sys.argv[2]

    try:
        with open(user_file, 'r', encoding='utf-8') as f:
            source = f.read()
    except Exception as e:
        print(json.dumps({
            'isCorrect': False,
            'output': '',
            'error': f'Mənbə kodu oxunarkən xəta: {e}'
        }))
        return

    try:
        with open(cases_file, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
    except Exception:
        test_cases = []

    if not isinstance(test_cases, list):
        test_cases = []

    # 1. Syntax check
    try:
        tree = ast.parse(source, filename=user_file)
    except SyntaxError as e:
        print(json.dumps({
            'isCorrect': False,
            'output': '(sintaksis xətasına görə kod icra olunmadı)',
            'error': f'Sintaksis xətası (Sətir {e.lineno}): {e.msg}'
        }))
        return

    # Check whether the code uses stdin / input()
    uses_input = any(
        (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'input')
        or (isinstance(node, ast.Attribute) and node.attr in ('stdin', 'readline', 'readlines'))
        for node in ast.walk(tree)
    )

    func_defs = [node.name for node in tree.body if isinstance(node, ast.FunctionDef)]

    # REJİM 1: Funksiya əsaslı yoxlama (LeetCode stili)
    if func_defs and not uses_input:
        buf = io.StringIO()
        try:
            with contextlib.redirect_stdout(buf):
                spec = importlib.util.spec_from_file_location('user_solution', user_file)
                mod = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(mod)
        except Exception:
            print(json.dumps({
                'isCorrect': False,
                'output': buf.getvalue().strip() or '(çıxış yoxdur)',
                'error': traceback.format_exc(limit=3)
            }))
            return

        target_name = 'solution' if 'solution' in func_defs else ('solve' if 'solve' in func_defs else func_defs[-1])
        fn = getattr(mod, target_name)

        try:
            sig = inspect.signature(fn)
            param_count = len(sig.parameters)
        except Exception:
            param_count = 1

        last_display = ''

        if not test_cases:
            print(json.dumps({
                'isCorrect': True,
                'output': buf.getvalue().strip() or 'Funksiya xətasız yükləndi.',
                'error': None
            }))
            return

        for idx, tc in enumerate(test_cases):
            raw_in = tc.get('input', '')
            expected = tc.get('expected_output', tc.get('expectedOutput'))
            args = parse_args_for_func(raw_in, param_count)
            call_buf = io.StringIO()
            try:
                with contextlib.redirect_stdout(call_buf):
                    res = fn(*args)
            except Exception:
                printed = '\\n'.join(filter(None, [buf.getvalue().strip(), call_buf.getvalue().strip()]))
                print(json.dumps({
                    'isCorrect': False,
                    'output': printed or '(çıxış yoxdur)',
                    'error': f'Test #{idx + 1} icra xətası:\\n{traceback.format_exc(limit=3)}'
                }))
                return

            printed = '\\n'.join(filter(None, [buf.getvalue().strip(), call_buf.getvalue().strip()]))

            out_parts = []
            if printed:
                out_parts.append(f'Print: {printed}')
            if res is not None:
                out_parts.append(f'Return: {repr(res)}')
            last_display = '\\n'.join(out_parts) if out_parts else '(heç nə qaytarılmayıb / print edilməyib)'

            matched = False
            if expected is not None:
                if values_equal(res, expected):
                    matched = True
                elif res is None and printed and values_equal(printed, expected):
                    matched = True
            else:
                matched = True

            if not matched:
                actual_show = repr(res) if res is not None else (printed if printed else 'None')
                print(json.dumps({
                    'isCorrect': False,
                    'output': last_display,
                    'error': f'Test #{idx + 1} uyğun gəlmədi.\\nGiriş: {raw_in}\\nGözlənilən: {expected}\\nSənin nəticən: {actual_show}'
                }))
                return

        print(json.dumps({
            'isCorrect': True,
            'output': f'Bütün testlər keçdi ({len(test_cases)}/{len(test_cases)})!\\n{last_display}',
            'error': None
        }))
        return

    # REJİM 2: Standart input() / print() yoxlaması (Codeforces / Competitive Programming)
    last_out = ''
    if not test_cases:
        test_cases = [{'input': '', 'expected_output': None}]

    for idx, tc in enumerate(test_cases):
        raw_in = str(tc.get('input', ''))
        expected = tc.get('expected_output', tc.get('expectedOutput'))
        try:
            proc = subprocess.run(
                [sys.executable, user_file],
                input=raw_in,
                text=True,
                capture_output=True,
                timeout=3.0,
                encoding='utf-8',
                errors='replace'
            )
        except subprocess.TimeoutExpired:
            print(json.dumps({
                'isCorrect': False,
                'output': '(vaxt limiti aşılıb)',
                'error': f'Test #{idx + 1}: Vaxt limiti aşıldı (Time Limit Exceeded).'
            }))
            return
        except Exception as e:
            print(json.dumps({
                'isCorrect': False,
                'output': '(icra xətası)',
                'error': f'Test #{idx + 1} başlana bilmədi: {e}'
            }))
            return

        last_out = proc.stdout.strip()
        if proc.returncode != 0:
            err_msg = proc.stderr.strip() or 'İcra zamanı xəta baş verdi.'
            print(json.dumps({
                'isCorrect': False,
                'output': last_out or '(çıxış yoxdur)',
                'error': f'Test #{idx + 1} icra xətası:\\n{err_msg}'
            }))
            return

        if expected is not None and not values_equal(last_out, expected):
            print(json.dumps({
                'isCorrect': False,
                'output': last_out or '(çıxış yoxdur)',
                'error': f'Test #{idx + 1} uyğun gəlmədi.\\nGiriş: {raw_in}\\nGözlənilən: {expected}\\nSənin nəticən: {last_out}'
            }))
            return

    print(json.dumps({
        'isCorrect': True,
        'output': f'Bütün testlər keçdi ({len(test_cases)}/{len(test_cases)})!\\n{last_out}',
        'error': None
    }))

if __name__ == '__main__':
    main()
`;

/**
 * Executes Python code against a set of test cases.
 * Handles both function-based LeetCode style and competitive programming stdin/stdout style.
 *
 * @param {string|object} codeOrPayload - The Python source code string, or an object containing code and testCases
 * @param {Array|string} [rawTestCases=[]] - Array of test case objects [{ input, expectedOutput }]
 * @returns {Promise<{ isCorrect: boolean, executionTimeMs: number, output: string, error: string|null }>}
 */
export async function executePythonCode(codeOrPayload, rawTestCases = []) {
    let code = '';
    let testCases = rawTestCases;

    if (typeof codeOrPayload === 'object' && codeOrPayload !== null) {
        code = codeOrPayload.code ?? '';
        testCases = codeOrPayload.testCases ?? codeOrPayload.test_cases ?? rawTestCases;
    } else {
        code = String(codeOrPayload ?? '');
    }

    let parsedCases = [];
    if (typeof testCases === 'string') {
        try {
            parsedCases = JSON.parse(testCases);
        } catch {
            parsedCases = [];
        }
    } else if (Array.isArray(testCases)) {
        parsedCases = testCases;
    }

    const runId = crypto.randomUUID();
    const tempDir = path.join(os.tmpdir(), `codeclash-${runId}`);
    await fs.mkdir(tempDir, { recursive: true });

    const runnerPath = path.join(tempDir, 'runner.py');
    const solutionPath = path.join(tempDir, 'solution.py');
    const casesPath = path.join(tempDir, 'cases.json');

    const startTime = performance.now();

    try {
        await fs.writeFile(runnerPath, PYTHON_RUNNER_SCRIPT, 'utf8');
        await fs.writeFile(solutionPath, String(code ?? ''), 'utf8');
        await fs.writeFile(casesPath, JSON.stringify(parsedCases), 'utf8');

        const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
        const env = {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            PYTHONUTF8: '1',
        };

        return await new Promise((resolve) => {
            let settled = false;
            const child = spawn(pythonBin, [runnerPath, solutionPath, casesPath], {
                stdio: ['ignore', 'pipe', 'pipe'],
                env,
            });

            let stdout = '';
            let stderr = '';

            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                try {
                    child.kill('SIGKILL');
                } catch {
                    child.kill();
                }
                const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
                resolve({
                    isCorrect: false,
                    executionTimeMs,
                    output: '(vaxt limiti aşılıb)',
                    error: 'Kodun ümumi icra müddəti limiti aşdı (Time Limit Exceeded).'
                });
            }, 7500);

            child.stdout.on('data', (chunk) => {
                stdout += chunk.toString();
            });

            child.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });

            child.on('error', (err) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));
                resolve({
                    isCorrect: false,
                    executionTimeMs,
                    output: '(icra mühiti xətası)',
                    error: `Python işə salına bilmədi: ${err.message}`
                });
            });

            child.on('close', () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                const executionTimeMs = Math.max(1, Math.round(performance.now() - startTime));

                const trimmedOut = stdout.trim();
                if (trimmedOut) {
                    try {
                        const parsed = JSON.parse(trimmedOut);
                        resolve({
                            isCorrect: Boolean(parsed.isCorrect),
                            executionTimeMs,
                            output: typeof parsed.output === 'string' ? parsed.output : '(çıxış yoxdur)',
                            error: parsed.error ? String(parsed.error) : null,
                        });
                        return;
                    } catch {
                        // In case output wasn't pure JSON
                    }
                }

                resolve({
                    isCorrect: false,
                    executionTimeMs,
                    output: trimmedOut || '(çıxış yoxdur)',
                    error: stderr.trim() || 'Nəticə oxunarkən xəta baş verdi.'
                });
            });
        });
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

export const runPythonCode = executePythonCode;
export const executePython = executePythonCode;
export const executeCode = executePythonCode;
export default executePythonCode;
