import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-xs">
      <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 text-[#059669]">
        <Construction className="w-8 h-8 shrink-0" />
      </div>
      <h1 className="text-2xl font-bold text-[#0F172A] mb-2">{title}</h1>
      <p className="text-sm text-slate-500 max-w-sm">
        Modul ini sedang dalam pengembangan. Akan tersedia di langkah berikutnya.
      </p>
    </div>
  );
};

export default PlaceholderPage;
