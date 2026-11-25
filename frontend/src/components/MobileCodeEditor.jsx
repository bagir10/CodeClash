import React, { useRef, useEffect } from 'react';
import { RotateCcw, Code2 } from 'lucide-react';

const SYMBOL_CHIPS = ['Tab', ':', '(', ')', '[', ']', '{', '}', '_', '"', "'", '=', '#', 'def', 'return'];

export default function MobileCodeEditor({
  value = '',
  onChange,
  onReset,
  activeQuestionIndex = 0,
}) {
  const textareaRef = useRef(null);
  const gutterRef = useRef(null);

  // Sync gutter vertical scroll with textarea
  const handleScroll = (e) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Keyboard navigation & smart auto-indent
  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentVal } = textarea;

    // 1. Tab Key: Insert 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const before = currentVal.substring(0, selectionStart);
      const after = currentVal.substring(selectionEnd);
      const nextVal = before + '    ' + after;
      onChange?.(nextVal);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      });
      return;
    }

    // 2. Enter Key: Smart Python auto-indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      const before = currentVal.substring(0, selectionStart);
      const after = currentVal.substring(selectionEnd);

      const lastNewline = before.lastIndexOf('\n');
      const currentLine = lastNewline === -1 ? before : before.substring(lastNewline + 1);

      // Get leading whitespace
      const indentMatch = currentLine.match(/^(\s*)/);
      let indent = indentMatch ? indentMatch[1] : '';

      // If line ends with colon ':', add 4 extra spaces
      if (currentLine.trimEnd().endsWith(':')) {
        indent += '    ';
      }

      const insertText = '\n' + indent;
      const nextVal = before + insertText + after;
      onChange?.(nextVal);

      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + insertText.length;
      });
      return;
    }
  };

  // Quick Symbol Insertion from Helper Bar
  const handleInsertSymbol = (sym) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const { selectionStart, selectionEnd, value: currentVal } = textarea;
    const before = currentVal.substring(0, selectionStart);
    const after = currentVal.substring(selectionEnd);

    let textToInsert = sym;
    let cursorOffset = sym.length;

    if (sym === 'Tab') {
      textToInsert = '    ';
      cursorOffset = 4;
    }

    const nextVal = before + textToInsert + after;
    onChange?.(nextVal);

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = selectionStart + cursorOffset;
    });
  };

  const lines = (value || '').split('\n');
  const lineCount = Math.max(lines.length, 16);

  return (
    <div className="flex flex-col h-full w-full bg-[#0d1117] overflow-hidden border border-gray-800 rounded-xl shadow-inner">
      {/* Top Header Bar */}
      <div className="h-9 bg-[#161b22] px-3 flex items-center justify-between border-b border-gray-800 shrink-0">
        <div className="flex items-center space-x-2">
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-mono text-gray-300 font-semibold">
            solution_{activeQuestionIndex + 1}.py
          </span>
        </div>

        <button
          type="button"
          onClick={onReset}
          title="Başlanğıc koda geri qaytar"
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-[11px] font-mono transition-all active:scale-95"
        >
          <RotateCcw className="w-3 h-3 text-cyan-400" />
          <span>Kodu Sıfırla</span>
        </button>
      </div>

      {/* Mobile Symbol Helper Bar above virtual keyboard */}
      <div className="bg-[#111827] px-2 py-1.5 border-b border-gray-800 flex items-center space-x-1.5 overflow-x-auto scrollbar-none shrink-0 select-none">
        <span className="text-[10px] font-mono text-gray-500 uppercase px-1 shrink-0 font-bold">
          Sürətli:
        </span>
        {SYMBOL_CHIPS.map((sym) => (
          <button
            key={sym}
            type="button"
            onClick={() => handleInsertSymbol(sym)}
            className="px-2.5 py-1 rounded-lg bg-gray-800/90 hover:bg-gray-700 active:bg-cyan-900 border border-gray-700 text-xs font-mono text-cyan-300 font-bold shrink-0 transition-all active:scale-95 shadow-sm"
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Editor Body: Line numbers + Textarea */}
      <div className="flex-1 flex overflow-hidden relative min-h-[340px]">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="w-10 select-none py-3 pr-2 text-right font-mono text-xs text-gray-500 bg-[#090d14] border-r border-gray-800/80 overflow-hidden shrink-0"
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Python Code Input Area */}
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          spellCheck={false}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          placeholder="# Python 3 həllinizi buraya yazın..."
          className="flex-1 w-full bg-[#0d1117] text-slate-100 font-mono text-xs sm:text-sm leading-6 p-3 outline-none resize-none overflow-y-auto whitespace-pre select-text focus:ring-0"
          style={{
            tabSize: 4,
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          }}
        />
      </div>
    </div>
  );
}
