'use client';
import { useState, useEffect } from 'react';
import { agentsApi } from '@/lib/api';
import { Brain, Search, Trash2, Plus, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function MemoryPage() {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('visitor');
  const [scopeId, setScopeId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newMemory, setNewMemory] = useState({ key: '', value: '', importance: 1 });

  const load = async () => {
    if (!scopeId.trim()) {
      setMemories([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await agentsApi.recall({ scope, scopeId });
      setMemories(data || []);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [scope, scopeId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scopeId.trim() || !newMemory.key || !newMemory.value) return;
    try {
      await agentsApi.remember({ scope, scopeId, ...newMemory });
      toast.success('Memory stored');
      setShowAdd(false);
      setNewMemory({ key: '', value: '', importance: 1 });
      load();
    } catch {
      toast.error('Failed to store memory');
    }
  };

  const handleForget = async (key?: string) => {
    if (!confirm(key ? `Delete memory "${key}"?` : 'Delete all memories for this scope?')) return;
    try {
      await agentsApi.forget(scope, scopeId, key);
      toast.success('Memory deleted');
      load();
    } catch {
      toast.error('Failed to delete memory');
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600" />
            Agent Memory
          </h1>
          <p className="text-gray-500 text-sm mt-1">Persistent key-value memory store for visitors and leads</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <select value={scope} onChange={(e) => setScope(e.target.value)} className="input w-40">
          <option value="visitor">Visitor</option>
          <option value="lead">Lead</option>
          <option value="tenant">Tenant</option>
        </select>
        <input
          type="text"
          placeholder="Scope ID (visitor ID or lead ID)"
          value={scopeId}
          onChange={(e) => setScopeId(e.target.value)}
          className="input flex-1"
        />
        <button onClick={load} className="btn-secondary flex items-center gap-2">
          <Search className="w-4 h-4" /> Search
        </button>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card p-4 mb-4 space-y-3">
          <input
            type="text"
            placeholder="Key (e.g. name, email, budget)"
            value={newMemory.key}
            onChange={(e) => setNewMemory({ ...newMemory, key: e.target.value })}
            className="input"
            required
          />
          <input
            type="text"
            placeholder="Value"
            value={newMemory.value}
            onChange={(e) => setNewMemory({ ...newMemory, value: e.target.value })}
            className="input"
            required
          />
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            placeholder="Importance (0-2)"
            value={newMemory.importance}
            onChange={(e) => setNewMemory({ ...newMemory, importance: parseFloat(e.target.value) || 1 })}
            className="input w-40"
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">Save</button>
            <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {scopeId ? 'No memories found for this scope ID' : 'Enter a scope ID to search memories'}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">{memories.length} memories</span>
            <button onClick={() => handleForget()} className="text-red-500 text-sm hover:underline">Delete all</button>
          </div>
          {memories.map((mem) => (
            <div key={mem.id} className="card p-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{mem.key}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                    {mem.importance.toFixed(1)}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mt-1">{mem.value}</p>
                <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(mem.updatedAt).toLocaleString()}
                </p>
              </div>
              <button onClick={() => handleForget(mem.key)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
