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
import time
import traceback

BLOCKED_MODULES = {
    'os', 'sys', 'subprocess', 'socket', 'shutil', 'pty', 'commands',
    'threading', 'multiprocessing', 'posix', 'nt', '_posixsubprocess',
    'resource', 'ctypes', 'winreg'
}

def check_security(tree):
    for node in ast.walk(tree):
        # 1. import os, sys, etc.
        if isinstance(node, ast.Import):
            for alias in node.names:
                root_module = alias.name.split('.')[0]
                if root_module in BLOCKED_MODULES:
                    return False, f"Təhlükəsizlik xətası: '{root_module}' modulunun istifadəsinə icazə verilmir."
        # 2. from os import path, etc.
        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root_module = node.module.split('.')[0]
                if root_module in BLOCKED_MODULES:
                    return False, f"Təhlükəsizlik xətası: '{root_module}' modulunun istifadəsinə icazə verilmir."
        # 3. eval(), exec(), __import__(), compile()
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                if node.func.id in ('eval', 'exec', '__import__', 'compile'):
                    return False, f"Təhlükəsizlik xətası: '{node.func.id}()' funksiyasının çağırılmasına icazə verilmir."
            elif isinstance(node.func, ast.Attribute):
                if node.func.attr in ('__subclasses__', '__bases__', '__mro__'):
                    return False, "Təhlükəsizlik xətası: Qadağan olunmuş daxili atribut müraciəti."
    return True, None

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
            'error': 'İcraçı fayl arqumentləri düzgün verilməyib.',
            'totalPassedTests': 0,
            'totalTests': 0,
            'testResults': []
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
            'error': f'Mənbə kodu oxunarkən xəta: {e}',
            'totalPassedTests': 0,
            'totalTests': 0,
            'testResults': []
        }))
        return

    try:
        with open(cases_file, 'r', encoding='utf-8') as f:
            test_cases = json.load(f)
    except Exception:
        test_cases = []

    if not isinstance(test_cases, list):
        test_cases = []

    # 1. Syntax check & Security AST inspection
    try:
        tree = ast.parse(source, filename=user_file)
    except SyntaxError as e:
        print(json.dumps({
            'isCorrect': False,
            'output': '(sintaksis xətasına görə kod icra olunmadı)',
            'error': f'Sintaksis xətası (Sətir {e.lineno}): {e.msg}',
            'totalPassedTests': 0,
            'totalTests': len(test_cases),
            'testResults': []
        }))
        return

    # Check security constraints
    sec_ok, sec_err = check_security(tree)
    if not sec_ok:
        print(json.dumps({
            'isCorrect': False,
            'output': '(təhlükəsizlik qaydası pozuldu)',
            'error': sec_err,
            'totalPassedTests': 0,
            'totalTests': len(test_cases),
            'testResults': []
        }))
        return

    # Check whether the code uses stdin / input()
    uses_input = any(
        (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'input')
        or (isinstance(node, ast.Attribute) and node.attr in ('stdin', 'readline', 'readlines'))
        for node in ast.walk(tree)
    )

    func_defs = [node.name for node in tree.body if isinstance(node, ast.FunctionDef)]

    test_results = []
    all_passed = True
    first_error_msg = None
    last_display = ''

    # =========================================================================
    # REJİM 1: Funksiya əsaslı yoxlama (LeetCode stili)
    # =========================================================================
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
                'error': traceback.format_exc(limit=3),
                'totalPassedTests': 0,
                'totalTests': len(test_cases),
                'testResults': []
            }))
            return

        target_name = 'solution' if 'solution' in func_defs else ('solve' if 'solve' in func_defs else func_defs[-1])
        fn = getattr(mod, target_name)

        try:
            sig = inspect.signature(fn)
            param_count = len(sig.parameters)
        except Exception:
            param_count = 1

        if not test_cases:
            print(json.dumps({
                'isCorrect': True,
                'output': buf.getvalue().strip() or 'Funksiya xətasız yükləndi.',
                'error': None,
                'totalPassedTests': 0,
                'totalTests': 0,
                'testResults': []
            }))
            return

        for idx, tc in enumerate(test_cases):
            raw_in = tc.get('input', '')
            expected = tc.get('expected_output', tc.get('expectedOutput'))
            is_hidden = bool(tc.get('isHidden', False))
            args = parse_args_for_func(raw_in, param_count)
            call_buf = io.StringIO()

            t0 = time.perf_counter()
            try:
                with contextlib.redirect_stdout(call_buf):
                    res = fn(*args)
                tc_time_ms = max(1, round((time.perf_counter() - t0) * 1000))
            except Exception:
                tc_time_ms = max(1, round((time.perf_counter() - t0) * 1000))
                printed = '\\n'.join(filter(None, [buf.getvalue().strip(), call_buf.getvalue().strip()]))
                all_passed = False
                err_text = f'Test #{idx + 1} icra xətası:\\n{traceback.format_exc(limit=3)}'
                if not first_error_msg:
                    first_error_msg = err_text
                test_results.append({
                    'testNum': idx + 1,
                    'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
                    'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
                    'actual': printed or '(icra xətası)',
                    'passed': False,
                    'executionTimeMs': tc_time_ms,
                    'isHidden': is_hidden,
                })
                break

            printed = '\\n'.join(filter(None, [buf.getvalue().strip(), call_buf.getvalue().strip()]))

            out_parts = []
            if printed:
                out_parts.append(f'Print: {printed}')
            if res is not None:
                out_parts.append(f'Return: {repr(res)}')
            last_display = '\\n'.join(out_parts) if out_parts else '(heç nə qaytarılmayıb)'

            matched = False
            if expected is not None:
                if values_equal(res, expected):
                    matched = True
                elif res is None and printed and values_equal(printed, expected):
                    matched = True
            else:
                matched = True

            actual_show = repr(res) if res is not None else (printed if printed else 'None')

            test_results.append({
                'testNum': idx + 1,
                'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
                'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
                'actual': str(actual_show) if (matched or not is_hidden) else "(Gizli test nəticəsi gizlədildi)",
                'passed': matched,
                'executionTimeMs': tc_time_ms,
                'isHidden': is_hidden,
            })

            if not matched:
                all_passed = False
                if not first_error_msg:
                    if is_hidden:
                        first_error_msg = f'Gizli Test #{idx + 1} uyğun gəlmədi (Giriş və çıxış məlumatları gizlidir).'
                    else:
                        first_error_msg = f'Test #{idx + 1} uyğun gəlmədi.\\nGiriş: {raw_in}\\nGözlənilən: {expected}\\nSənin nəticən: {actual_show}'
                break

        passed_count = sum(1 for t in test_results if t['passed'])
        print(json.dumps({
            'isCorrect': all_passed and passed_count == len(test_cases),
            'output': f'Testlər: {passed_count}/{len(test_cases)} keçdi!\\n{last_display}' if all_passed else last_display,
            'error': first_error_msg,
            'totalPassedTests': passed_count,
            'totalTests': len(test_cases),
            'testResults': test_results,
        }))
        return

    # =========================================================================
    # REJİM 2: Standart input() / print() yoxlaması (Competitive Programming)
    # =========================================================================
    if not test_cases:
        test_cases = [{'input': '', 'expected_output': None}]

    for idx, tc in enumerate(test_cases):
        raw_in = str(tc.get('input', ''))
        expected = tc.get('expected_output', tc.get('expectedOutput'))
        is_hidden = bool(tc.get('isHidden', False))

        t0 = time.perf_counter()
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
            tc_time_ms = max(1, round((time.perf_counter() - t0) * 1000))
        except subprocess.TimeoutExpired:
            all_passed = False
            first_error_msg = f'Test #{idx + 1}: Vaxt limiti aşıldı (Time Limit Exceeded - 3.0s).'
            test_results.append({
                'testNum': idx + 1,
                'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
                'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
                'actual': '(vaxt limiti aşılıb)',
                'passed': False,
                'executionTimeMs': 3000,
                'isHidden': is_hidden,
            })
            break
        except Exception as e:
            all_passed = False
            first_error_msg = f'Test #{idx + 1} başlana bilmədi: {e}'
            test_results.append({
                'testNum': idx + 1,
                'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
                'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
                'actual': '(icra xətası)',
                'passed': False,
                'executionTimeMs': 1,
                'isHidden': is_hidden,
            })
            break

        last_out = proc.stdout.strip()
        if proc.returncode != 0:
            all_passed = False
            err_msg = proc.stderr.strip() or 'İcra zamanı xəta baş verdi.'
            first_error_msg = f'Test #{idx + 1} icra xətası:\\n{err_msg}'
            test_results.append({
                'testNum': idx + 1,
                'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
                'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
                'actual': last_out or '(xəta baş verdi)',
                'passed': False,
                'executionTimeMs': tc_time_ms,
                'isHidden': is_hidden,
            })
            break

        matched = True
        if expected is not None and not values_equal(last_out, expected):
            matched = False
            all_passed = False
            if not first_error_msg:
                if is_hidden:
                    first_error_msg = f'Gizli Test #{idx + 1} uyğun gəlmədi (Giriş və çıxış məlumatları gizlidir).'
                else:
                    first_error_msg = f'Test #{idx + 1} uyğun gəlmədi.\\nGiriş: {raw_in}\\nGözlənilən: {expected}\\nSənin nəticən: {last_out}'

        test_results.append({
            'testNum': idx + 1,
            'input': str(raw_in) if not is_hidden else "(Gizli Test Girişi)",
            'expected': str(expected) if not is_hidden else "(Gizli Test Gözləniləni)",
            'actual': last_out if (matched or not is_hidden) else "(Gizli test nəticəsi gizlədildi)",
            'passed': matched,
            'executionTimeMs': tc_time_ms,
            'isHidden': is_hidden,
        })

        if not matched:
            break

    passed_count = sum(1 for t in test_results if t['passed'])
    print(json.dumps({
        'isCorrect': all_passed and passed_count == len(test_cases),
        'output': f'Testlər: {passed_count}/{len(test_cases)} keçdi!\\n{last_out}' if all_passed else (last_out or '(çıxış yoxdur)'),
        'error': first_error_msg,
        'totalPassedTests': passed_count,
        'totalTests': len(test_cases),
        'testResults': test_results,
    }))

