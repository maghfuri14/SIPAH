import React, { useEffect, useRef, useState } from 'react';
import { Search, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';

interface SearchResult {
  type: 'santri' | 'kas';
  id: string;
  title: string;
  subtitle: string;
  path: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setResults([]);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get<{ success: boolean; data: SearchResult[] }>('/search', {
          params: { q: query.trim() },
        });
        setResults(data.data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const selectResult = (result: SearchResult) => {
    onClose();
    navigate(result.path);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama santri, NIS, atau keterangan kas..."
            className="h-14 flex-1 outline-none text-sm text-slate-800"
          />
          <kbd className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading && <p className="px-3 py-4 text-sm text-slate-500">Mencari...</p>}
          {!isLoading && query.trim().length >= 2 && results.length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-500">Tidak ada hasil ditemukan.</p>
          )}
          {!isLoading && results.map((result) => (
            <button
              type="button"
              key={`${result.type}-${result.id}`}
              onClick={() => selectResult(result)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left hover:bg-emerald-50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                {result.type === 'santri' ? <Users className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-800">{result.title}</span>
                <span className="block text-xs text-slate-500">{result.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
