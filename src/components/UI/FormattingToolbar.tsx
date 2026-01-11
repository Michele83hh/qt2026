
interface FormattingToolbarProps {
  onInsert: (before: string, after: string, placeholder?: string) => void;
}

export default function FormattingToolbar({ onInsert }: FormattingToolbarProps) {
  const buttons = [
    { label: 'B', title: 'Fett', before: '**', after: '**', placeholder: 'fetter Text' },
    { label: 'I', title: 'Kursiv', before: '*', after: '*', placeholder: 'kursiver Text' },
    { label: '<>', title: 'Code', before: '`', after: '`', placeholder: 'code' },
    { label: '¶', title: 'Absatz', before: '\n\n', after: '', placeholder: '' },
    { label: 'H1', title: 'Überschrift 1', before: '# ', after: '', placeholder: 'Überschrift' },
    { label: 'H2', title: 'Überschrift 2', before: '## ', after: '', placeholder: 'Unterüberschrift' },
    { label: '•', title: 'Liste', before: '- ', after: '', placeholder: 'Listenpunkt' },
  ];

  return (
    <div className="flex gap-1 p-2 bg-gray-100 border-2 border-gray-300 border-b-0 rounded-t-xl">
      {buttons.map((btn, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onInsert(btn.before, btn.after, btn.placeholder)}
          className={`px-3 py-1 rounded-lg font-bold transition-all hover:bg-gray-300 border border-gray-300 hover:border-gray-400 ${
            btn.label === 'B' ? 'font-black' :
            btn.label === 'I' ? 'italic' :
            btn.label === '<>' ? 'font-mono text-sm' :
            ''
          }`}
          title={btn.title}
        >
          {btn.label}
        </button>
      ))}
      <div className="flex-1"></div>
      <div className="text-xs text-gray-500 flex items-center px-2">
        Markdown-Formatierung
      </div>
    </div>
  );
}
