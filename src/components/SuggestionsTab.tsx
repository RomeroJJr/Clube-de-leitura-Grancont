import React, { useState } from 'react';
import { Lightbulb, Plus, ThumbsUp, Trash2, CheckCircle } from 'lucide-react';
import { uid, COLORS } from '../lib/utils';
import { TabHeader, EmptyState, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle, Avatar } from './Shared';

export function SuggestionsTab({ suggestions, employees, upsert, remove, notify, isAdmin }: any) {
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [voterModal, setVoterModal] = useState<any>(null);

  const sorted = [...suggestions].sort((a: any, b: any) => {
    if (a.status !== b.status) {
      if (a.status === 'pending') return -1;
      return 1;
    }
    return (b.voters?.length || 0) - (a.voters?.length || 0);
  });

  function save(form: any) {
    if (!form.title?.trim()) return notify("Informe o título do livro sugerido.", "error");
    if (!form.suggesterId) return notify("Selecione quem está sugerindo.", "error");
    
    const isNew = !form.id;
    upsert({ 
      ...form, 
      id: form.id || uid(), 
      title: form.title.trim(), 
      voters: isNew ? [form.suggesterId] : form.voters, // Auto-vote from suggester
      status: form.status || 'pending'
    });
    setModal(null);
  }

  function toggleVote(suggestion: any, empId: string) {
    if (!empId) return notify("Selecione o colaborador.", "error");
    const voters = suggestion.voters || [];
    const hasVoted = voters.includes(empId);
    const newVoters = hasVoted ? voters.filter((id: string) => id !== empId) : [...voters, empId];
    
    upsert({ ...suggestion, voters: newVoters });
    setVoterModal(null);
    notify(hasVoted ? "Voto removido." : "Voto computado! 🎉");
  }

  function markPurchased(suggestion: any) {
    upsert({ ...suggestion, status: 'purchased' });
    notify("Marcado como comprado!");
  }

  return (
    <div>
      <TabHeader
        title="Sugestões de Leitura"
        subtitle="Vote e sugira novos livros para a biblioteca do escritório."
        actionLabel="Nova sugestão"
        onAction={() => setModal({})}
        query=""
        setQuery={() => {}}
        placeholder=""
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="Nenhuma sugestão ainda"
          subtitle="Qual livro você acha que a equipe adoraria ler?"
          actionLabel="Fazer sugestão"
          onAction={() => setModal({})}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {sorted.map((s: any) => {
            const isPurchased = s.status === 'purchased';
            const votes = s.voters?.length || 0;
            const suggester = employees.find((e: any) => e.id === s.suggesterId);
            
            return (
              <div key={s.id} className="bg-white rounded-2xl border p-5 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group" style={{ borderColor: COLORS.BORDER }}>
                {isPurchased && (
                  <div className="absolute top-0 right-0 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-bl-xl flex items-center gap-1">
                    <CheckCircle size={12} /> Já comprado
                  </div>
                )}
                
                <div className="flex items-start justify-between gap-4 mt-1">
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-lg leading-snug ${isPurchased ? 'text-gray-400' : 'text-slate-900'}`}>{s.title}</p>
                    <p className="text-sm mt-1 text-slate-500">{s.author || "Autor não informado"}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Avatar name={suggester?.name || "?"} size={20} />
                  <span className="text-xs text-slate-500 truncate">Sugerido por {suggester?.name || "Colaborador removido"}</span>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => !isPurchased && setVoterModal(s)}
                      disabled={isPurchased}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${isPurchased ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                    >
                      <ThumbsUp size={16} className={isPurchased ? '' : 'group-hover:-translate-y-0.5 transition-transform'} />
                      <span>{votes}</span>
                    </button>
                    {isAdmin && !isPurchased && (
                      <button onClick={() => markPurchased(s)} title="Marcar como comprado" className="px-3 py-1.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors">
                        Comprado?
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <IconBtn danger onClick={() => setConfirmId(s.id)}><Trash2 size={16} /></IconBtn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title="Nova Sugestão de Livro" onClose={() => setModal(null)}>
        {modal && <SuggestionForm initial={modal} employees={employees} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <Modal open={!!voterModal} title="Confirmar Voto" onClose={() => setVoterModal(null)}>
        {voterModal && <VoteForm suggestion={voterModal} employees={employees} onVote={(empId: string) => toggleVote(voterModal, empId)} onCancel={() => setVoterModal(null)} />}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir sugestão?" message="Essa ação não pode ser desfeita e os votos serão perdidos." onConfirm={() => { remove(confirmId!); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

function SuggestionForm({ initial, employees, onSave, onCancel }: any) {
  const [form, setForm] = useState({ title: "", author: "", suggesterId: "", ...initial });
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Título do livro *</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: O Poder do Hábito" />
      </div>
      <div>
        <FieldLabel>Autor (Opcional)</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Ex.: Charles Duhigg" />
      </div>
      <div>
        <FieldLabel>Quem está sugerindo? *</FieldLabel>
        <select className={inputClass} style={inputStyle} value={form.suggesterId} onChange={(e) => setForm({ ...form, suggesterId: e.target.value })}>
          <option value="">Selecione seu nome...</option>
          {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">Cancelar</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">Sugerir</button>
      </div>
    </div>
  );
}

function VoteForm({ suggestion, employees, onVote, onCancel }: any) {
  const [empId, setEmpId] = useState("");
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500 mb-2">Selecione seu nome para contabilizar seu voto para o livro <b>"{suggestion.title}"</b>.</p>
      <div>
        <FieldLabel>Quem está votando?</FieldLabel>
        <select className={inputClass} style={inputStyle} value={empId} onChange={(e) => setEmpId(e.target.value)}>
          <option value="">Selecione seu nome...</option>
          {employees.map((e: any) => {
            const hasVoted = suggestion.voters?.includes(e.id);
            return <option key={e.id} value={e.id}>{e.name} {hasVoted ? "(Remover voto)" : ""}</option>;
          })}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">Cancelar</button>
        <button onClick={() => onVote(empId)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700">Confirmar</button>
      </div>
    </div>
  );
}
