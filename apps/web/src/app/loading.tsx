import { Sparkles } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
      <div className="relative flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-200 animate-pulse">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-gray-900 tracking-tight">Stiamond</h1>
        <p className="mt-2 text-sm text-gray-500">Chargement de ton espace...</p>
        <div className="mt-8 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full animate-[shimmer_1.2s_infinite]" style={{ width: '40%' }} />
        </div>
      </div>
    </div>
  );
}
