import { useRef, useEffect, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  minHeight?: string;
  showPreview?: boolean;
  previewLabel?: string;
}

/**
 * Sanitize HTML - only allow safe tags, remove all attributes except href
 */
function sanitizeHtml(html: string): string {
  // Allowed tags that we want to keep
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'h3', 'h4'];

  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Recursively clean nodes
  function cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode();
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      // Convert div to p (common paste issue)
      const effectiveTag = tagName === 'div' ? 'p' : tagName;

      // If not allowed, just return the text content
      if (!allowedTags.includes(effectiveTag)) {
        // For span, font, etc. - keep the content but not the tag
        const fragment = document.createDocumentFragment();
        element.childNodes.forEach(child => {
          const cleaned = cleanNode(child);
          if (cleaned) fragment.appendChild(cleaned);
        });
        return fragment;
      }

      // Create clean element without attributes
      const cleanElement = document.createElement(effectiveTag);

      // Recursively clean children
      element.childNodes.forEach(child => {
        const cleaned = cleanNode(child);
        if (cleaned) cleanElement.appendChild(cleaned);
      });

      return cleanElement;
    }

    return null;
  }

  const result = document.createElement('div');
  temp.childNodes.forEach(child => {
    const cleaned = cleanNode(child);
    if (cleaned) result.appendChild(cleaned);
  });

  return result.innerHTML;
}

/**
 * Convert plain text to simple HTML (preserving line breaks)
 */
function plainTextToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('<br>');
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  label,
  required = false,
  minHeight = '120px',
  showPreview = true,
  previewLabel = 'Vorschau (so sieht es im Exam aus)'
}: RichTextEditorProps) {
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const [formatStates, setFormatStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    insertUnorderedList: false,
    insertOrderedList: false
  });

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const updateFormatStates = () => {
    setFormatStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList')
    });
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateFormatStates();
  };

  const handleSelectionChange = () => {
    // Check if selection is within our editor
    const selection = window.getSelection();
    if (selection && editorRef.current?.contains(selection.anchorNode)) {
      updateFormatStates();
    }
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  /**
   * Handle paste - sanitize incoming HTML/text
   */
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    let pastedContent = '';

    // Try to get HTML first, then fall back to plain text
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');

    if (htmlData) {
      // Sanitize HTML
      pastedContent = sanitizeHtml(htmlData);
    } else if (textData) {
      // Convert plain text to HTML
      pastedContent = plainTextToHtml(textData);
    }

    // Insert at cursor position
    document.execCommand('insertHTML', false, pastedContent);
    handleInput();
  };

  return (
    <div className="mb-6">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label} {required && '*'}
        </label>
      )}

      {/* Toolbar */}
      <div className="flex gap-1 p-2 bg-gray-100 border-2 border-gray-300 border-b-0 rounded-t-xl flex-wrap">
        <button
          type="button"
          onClick={() => execCommand('bold')}
          className={`px-3 py-1 rounded-lg font-bold transition-all border ${
            formatStates.bold
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'hover:bg-gray-300 border-gray-300 hover:border-gray-400'
          }`}
          title="Fett (Strg+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand('italic')}
          className={`px-3 py-1 rounded-lg italic transition-all border ${
            formatStates.italic
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'hover:bg-gray-300 border-gray-300 hover:border-gray-400'
          }`}
          title="Kursiv (Strg+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand('underline')}
          className={`px-3 py-1 rounded-lg underline transition-all border ${
            formatStates.underline
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'hover:bg-gray-300 border-gray-300 hover:border-gray-400'
          }`}
          title="Unterstrichen (Strg+U)"
        >
          U
        </button>
        <div className="w-px bg-gray-400 mx-1"></div>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h3')}
          className="px-3 py-1 rounded-lg font-bold transition-all hover:bg-gray-300 border border-gray-300 hover:border-gray-400"
          title="Überschrift"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'h4')}
          className="px-3 py-1 rounded-lg font-bold transition-all hover:bg-gray-300 border border-gray-300 hover:border-gray-400"
          title="Unterüberschrift"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => execCommand('formatBlock', 'p')}
          className="px-3 py-1 rounded-lg transition-all hover:bg-gray-300 border border-gray-300 hover:border-gray-400"
          title="Normal"
        >
          P
        </button>
        <div className="w-px bg-gray-400 mx-1"></div>
        <button
          type="button"
          onClick={() => execCommand('insertUnorderedList')}
          className={`px-3 py-1 rounded-lg transition-all border ${
            formatStates.insertUnorderedList
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'hover:bg-gray-300 border-gray-300 hover:border-gray-400'
          }`}
          title="Aufzählungsliste (klicken um zu starten/beenden)"
        >
          • Liste
        </button>
        <button
          type="button"
          onClick={() => execCommand('insertOrderedList')}
          className={`px-3 py-1 rounded-lg transition-all border ${
            formatStates.insertOrderedList
              ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
              : 'hover:bg-gray-300 border-gray-300 hover:border-gray-400'
          }`}
          title="Nummerierte Liste (klicken um zu starten/beenden)"
        >
          1. Liste
        </button>
        <div className="flex-1"></div>
        <button
          type="button"
          onClick={() => execCommand('removeFormat')}
          className="px-3 py-1 rounded-lg transition-all hover:bg-red-200 border border-gray-300 hover:border-red-400 text-red-600"
          title="Formatierung entfernen"
        >
          ✕ Format löschen
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full px-4 py-3 border-2 border-gray-300 border-t-0 rounded-b-xl focus:border-green-500 focus:outline-none resize-none overflow-y-auto"
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] {
          outline: none;
        }
        [contenteditable]:focus {
          border-color: #10b981;
        }
        [contenteditable] h3 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        [contenteditable] h4 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] ul {
          margin: 0.5rem 0;
          padding-left: 2rem;
          list-style-type: disc;
          list-style-position: outside;
        }
        [contenteditable] ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
          list-style-type: decimal;
          list-style-position: outside;
        }
        [contenteditable] ul li {
          margin: 0.25rem 0;
          display: list-item;
          list-style-type: disc;
        }
        [contenteditable] ol li {
          margin: 0.25rem 0;
          display: list-item;
          list-style-type: decimal;
        }
        [contenteditable] b, [contenteditable] strong {
          font-weight: bold;
        }
        [contenteditable] i, [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] u {
          text-decoration: underline;
        }
        .exam-preview h3 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        .exam-preview h4 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 0.5rem 0;
        }
        .exam-preview p {
          margin: 0.5rem 0;
        }
        .exam-preview ul {
          margin: 0.5rem 0;
          padding-left: 2rem;
          list-style-type: disc;
        }
        .exam-preview ol {
          margin: 0.5rem 0;
          padding-left: 2rem;
          list-style-type: decimal;
        }
        .exam-preview li {
          margin: 0.25rem 0;
        }
        .exam-preview b, .exam-preview strong {
          font-weight: bold;
        }
        .exam-preview i, .exam-preview em {
          font-style: italic;
        }
        .exam-preview u {
          text-decoration: underline;
        }
      `}</style>

      {/* Live Preview - exactly like in exam */}
      {showPreview && value && value.trim() !== '' && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors mb-2"
          >
            <span className={`transform transition-transform ${isPreviewExpanded ? 'rotate-90' : ''}`}>▶</span>
            {previewLabel}
          </button>
          {isPreviewExpanded && (
            <div className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-inner">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  EXAM PREVIEW
                </span>
                <span className="text-xs text-gray-500">Genau so wird es im Exam angezeigt</span>
              </div>
              <div
                className="exam-preview text-lg font-semibold text-gray-900 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: value }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
