import React, { useState } from 'react';
import { Bookmark, CalendarClock, Trash2, CheckCircle2 } from 'lucide-react';
import { uid, fmtDate, COLORS, availableCopies, todayISO } from '../lib/utils';
import { TabHeader, EmptyState, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle, Avatar, IconBtn } from './Shared';

export function ReservationsTab({ reservations, employees, books, loans, upsert, remove, notify, isAdmin }: any) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  
  const empById = Object.fromEntries(employees.map((e: any) => [e.id, e]));
  const bookById = Object.fromEntries(books.map((b: any) => [b.id, b]));

  const filtered = reservations.filter((r: any) => {
    const b = bookById[r.bookId];
    const e = empById[r.employeeId];
    const term = query.toLowerCase();
    return (b?.title || "").toLowerCase().includes(term) || (e?.name || "").toLowerCase().includes(term);
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  function save(form: any) {
    if (!form.employeeId) return notify("Selecione o colaborador.", "error");
    if (!form.bookId) return notify("Selecione o livro.", "error");
    upsert({ ...form, id: form.id || uid(), status: form.status || 'pending' });
    setModal(null);
  }

  return (
    <div>
      <TabHeader
        title="Reservas"
        subtitle="Fila de espera para livros que estão indisponíveis no momento."
        actionLabel={isAdmin ? "Nova reserva" : "Reservar Livro"}
        onAction={() => setModal({ date: todayISO() })}
        query={query}
        setQuery={setQuery}
        placeholder="Buscar por livro ou colaborador..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={reservations.length === 0 ? "Nenhuma reserva ativa" : "Nada encontrado"}
          subtitle={reservations.length === 0 ? "Quando um livro estiver esgotado, crie uma reserva para entrar na fila." : "Tente ajustar sua busca."}
          actionLabel="Fazer Reserva"
          onAction={() => setModal({ date: todayISO() })}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r: any) => {
            const emp = empById[r.employeeId];
            const book = bookById[r.bookId];
            const avail = book ? availableCopies(book, loans) : 0;

            return (
              <div key={r.id} className="bg-white rounded-2xl border p-4 flex flex-col relative overflow-hidden" style={{ borderColor: COLORS.BORDER }}>
                {r.status === 'fulfilled' && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    ATENDIDA
                  </div>
                )}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={emp?.name} size={36} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: COLORS.INK }}>{emp?.name || "Colaborador removido"}</p>
                      <p className="text-xs mt-0.5" style={{ color: COLORS.MUTED }}>Reserva em {fmtDate(r.date)}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5 shrink-0 ml-2">
                      <IconBtn danger onClick={() => setConfirmId(r.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                  )}
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border flex-1" style={{ borderColor: COLORS.BORDER }}>
                  <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: COLORS.MUTED }}>Livro Aguardado</p>
                  <p className="text-sm font-semibold leading-tight line-clamp-2" style={{ color: COLORS.INK }}>{book?.title || "Livro removido"}</p>
                  
                  {r.status === 'pending' && book && (
                    <div className="mt-3 flex items-center justify-between">
                      {avail > 0 && !book.maintenance ? (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1.5">
                          <CheckCircle2 size={12} /> Disponível!
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md flex items-center gap-1.5">
                          <CalendarClock size={12} /> Aguardando
                        </span>
                      )}
                      
                      {isAdmin && avail > 0 && !book.maintenance && (
                        <button 
                          onClick={() => upsert({ ...r, status: 'fulfilled' })}
                          className="text-[11px] font-bold px-2 py-1 bg-white border rounded shadow-sm hover:bg-slate-50"
                        >
                          Marcar Atendida
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title="Nova Reserva" onClose={() => setModal(null)}>
        {modal && <ReservationForm initial={modal} employees={employees} books={books} loans={loans} onSave={save} onCancel={() => setModal(null)} isAdmin={isAdmin} />}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Cancelar reserva?" message="Esta reserva será removida permanentemente." onConfirm={() => { remove(confirmId!); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

function ReservationForm({ initial, employees, books, loans, onSave, onCancel, isAdmin }: any) {
  const [form, setForm] = useState({ employeeId: "", bookId: "", date: todayISO(), ...initial });

  // Só podemos reservar livros que existem e que estão sem cópias disponíveis (ou apenas listar todos como indisponíveis?)
  // O usuário quer reservar caso esteja emprestado.
  const unavailableBooks = books.filter((b: any) => availableCopies(b, loans) <= 0 && !b.maintenance);

  return (
    <div className="space-y-4">
      {unavailableBooks.length === 0 ? (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
          <p className="text-sm text-emerald-700 font-medium">Todos os livros do acervo possuem cópias disponíveis no momento!</p>
        </div>
      ) : (
        <>
          <div>
            <FieldLabel>Colaborador *</FieldLabel>
            <select className={inputClass} style={inputStyle} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              <option value="">Selecione...</option>
              {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Livro Desejado *</FieldLabel>
            <select className={inputClass} style={inputStyle} value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
              <option value="">Selecione o livro esgotado...</option>
              {unavailableBooks.map((b: any) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">Apenas livros sem cópias disponíveis aparecem nesta lista.</p>
          </div>
        </>
      )}
      
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        {unavailableBooks.length > 0 && (
          <button 
            onClick={() => onSave(form)} 
            disabled={!form.bookId || !form.employeeId}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" 
            style={{ backgroundColor: COLORS.PURPLE }}
          >
            Confirmar Reserva
          </button>
        )}
      </div>
    </div>
  );
}
