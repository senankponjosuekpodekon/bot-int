'use client';
import { useState, useEffect } from 'react';
import { Code2, Copy, Check, ExternalLink, Settings as SettingsIcon } from 'lucide-react';
import { agentsApi } from '@/lib/api';

export default function WidgetConfigPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [customColor, setCustomColor] = useState('#4f46e5');
  const [customTitle, setCustomTitle] = useState('Chat IA');
  const [position, setPosition] = useState('bottom-right');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    agentsApi.list().then((data) => {
      setAgents(data);
      if (data.length > 0) setSelectedAgent(data[0].id);
    }).catch(() => {});
  }, []);

  const apiUrl = typeof window !== 'undefined' ? `${window.location.origin.replace(/:\d+$/, ':3001')}/api` : 'http://localhost:3001/api';

  const embedCode = selectedAgent
    ? `<script src="${apiUrl}/widget/embed.js"
  data-agent="${selectedAgent}"
  data-color="${customColor}"
  data-title="${customTitle}"
  data-position="${position}"
  data-api="${apiUrl}">
</script>`
    : '<!-- Sélectionnez un agent -->';

  const wordpressShortcode = selectedAgent
    ? `[stiamond_chat agent_id="${selectedAgent}" color="${customColor}" title="${customTitle}"]`
    : '[stiamond_chat]';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Code2 className="w-6 h-6 text-primary-600" /> Widget & Intégration
        </h1>
        <p className="text-sm text-gray-500 mt-1">Intégrez le chat IA sur n'importe quel site en une ligne de code</p>
      </div>

      {/* Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Agent</label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
              {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Titre du widget</label>
            <input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Couleur</label>
            <div className="flex items-center gap-2 mt-1">
              <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="w-12 h-10 rounded-lg border border-gray-300 cursor-pointer" />
              <input value={customColor} onChange={(e) => setCustomColor(e.target.value)} className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm">
              <option value="bottom-right">Bas droite</option>
              <option value="bottom-left">Bas gauche</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Aperçu</h2>
        <div className="bg-gray-100 rounded-lg p-4 lg:p-8 relative h-48 flex items-center justify-center">
          <p className="text-gray-400 text-sm">Aperçu de votre site</p>
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <div className="bg-white rounded-lg shadow-lg p-3 max-w-[200px]">
              <p className="text-xs text-gray-700">{customTitle}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-lg" style={{ background: customColor }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Embed code */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Code d'intégration (HTML)</h2>
          <button onClick={() => copyToClipboard(embedCode)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100">
            {copied ? <><Check className="w-3 h-3" /> Copié</> : <><Copy className="w-3 h-3" /> Copier</>}
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{embedCode}</code></pre>
        <p className="text-xs text-gray-400 mt-2">Ajoutez ce code avant la balise <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> de votre site.</p>
      </div>

      {/* WordPress shortcode */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Shortcode WordPress</h2>
          <button onClick={() => copyToClipboard(wordpressShortcode)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100">
            <Copy className="w-3 h-3" /> Copier
          </button>
        </div>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto"><code>{wordpressShortcode}</code></pre>
        <p className="text-xs text-gray-400 mt-2">Ajoutez ce shortcode dans n'importe quelle page ou article WordPress.</p>
      </div>

      {/* API endpoints */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Endpoints API publique</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-green-100 text-green-700">GET</span>
            <code className="text-xs text-gray-700">{apiUrl}/widget/embed.js</code>
            <span className="text-xs text-gray-400">— Script du widget</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700">GET</span>
            <code className="text-xs text-gray-700">{apiUrl}/widget/config/:agentId</code>
            <span className="text-xs text-gray-400">— Config de l'agent</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-orange-100 text-orange-700">POST</span>
            <code className="text-xs text-gray-700">{apiUrl}/widget/send</code>
            <span className="text-xs text-gray-400">— Envoyer un message</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700">GET</span>
            <code className="text-xs text-gray-700">{apiUrl}/widget/history/:conversationId</code>
            <span className="text-xs text-gray-400">— Historique visiteur</span>
          </div>
        </div>
      </div>
    </div>
  );
}