if __name__ == '__main__':
    main()
`;

// =============================================================================
// ASYNC PYTHON EXECUTION QUEUE (CONCURRENCY LIMITER)
// Limits simultaneous active Python child processes to a maximum of 3.
// Crucial for 512MB RAM instances (e.g. Render free tier) with 30 concurrent users.
// Additional requests wait safely in the queue without crashing RAM or causing false TLEs.
// =============================================================================
const MAX_CONCURRENT_EXECUTIONS = 3;
let activeProcessCount = 0;
const executionQueue = [];

function pumpQueue() {
    while (activeProcessCount < MAX_CONCURRENT_EXECUTIONS && executionQueue.length > 0) {
        const item = executionQueue.shift();
        if (!item) break;
        activeProcessCount++;

        Promise.resolve()
            .then(() => item.task())
            .then(item.resolve)
            .catch(item.reject)
            .finally(() => {
                activeProcessCount--;
                pumpQueue();
            });
    }
}

function enqueueExecution(task) {
    return new Promise((resolve, reject) => {
        executionQueue.push({ task, resolve, reject });
        pumpQueue();
    });
}

export function getExecutionQueueStats() {
    return {
        active: activeProcessCount,
        queued: executionQueue.length,
        maxConcurrent: MAX_CONCURRENT_EXECUTIONS,
    };
}

/**
 * Internal single Python process execution with AST check, temp sandbox & 3s timeout.
 */
async function _runPythonProcess(codeOrPayload, rawTestCases = []) {
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

            // Strict 3.2s kill timeout (enforces 3s limit)
            const timer = setTimeout(() => {
                if (settled) return;
                settled = true;
                try {
                    child.kill('SIGKILL');
                } catch {
                    child.kill();
                }
                const executionTimeMs = 3000;
                resolve({
                    isCorrect: false,
                    executionTimeMs,
                    output: '(vaxt limiti aşılıb)',
                    error: 'İcra müddəti limiti aşıldı (Time Limit Exceeded - 3 saniyə). Sonsuz dövr (infinite loop) və ya ağır hesablama aşkar edildi.',
                    totalPassedTests: 0,
                    totalTests: parsedCases.length,
                    testResults: parsedCases.map((tc, idx) => ({
                        testNum: idx + 1,
                        input: tc.isHidden ? '(Gizli Test)' : String(tc.input || ''),
                        expected: tc.isHidden ? '(Gizli Test)' : String(tc.expectedOutput || tc.expected_output || ''),
                        actual: '(vaxt limiti aşılıb)',
                        passed: false,
                        executionTimeMs: 3000,
                        isHidden: Boolean(tc.isHidden),
                    })),
                });
            }, 3500);

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
                    error: `Python işə salına bilmədi: ${err.message}`,
                    totalPassedTests: 0,
                    totalTests: parsedCases.length,
                    testResults: [],
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
                            executionTimeMs: typeof parsed.executionTimeMs === 'number' ? parsed.executionTimeMs : executionTimeMs,
                            output: typeof parsed.output === 'string' ? parsed.output : '(çıxış yoxdur)',
                            error: parsed.error ? String(parsed.error) : null,
                            totalPassedTests: typeof parsed.totalPassedTests === 'number' ? parsed.totalPassedTests : 0,
                            totalTests: typeof parsed.totalTests === 'number' ? parsed.totalTests : parsedCases.length,
                            testResults: Array.isArray(parsed.testResults) ? parsed.testResults : [],
                        });
                        return;
                    } catch {
                        // Output wasn't pure JSON
                    }
                }

                resolve({
                    isCorrect: false,
                    executionTimeMs,
                    output: trimmedOut || '(çıxış yoxdur)',
                    error: stderr.trim() || 'Nəticə oxunarkən xəta baş verdi.',
                    totalPassedTests: 0,
                    totalTests: parsedCases.length,
                    testResults: [],
                });
            });
        });
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
}

/**
 * Executes Python code through the concurrency-limited queue (max 3 simultaneous processes).
 * Handles both function-based LeetCode style and competitive programming stdin/stdout style.
 *
 * @param {string|object} codeOrPayload - The Python source code string, or an object containing code and testCases
 * @param {Array|string} [rawTestCases=[]] - Array of test case objects [{ input, expectedOutput, isHidden }]
 * @returns {Promise<{ isCorrect: boolean, executionTimeMs: number, output: string, error: string|null, testResults: Array }>}
 */
export async function executePythonCode(codeOrPayload, rawTestCases = []) {
    return enqueueExecution(() => _runPythonProcess(codeOrPayload, rawTestCases));
}

export const runPythonCode = executePythonCode;
export const executePython = executePythonCode;
export const executeCode = executePythonCode;
export default executePythonCode;
