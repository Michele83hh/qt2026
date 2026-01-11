import { useRef } from 'react';
import FormattingToolbar from './FormattingToolbar';

interface FormattedTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  required?: boolean;
}

export default function FormattedTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  label,
  required = false
}: FormattedTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsert = (before: string, after: string, placeholder: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || placeholder;

    const newText =
      value.substring(0, start) +
      before +
      textToInsert +
      after +
      value.substring(end);

    onChange(newText);

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + textToInsert.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className="mb-6">
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">
          {label} {required && '*'}
        </label>
      )}
      <div>
        <FormattingToolbar onInsert={handleInsert} />
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-300 border-t-0 rounded-b-xl focus:border-green-500 focus:outline-none resize-none font-mono text-sm"
          rows={rows}
          placeholder={placeholder}
        />
      </div>
      {value && (
        <div className="mt-3 p-4 bg-gray-50 border-2 border-gray-300 rounded-xl">
          <div className="text-xs font-bold text-gray-500 mb-2">Vorschau:</div>
          <div className="prose prose-sm max-w-none">
            <FormattedTextPreview text={value} />
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Markdown-like preview component
function FormattedTextPreview({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        // Heading 1
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-black text-gray-900">{formatInline(line.substring(2))}</h1>;
        }
        // Heading 2
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold text-gray-800">{formatInline(line.substring(3))}</h2>;
        }
        // List item
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="ml-4 text-gray-700">
              {formatInline(line.substring(2))}
            </li>
          );
        }
        // Empty line
        if (line.trim() === '') {
          return <br key={index} />;
        }
        // Normal paragraph
        return <p key={index} className="text-gray-700">{formatInline(line)}</p>;
      })}
    </div>
  );
}

function formatInline(text: string) {
  // Bold: **text**
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic: *text*
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code: `text`
  text = text.replace(/`(.+?)`/g, '<code class="bg-gray-200 px-1 rounded font-mono text-sm">$1</code>');

  return <span dangerouslySetInnerHTML={{ __html: text }} />;
}
