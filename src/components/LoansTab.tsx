import React, { useState } from 'react';
import { ArrowRightLeft, Plus, RotateCw, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { uid, downloadCSV, getLoanStatus, fmtDate, todayISO, addDays, availableCopies, STATUS_META, COLORS, LoanStatus } from '../lib/utils';
import { ExportBtn, EmptyState, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle, Badge } from './Shared';

export function LoansTab({ employees, books, loans, upsert, remove, extendLoan, onReturnRequest, defaultLoanDays, notify, isAdmin }: any) {
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const empById = Object.fromEntries(employees.map((e: any) => [e.id, e]));
  const bookById = Object.fromEntries(books.map((b: any) => [b.id, b]));

  const filtered = loans
    .filter((l: any) => (filter === "all" ? true : getLoanStatus(l) === filter))
    .sort((a: any, b: any) => (b.checkoutDate || "").localeCompare(a.checkoutDate || ""));

  function save(form: any) {
    if (!form.employeeId) return notify("Selecione o colaborador.", "error");
    if (!form.bookId) return notify("Selecione o livro.", "error");
    if (!form.checkoutDate) return notify("Informe a data da coleta.", "error");
    if (!form.expectedReturnDate) return notify("Informe a data prevista de devolução.", "error");
    if (!form.id) {
      const book = books.find((b: any) => b.id === form.bookId);
      if (book && availableCopies(book, loans) <= 0) return notify("Não há exemplares disponíveis desse título no momento.", "error");
    }
    upsert({ ...form, id: form.id || uid() });
    setModal(null);
  }

  function exportCSV() {
    downloadCSV(
      "emprestimos-grancont.csv",
      ["Livro", "Colaborador", "Coleta", "Previsão de devolução", "Devolução efetiva", "Status"],
      loans.map((l: any) => [
        bookById[l.bookId]?.title || "",
        empById[l.employeeId]?.name || "",
        fmtDate(l.checkoutDate),
        fmtDate(l.expectedReturnDate),
        l.actualReturnDate ? fmtDate(l.actualReturnDate) : "",
        STATUS_META[getLoanStatus(l) as LoanStatus].label,
      ])
    );
  }

  const filters = [
    { key: "all", label: "Todos" },
    { key: "active", label: "Em dia" },
    { key: "dueSoon", label: "Vencendo" },
    { key: "overdue", label: "Atrasados" },
    { key: "returned", label: "Devolvidos" },
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl font-bold brand-font" style={{ color: COLORS.INK }}>Empréstimos</h2>
          <p className="text-sm mt-0.5" style={{ color: COLORS.MUTED }}>Acompanhe o registro de coletas, prazos e devoluções.</p>
        </div>
        <div className="flex gap-2">
          {loans.length > 0 && <ExportBtn onClick={exportCSV} />}
          {isAdmin && (
            <button
              onClick={() => setModal({ checkoutDate: todayISO(), expectedReturnDate: addDays(todayISO(), defaultLoanDays) })}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shrink-0"
              style={{ backgroundColor: COLORS.PURPLE }}
            >
              <Plus size={16} /> Novo empréstimo
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
            style={filter === f.key ? { backgroundColor: COLORS.PURPLE, color: "white" } : { backgroundColor: COLORS.BORDER, color: "#6B6478" }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title={loans.length === 0 ? "Nenhum empréstimo registrado" : "Nada encontrado"}
          subtitle={loans.length === 0 ? "Os empréstimos de livros serão listados aqui." : "Tente outro filtro."}
          actionLabel={loans.length === 0 && isAdmin ? "Novo empréstimo" : undefined}
          onAction={() => isAdmin && setModal({ checkoutDate: todayISO(), expectedReturnDate: addDays(todayISO(), defaultLoanDays) })}
        />
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: COLORS.BORDER }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ backgroundColor: "#FAF7FB" }}>
                <th className="px-5 py-3 font-semibold" style={{ color: "#6B6478" }}>Livro</th>
                <th className="px-5 py-3 font-semibold hidden sm:table-cell" style={{ color: "#6B6478" }}>Colaborador</th>
                <th className="px-5 py-3 font-semibold hidden md:table-cell" style={{ color: "#6B6478" }}>Coleta</th>
                <th className="px-5 py-3 font-semibold hidden md:table-cell" style={{ color: "#6B6478" }}>Previsão</th>
                <th className="px-5 py-3 font-semibold" style={{ color: "#6B6478" }}>Status</th>
                {isAdmin && <th className="px-5 py-3 font-semibold text-right" style={{ color: "#6B6478" }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => {
                const status = getLoanStatus(l) as LoanStatus;
                return (
                  <tr key={l.id} className="border-t align-top hover:bg-gray-50/50 transition-colors" style={{ borderColor: COLORS.BORDER }}>
                    <td className="px-5 py-3 font-medium" style={{ color: COLORS.INK }}>
                      <div className="flex items-center gap-3">
                        {bookById[l.bookId]?.coverUrl ? (
                          <div className="w-8 h-12 rounded overflow-hidden shrink-0 shadow-sm border border-black/10">
                            <img src={bookById[l.bookId].coverUrl} alt="Capa" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-12 rounded flex items-center justify-center shrink-0 shadow-sm border border-black/10 bg-gray-50">
                            <BookOpen size={14} style={{ color: COLORS.MUTED }} />
                          </div>
                        )}
                        <div>
                          {bookById[l.bookId]?.title || "Título removido"}
                          <div className="text-xs mt-0.5 sm:hidden" style={{ color: COLORS.MUTED }}>{empById[l.employeeId]?.name || "Colaborador removido"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell align-middle" style={{ color: "#6B6478" }}>{empById[l.employeeId]?.name || "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell align-middle" style={{ color: "#6B6478" }}>{fmtDate(l.checkoutDate)}</td>
                    <td className="px-5 py-3 hidden md:table-cell align-middle" style={{ color: "#6B6478" }}>
                      {l.actualReturnDate ? <span>devolvido em {fmtDate(l.actualReturnDate)}</span> : fmtDate(l.expectedReturnDate)}
                    </td>
                    <td className="px-5 py-3 align-middle"><Badge status={status} /></td>
                    {isAdmin && (
                      <td className="px-5 py-3 align-middle">
                        <div className="flex justify-end gap-1">
                          {!l.actualReturnDate && (
                            <>
                              <IconBtn title="Renovar por mais 7 dias" onClick={() => extendLoan(l, 7)}><RotateCw size={15} /></IconBtn>
                              <IconBtn title="Marcar como devolvido" onClick={() => onReturnRequest(l)}><CheckCircle2 size={15} /></IconBtn>
                            </>
                          )}
                          <IconBtn title="Editar" onClick={() => setModal(l)}><Pencil size={15} /></IconBtn>
                          <IconBtn title="Excluir" danger onClick={() => setConfirmId(l.id)}><Trash2 size={15} /></IconBtn>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} title={modal?.id ? "Editar empréstimo" : "Novo empréstimo"} onClose={() => setModal(null)}>
        {modal && <LoanForm initial={modal} employees={employees} books={books} loans={loans} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir empréstimo?" message="Essa ação não pode ser desfeita." onConfirm={() => { remove(confirmId!); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

function LoanForm({ initial, employees, books, loans, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    employeeId: "",
    bookId: "",
    checkoutDate: todayISO(),
    expectedReturnDate: addDays(todayISO(), 21),
    actualReturnDate: "",
    notes: "",
    ...initial,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Colaborador *</FieldLabel>
          <select className={inputClass} style={inputStyle} value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
            <option value="">Selecione...</option>
            {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Livro *</FieldLabel>
          <select className={inputClass} style={inputStyle} value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
            <option value="">Selecione...</option>
            {books.map((b: any) => {
              const avail = availableCopies(b, loans.filter((l: any) => l.id !== form.id));
              const disabled = !form.id && avail <= 0;
              return <option key={b.id} value={b.id} disabled={disabled}>{b.title}{disabled ? " (indisponível)" : ""}</option>;
            })}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Data da coleta *</FieldLabel>
          <input type="date" className={inputClass} style={inputStyle} value={form.checkoutDate} onChange={(e) => setForm({ ...form, checkoutDate: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Previsão de devolução *</FieldLabel>
          <input type="date" className={inputClass} style={inputStyle} value={form.expectedReturnDate} onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })} />
        </div>
      </div>
      <div>
        <FieldLabel>Data de devolução efetiva</FieldLabel>
        <input type="date" className={inputClass} style={inputStyle} value={form.actualReturnDate || ""} onChange={(e) => setForm({ ...form, actualReturnDate: e.target.value })} />
      </div>
      <div>
        <FieldLabel>Observações</FieldLabel>
        <textarea rows={2} className={inputClass} style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opcional" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
      </div>
    </div>
  );
}
