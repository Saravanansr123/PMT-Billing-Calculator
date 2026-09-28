import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, Sliders, Layers, Clock, ShieldCheck, RefreshCw } from 'lucide-react';
import { TaskMappingConfig, HcRuleConfig, ValidationSettings } from '../../types';

interface ConfigurationTabProps {
  taskMappings: TaskMappingConfig[];
  onUpdateMappings: (mappings: TaskMappingConfig[]) => void;
  hcRules: HcRuleConfig[];
  onUpdateHcRules: (rules: HcRuleConfig[]) => void;
  settings: ValidationSettings;
  onUpdateSettings: (settings: ValidationSettings) => void;
  onResetDefaults: () => void;
}

export const ConfigurationTab: React.FC<ConfigurationTabProps> = ({
  taskMappings,
  onUpdateMappings,
  hcRules,
  onUpdateHcRules,
  settings,
  onUpdateSettings,
  onResetDefaults,
}) => {
  const [activeSection, setActiveSection] = useState<'mappings' | 'hc' | 'settings'>('mappings');

  // New mapping form state
  const [newPattern, setNewPattern] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState<'Billable' | 'Non-Billable'>('Billable');

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPattern.trim() || !newCategory.trim()) return;

    const newMap: TaskMappingConfig = {
      id: `map-${Date.now()}`,
      pattern: newPattern.trim(),
      normalizedName: newCategory.trim(),
      billingCategory: newCategory.trim(),
      billableType: newType,
      enabled: true,
    };

    onUpdateMappings([...taskMappings, newMap]);
    setNewPattern('');
    setNewCategory('');
  };

  const handleToggleMapping = (id: string) => {
    onUpdateMappings(
      taskMappings.map((m) => (m.id === id ? { ...m, enabled: !m.enabled } : m))
    );
  };

  const handleDeleteMapping = (id: string) => {
    onUpdateMappings(taskMappings.filter((m) => m.id !== id));
  };

  const handleHcRuleChange = (id: string, field: 'minHours' | 'maxHours' | 'hcValue', val: number) => {
    onUpdateHcRules(
      hcRules.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Sub Navigation */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveSection('mappings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'mappings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Task Category Mappings ({taskMappings.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('hc')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'hc'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Headcount (HC) Rules ({hcRules.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'settings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Tolerances & Settings</span>
          </button>
        </div>

        <button
          onClick={onResetDefaults}
          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
          title="Reset to default task mappings and HC rules"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Defaults</span>
        </button>
      </div>

      {/* 1. TASK CATEGORY MAPPING EDITOR */}
      {activeSection === 'mappings' && (
        <div className="space-y-6">
          
          {/* Add Mapping Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" /> Add Custom Task Mapping Rule
            </h4>
            
            <form onSubmit={handleAddMapping} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Task Name Pattern
                </label>
                <input
                  type="text"
                  placeholder="e.g. Initial Annotation - Billable"
                  value={newPattern}
                  onChange={(e) => setNewPattern(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Billing Category Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Initial Annotation Billable"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'Billable' | 'Non-Billable')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Billable">Billable</option>
                  <option value="Non-Billable">Non-Billable</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-xs cursor-pointer"
                >
                  + Add Mapping Rule
                </button>
              </div>
            </form>
          </div>

          {/* Mappings Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Source Task Pattern</th>
                    <th className="p-3.5">Mapped Billing Category</th>
                    <th className="p-3.5 text-center">Type</th>
                    <th className="p-3.5 text-center">Enabled</th>
                    <th className="p-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {taskMappings.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono font-medium text-slate-900">{m.pattern}</td>
                      <td className="p-3.5 font-semibold text-slate-900">{m.billingCategory}</td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            m.billableType === 'Billable'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.billableType}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={m.enabled}
                          onChange={() => handleToggleMapping(m.id)}
                          className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleDeleteMapping(m.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 2. HC CALCULATION RULES EDITOR */}
      {activeSection === 'hc' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Employee Task Duration → Headcount (HC) Rules</h3>
            <p className="text-xs text-slate-500 mt-1">
              Calculates HC equivalent per employee task log per day before project-level aggregation. Edit thresholds below.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hcRules.map((rule) => (
              <div key={rule.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center font-bold text-xs text-slate-900">
                  <span>{rule.label}</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono rounded-full text-[11px]">
                    {rule.hcValue} HC
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold">Min Hours</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.minHours}
                      onChange={(e) => handleHcRuleChange(rule.id, 'minHours', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold">Max Hours</label>
                    <input
                      type="number"
                      step="0.1"
                      value={rule.maxHours}
                      onChange={(e) => handleHcRuleChange(rule.id, 'maxHours', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-semibold">Assigned HC</label>
                    <input
                      type="number"
                      step="0.05"
                      value={rule.hcValue}
                      onChange={(e) => handleHcRuleChange(rule.id, 'hcValue', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono font-bold text-emerald-800 outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TOLERANCE & VALIDATION SETTINGS */}
      {activeSection === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Reconciliation Precision & Control Settings</h3>
            <p className="text-xs text-slate-500 mt-1">Configure evaluation tolerances and unapproved record inclusion rules.</p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Tolerance Selector */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="block font-bold text-slate-900">
                Headcount (HC) Matching Tolerance
              </label>
              <p className="text-slate-500 text-[11px]">
                Acceptable decimal margin between Expected HC and Reported HC before flagging MISMATCH.
              </p>
              <select
                value={settings.tolerance}
                onChange={(e) => onUpdateSettings({ ...settings, tolerance: parseFloat(e.target.value) })}
                className="px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 outline-none cursor-pointer font-bold"
              >
                <option value={0.0}>0.00 (Exact Match Required - Default)</option>
                <option value={0.01}>± 0.01 HC Tolerance</option>
                <option value={0.05}>± 0.05 HC Tolerance</option>
                <option value={0.1}>± 0.10 HC Tolerance</option>
              </select>
            </div>

            {/* Unapproved Toggle */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
              <div>
                <label className="block font-bold text-slate-900">
                  Include Unapproved Task Entries in Calculation
                </label>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Default: Include unapproved entries in total hours but flag them under Data Quality.
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.includeUnapproved}
                onChange={(e) => onUpdateSettings({ ...settings, includeUnapproved: e.target.checked })}
                className="w-5 h-5 text-emerald-600 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
