'use client';
import { useState, useEffect } from 'react';
import { agentsApi } from '@/lib/api';
import { Workflow, Plus, Trash2, Play, Settings, Zap, GitBranch, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const STEP_TYPES = [
  { value: 'llm_call', label: 'LLM Call', icon: MessageSquare },
  { value: 'tool_call', label: 'Tool Call', icon: Zap },
  { value: 'condition', label: 'Condition', icon: GitBranch },
  { value: 'handoff', label: 'Handoff', icon: Settings },
  { value: 'notify', label: 'Notify', icon: MessageSquare },
];

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'funnel_stage', label: 'Funnel Stage' },
  { value: 'intent_score', label: 'Intent Score' },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [executing, setExecuting] = useState<string | null>(null);
  const [execResult, setExecResult] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await agentsApi.listWorkflows();
      setWorkflows(res.data || res);
    } catch {
      toast.error('Failed to load workflows');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    try {
      await agentsApi.deleteWorkflow(id);
      toast.success('Workflow deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleExecute = async (id: string) => {
    const msg = prompt('Enter test message for workflow:');
    if (!msg) return;
    setExecuting(id);
    setExecResult(null);
    try {
      const result = await agentsApi.executeWorkflow(id, { userMessage: msg });
      setExecResult(result);
      toast.success('Workflow executed');
    } catch {
      toast.error('Execution failed');
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Workflow className="w-6 h-6 text-primary-600" />
            Workflows
          </h1>
          <p className="text-gray-500 text-sm mt-1">Multi-step agent workflows with LLM calls, tools, conditions, and handoffs</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {showForm && (
        <WorkflowForm
          workflow={editing}
          onSave={async (data) => {
            try {
              if (editing) {
                await agentsApi.updateWorkflow(editing.id, data);
                toast.success('Workflow updated');
              } else {
                await agentsApi.createWorkflow(data);
                toast.success('Workflow created');
              }
              setShowForm(false);
              setEditing(null);
              load();
            } catch {
              toast.error('Failed to save workflow');
            }
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {execResult && (
        <div className="card p-4 mb-4 bg-gray-50">
          <h3 className="font-medium mb-2">Execution Result</h3>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap">{JSON.stringify(execResult, null, 2)}</pre>
          <button onClick={() => setExecResult(null)} className="text-sm text-gray-400 hover:text-gray-600 mt-2">Close</button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Workflow className="w-12 h-12 mx-auto mb-3 opacity-30" />
          No workflows yet. Create one to automate multi-step agent actions.
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf) => (
            <div key={wf.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{wf.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      wf.status === 'active' ? 'bg-green-50 text-green-700' :
                      wf.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-50 text-red-700'
                    }`}>
                      {wf.status}
                    </span>
                  </div>
                  {wf.description && <p className="text-gray-500 text-sm mt-1">{wf.description}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{wf.steps?.length || 0} steps</span>
                    <span>Trigger: {wf.trigger?.type || 'manual'}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleExecute(wf.id)}
                    disabled={executing === wf.id}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg disabled:opacity-50"
                    title="Execute"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setEditing(wf); setShowForm(true); }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(wf.id)}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {wf.steps && wf.steps.length > 0 && (
                <div className="mt-3 flex items-center gap-1 flex-wrap">
                  {wf.steps.map((step: any, i: number) => {
                    const StepIcon = STEP_TYPES.find(t => t.value === step.type)?.icon || Settings;
                    return (
                      <span key={step.id} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded">
                        <StepIcon className="w-3 h-3" />
                        {step.name}
                        {i < wf.steps.length - 1 && <span className="text-gray-300 ml-1">→</span>}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowForm({ workflow, onSave, onCancel }: { workflow: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [triggerType, setTriggerType] = useState(workflow?.trigger?.type || 'manual');
  const [triggerValue, setTriggerValue] = useState(workflow?.trigger?.value || '');
  const [steps, setSteps] = useState<any[]>(workflow?.steps || []);
  const [status, setStatus] = useState(workflow?.status || 'draft');

  const addStep = () => {
    setSteps([...steps, {
      id: `step_${Date.now()}`,
      type: 'llm_call',
      name: `Step ${steps.length + 1}`,
      config: {},
      nextStepId: undefined,
    }]);
  };

  const updateStep = (idx: number, field: string, value: any) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], [field]: value };
    setSteps(updated);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description,
      steps,
      status,
      trigger: { type: triggerType, value: triggerValue || undefined },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 lg:p-6 mb-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" required />
        </div>
        <div>
          <label className="label">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="input" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Trigger Type</label>
          <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className="input">
            {TRIGGER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        {triggerType !== 'manual' && (
          <div>
            <label className="label">Trigger Value {triggerType === 'keyword' ? '(keyword to match)' : triggerType === 'funnel_stage' ? '(awareness, interest, etc.)' : '(threshold number)'}</label>
            <input value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} className="input" />
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label">Steps</label>
          <button type="button" onClick={addStep} className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add Step
          </button>
        </div>
        {steps.map((step, idx) => (
          <div key={step.id} className="border border-gray-200 rounded-lg p-3 mb-2 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={step.name}
                onChange={(e) => updateStep(idx, 'name', e.target.value)}
                className="input flex-1"
                placeholder="Step name"
              />
              <select
                value={step.type}
                onChange={(e) => updateStep(idx, 'type', e.target.value)}
                className="input w-full sm:w-40"
              >
                {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button type="button" onClick={() => removeStep(idx)} className="text-red-400 hover:text-red-600 p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {step.type === 'llm_call' && (
              <textarea
                value={step.config.prompt || ''}
                onChange={(e) => updateStep(idx, 'config', { ...step.config, prompt: e.target.value })}
                className="input"
                placeholder="System prompt for this step"
                rows={2}
              />
            )}
            {step.type === 'tool_call' && (
              <input
                value={step.config.toolName || ''}
                onChange={(e) => updateStep(idx, 'config', { ...step.config, toolName: e.target.value })}
                className="input"
                placeholder="Tool name (e.g. web_search, calculator)"
              />
            )}
            {step.type === 'condition' && (
              <input
                value={step.config.condition || ''}
                onChange={(e) => updateStep(idx, 'config', { ...step.config, condition: e.target.value })}
                className="input"
                placeholder="Condition (e.g. contains:pricing, intent_score>50)"
              />
            )}
            {step.type === 'handoff' && (
              <input
                value={step.config.message || ''}
                onChange={(e) => updateStep(idx, 'config', { ...step.config, message: e.target.value })}
                className="input"
                placeholder="Handoff message"
              />
            )}
            {step.type === 'notify' && (
              <input
                value={step.config.message || ''}
                onChange={(e) => updateStep(idx, 'config', { ...step.config, message: e.target.value })}
                className="input"
                placeholder="Notification message"
              />
            )}
          </div>
        ))}
        {steps.length === 0 && <p className="text-sm text-gray-400">No steps yet. Add steps to build your workflow.</p>}
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary">Save Workflow</button>
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </form>
  );
}
