/** @license SPDX-License-Identifier: Apache-2.0 */
import React from 'react';
import { GameSettings, GraphicsQuality } from '../types/game';
import { X, Monitor, Volume2, SlidersHorizontal, Flame, Shield } from 'lucide-react';
import { soundManager } from '../audio/soundManager';

interface Props {
  settings: GameSettings;
  flameSkin: 'azure' | 'solar';
  onEquipAzure: () => void;
  onUpdateSettings: (value: GameSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<Props> = ({ settings, flameSkin, onEquipAzure, onUpdateSettings, onClose }) => {
  const set = (patch: Partial<GameSettings>) => onUpdateSettings({ ...settings, ...patch });
  const quality: GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];
  const updateButton = (id: 'attack' | 'ward', patch: { size?: number; opacity?: number }) => {
    const buttons = { ...settings.controlsLayout.buttons, [id]: { ...settings.controlsLayout.buttons[id], ...patch } };
    set({ controlsLayout: { ...settings.controlsLayout, buttons } });
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
    <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-400/30 bg-slate-950 p-5 text-white shadow-2xl">
      <header className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
        <div><h2 className="text-xl font-black text-cyan-200">Settings</h2><p className="text-xs text-slate-400">Customize your game experience</p></div>
        <button onClick={onClose} className="rounded-xl bg-white/10 p-2"><X /></button>
      </header>
      <section className="mb-4 rounded-2xl border border-orange-400/20 bg-orange-950/20 p-4">
        <h3 className="mb-2 flex items-center gap-2 font-bold text-orange-200"><Flame size={18}/> Flame appearance</h3>
        <div className="flex items-center justify-between gap-3 text-sm"><span className="text-slate-300">Equipped: {flameSkin === 'solar' ? 'Solar Orange' : 'Azure Blue'}</span><button disabled={flameSkin === 'azure'} onClick={onEquipAzure} className="rounded-xl border border-cyan-300/30 bg-cyan-700/30 px-3 py-2 text-xs font-bold text-cyan-100 disabled:opacity-40">Equip Blue Flame</button></div>
      </section>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-cyan-200"><Monitor size={18}/> Graphics</h3>
        <div className="grid grid-cols-2 gap-2">{quality.map(q => <button key={q} onClick={() => set({ graphicsQuality: q })} className={`rounded-xl border px-3 py-2 text-sm font-semibold capitalize ${settings.graphicsQuality === q ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-black/20 text-slate-300'}`}>{q}</button>)}</div>
        <label className="mt-4 flex items-center justify-between text-sm"><span>Screen shake</span><input type="checkbox" checked={settings.screenShake} onChange={e => set({ screenShake: e.target.checked })}/></label>
        <label className="mt-3 flex items-center justify-between text-sm"><span>Damage numbers</span><input type="checkbox" checked={settings.damageNumbers} onChange={e => set({ damageNumbers: e.target.checked })}/></label>
      </section>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-4 flex items-center gap-2 font-bold text-cyan-200"><Volume2 size={18}/> Audio</h3>
        {[['Master volume','masterVolume'],['Sound effects','sfxVolume']].map(([label,key]) => <label key={key} className="mb-3 block text-sm"><span className="mb-1 flex justify-between text-slate-300"><span>{label}</span><span>{Math.round(settings[key as 'masterVolume'] * 100)}%</span></span><input className="w-full accent-cyan-400" type="range" min="0" max="1" step="0.05" value={settings[key as 'masterVolume']} onChange={e => { const value = Number(e.target.value); const next = { ...settings, [key]: value }; onUpdateSettings(next); soundManager.setVolumes(next.masterVolume, next.sfxVolume, next.musicVolume); }}/></label>)}
        <label className="mt-2 flex items-center justify-between text-sm"><span>Vibration</span><input type="checkbox" checked={settings.vibration} onChange={e => { soundManager.setVibration(e.target.checked); set({ vibration: e.target.checked }); }}/></label>
      </section>
      <section className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="mb-3 flex items-center gap-2 font-bold text-cyan-200"><SlidersHorizontal size={18}/> Button customization</h3>
        {(['attack','ward'] as const).map(id => { const b = settings.controlsLayout.buttons[id]; const Icon = id === 'attack' ? Flame : Shield; const label = id === 'attack' ? 'Azure Flame' : 'Protection Shield'; return <div key={id} className="mb-4 last:mb-0"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon size={17}/>{label}</div><label className="mb-2 block text-xs text-slate-300">Size: {b.size}px<input className="mt-1 w-full accent-cyan-400" type="range" min="44" max="96" value={b.size} onChange={e => updateButton(id,{size:Number(e.target.value)})}/></label><label className="block text-xs text-slate-300">Brightness: {Math.round(b.opacity*100)}%<input className="mt-1 w-full accent-cyan-400" type="range" min="0.25" max="1" step="0.05" value={b.opacity} onChange={e => updateButton(id,{opacity:Number(e.target.value)})}/></label></div>})}
      </section>
      <button onClick={onClose} className="w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 py-3 font-bold">Done</button>
    </div>
  </div>;
};
