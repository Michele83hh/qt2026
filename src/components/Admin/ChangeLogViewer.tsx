import { useState, useEffect } from 'react';
import { ChangeLogEntry } from '../../types/ChangeLog';
import {
  getRecentEntries,
  getEntriesByType,
  formatTimestamp,
  getChangeLogStats,
  clearChangeLog
} from '../../utils/changeLogUtils';
import { confirm as customConfirm } from '../../store/notificationStore';

interface ChangeLogViewerProps {
  onClose: () => void;
}

export default function ChangeLogViewer({ onClose }: ChangeLogViewerProps) {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'add' | 'edit' | 'delete'>('all');
  const [stats, setStats] = useState({
    total: 0,
    added: 0,
    edited: 0,
    deleted: 0,
    last7Days: 0,
    last30Days: 0
  });

  useEffect(() => {
    loadEntries();
  }, [filter]);

  const loadEntries = () => {
    if (filter === 'all') {
      setEntries(getRecentEntries(100));
    } else {
      setEntries(getEntriesByType(filter, 100));
    }
    setStats(getChangeLogStats());
  };

  const handleClearLog = () => {
    customConfirm(
      'Alle Einträge im Änderungsprotokoll werden permanent gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.',
      () => {
        clearChangeLog();
        loadEntries();
      },
      {
        title: 'Änderungsprotokoll löschen?',
        type: 'danger',
        confirmText: 'Löschen',
        cancelText: 'Abbrechen'
      }
    );
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'add': return '➕';
      case 'edit': return '✏️';
      case 'delete': return '🗑️';
      default: return '📝';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'add': return 'Hinzugefügt';
      case 'edit': return 'Bearbeitet';
      case 'delete': return 'Gelöscht';
      default: return 'Unbekannt';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'add': return 'bg-green-500 border-green-600';
      case 'edit': return 'bg-blue-500 border-blue-600';
      case 'delete': return 'bg-red-500 border-red-600';
      default: return 'bg-gray-500 border-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] flex flex-col border-2 border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-3xl font-black text-white mb-1">Änderungsprotokoll</h2>
            <p className="text-gray-400 text-sm">Letzte {stats.total} Änderungen (max. 100 Einträge)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-gray-700 overflow-x-auto">
          <div className="grid grid-cols-5 gap-4 min-w-max">
            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 text-center min-w-[120px]">
              <div className="text-2xl font-black text-white mb-1">{stats.total}</div>
              <div className="text-gray-300 text-xs whitespace-nowrap">Gesamt</div>
            </div>

            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 text-center min-w-[120px]">
              <div className="text-2xl font-black text-green-400 mb-1">{stats.added}</div>
              <div className="text-gray-300 text-xs whitespace-nowrap">Hinzugefügt</div>
            </div>

            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 text-center min-w-[120px]">
              <div className="text-2xl font-black text-blue-400 mb-1">{stats.edited}</div>
              <div className="text-gray-300 text-xs whitespace-nowrap">Bearbeitet</div>
            </div>

            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 text-center min-w-[120px]">
              <div className="text-2xl font-black text-red-400 mb-1">{stats.deleted}</div>
              <div className="text-gray-300 text-xs whitespace-nowrap">Gelöscht</div>
            </div>

            <div className="bg-gray-700 rounded-xl p-4 border border-gray-600 text-center min-w-[120px]">
              <div className="text-2xl font-black text-purple-400 mb-1">{stats.last7Days}</div>
              <div className="text-gray-300 text-xs whitespace-nowrap">Letzte 7 Tage</div>
            </div>
          </div>
        </div>

        {/* Filter & Actions */}
        <div className="flex items-center justify-between gap-4 p-6 border-b border-gray-700 overflow-x-auto">
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
                filter === 'all'
                  ? 'bg-white text-gray-900 border-white'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              Alle
            </button>
            <button
              onClick={() => setFilter('add')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
                filter === 'add'
                  ? 'bg-green-500 text-white border-green-600'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              ➕ Hinzugefügt
            </button>
            <button
              onClick={() => setFilter('edit')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
                filter === 'edit'
                  ? 'bg-blue-500 text-white border-blue-600'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              ✏️ Bearbeitet
            </button>
            <button
              onClick={() => setFilter('delete')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors border ${
                filter === 'delete'
                  ? 'bg-red-500 text-white border-red-600'
                  : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
              }`}
            >
              🗑️ Gelöscht
            </button>
          </div>

          <button
            onClick={handleClearLog}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors border border-red-700 flex-shrink-0 whitespace-nowrap"
          >
            Protokoll löschen
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-6">
          {entries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-400 text-lg">Keine Einträge gefunden</p>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-gray-700 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="text-3xl flex-shrink-0">
                      {getTypeIcon(entry.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-white text-xs font-bold rounded-lg border ${getTypeBadgeColor(entry.type)}`}>
                          {getTypeLabel(entry.type)}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-white font-semibold">ID:</span>{' '}
                        <span className="text-blue-400 font-mono text-sm">{entry.questionId}</span>
                      </div>

                      <div className="mb-2">
                        <span className="text-white font-semibold">Kategorie:</span>{' '}
                        <span className="text-gray-300">{entry.category}</span>
                      </div>

                      <div className="text-gray-300 text-sm mb-2 line-clamp-2">
                        {entry.questionText}
                        {entry.questionText.length >= 100 && '...'}
                      </div>

                      {entry.changes && (
                        <div className="mt-2 p-2 bg-gray-800 rounded-lg border border-gray-600">
                          <span className="text-gray-400 text-xs">{entry.changes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors border border-gray-600"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
