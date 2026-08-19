import React, { useState } from 'react';
import { Users, Building2, Pencil, Trash2, RotateCw, CheckCircle2 } from 'lucide-react';
import { uid, downloadCSV, getLoanStatus, fmtDate, COLORS, LoanStatus } from '../lib/utils';
import { TabHeader, ExportBtn, EmptyState, Avatar, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle, Badge } from './Shared';

export function EmployeesTab({ employees, books, loans, upsert, remove, extendLoan, onReturnRequest, notify, isAdmin }: any) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  const filtered = employees.filter(
    (e: any) => e.name.toLowerCase().includes(query.toLowerCase()) || (e.department || "").toLowerCase().includes(query.toLowerCase())
  );

  function save(form: any) {
    if (!form.name?.trim()) return notify("Informe o nome do colaborador.", "error");
    if (!form.email?.trim()) return notify("Informe o e-mail do colaborador.", "error");
    upsert({ ...form, id: form.id || uid(), name: form.name.trim(), email: form.email.trim() });
    setModal(null);
  }

  function handleDelete(id: string) {
    const hasActive = loans.some((l: any) => l.employeeId === id && !l.actualReturnDate);
    if (hasActive) {
      notify("Este colaborador possui um empréstimo ativo. Registre a devolução antes de excluir.", "error");
      setConfirmId(null);
      return;
    }
    remove(id);
    setConfirmId(null);
  }

  function exportCSV() {
    downloadCSV(
      "colaboradores-grancont.csv",
      ["Nome", "Setor", "E-mail"],
      employees.map((e: any) => [e.name, e.department || "", e.email || ""])
    );
  }

  const empLoans = (id: string) => loans.filter((l: any) => l.employeeId === id).sort((a: any, b: any) => (b.checkoutDate || "").localeCompare(a.checkoutDate || ""));
  const bookById = Object.fromEntries(books.map((b: any) => [b.id, b]));

  return (
    <div>
      <TabHeader
        title="Colaboradores"
        subtitle="Membros da equipe que participam do clube de leitura."
        actionLabel={isAdmin ? "Novo colaborador" : undefined}
        onAction={() => isAdmin && setModal({})}
        query={query}
        setQuery={setQuery}
        placeholder="Buscar por nome ou setor..."
        extra={employees.length > 0 && <ExportBtn onClick={exportCSV} />}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={employees.length === 0 ? "Nenhum colaborador cadastrado" : "Nada encontrado"}
          subtitle={employees.length === 0 ? "Adicione o primeiro colaborador para começar a controlar os empréstimos." : "Tente ajustar a busca."}
          actionLabel={employees.length === 0 && isAdmin ? "Novo colaborador" : undefined}
          onAction={() => isAdmin && setModal({})}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e: any) => {
            const active = loans.filter((l: any) => l.employeeId === e.id && !l.actualReturnDate);
            const finished = loans.filter((l: any) => l.employeeId === e.id && l.actualReturnDate).length;
            return (
              <div key={e.id} className="bg-white rounded-2xl border p-4 flex flex-col cursor-pointer hover:shadow-md transition-shadow" style={{ borderColor: COLORS.BORDER }} onClick={() => setProfile(e)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={e.name} size={38} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: COLORS.INK }}>{e.name}</p>
                      <p className="text-xs truncate flex items-center gap-1 mt-0.5" style={{ color: COLORS.MUTED }}>
                        <Building2 size={11} /> {e.department || "Setor não informado"}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-0.5 shrink-0" onClick={(ev) => ev.stopPropagation()}>
                      <IconBtn onClick={() => setModal(e)}><Pencil size={14} /></IconBtn>
                      <IconBtn danger onClick={() => setConfirmId(e.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t text-xs" style={{ borderColor: COLORS.BORDER }}>
                  <span style={{ color: active.length > 0 ? COLORS.PURPLE : COLORS.MUTED }} className="font-semibold">
                    {active.length > 0 ? `${active.length} com livro emprestado` : "Sem livros no momento"}
                  </span>
                  <span style={{ color: COLORS.MUTED }}>{finished} lido{finished !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title={modal?.id ? "Editar colaborador" : "Novo colaborador"} onClose={() => setModal(null)}>
        {modal && <EmployeeForm initial={modal} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <Modal open={!!profile} title="Detalhes do Colaborador" onClose={() => setProfile(null)} wide>
        {profile && (() => {
          const active = empLoans(profile.id).filter(l => !l.actualReturnDate);
          const past = empLoans(profile.id).filter(l => l.actualReturnDate);
          return (
            <div>
              <div className="flex items-center gap-4 mb-6 pb-6 border-b" style={{ borderColor: COLORS.BORDER }}>
                <Avatar name={profile.name} size={52} />
                <div>
                  <p className="font-bold text-lg" style={{ color: COLORS.INK }}>{profile.name}</p>
                  <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.MUTED }}>
                    <Building2 size={14} /> {profile.department || "Setor não informado"}
                    {profile.email ? ` · ${profile.email}` : ""}
                  </p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Active Loans Section */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: COLORS.PURPLE }}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Empréstimos Atuais ({active.length})
                  </p>
                  {active.length === 0 ? (
                    <p className="text-sm text-center py-4 bg-gray-50 rounded-xl" style={{ color: COLORS.MUTED }}>Nenhum empréstimo ativo no momento.</p>
                  ) : (
                    <div className="space-y-2">
                      {active.map((l: any) => {
                        const status = getLoanStatus(l) as LoanStatus;
                        const book = bookById[l.bookId];
                        return (
                          <div key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl px-4 py-3 border border-transparent hover:border-gray-200 transition-colors" style={{ backgroundColor: "#FAF7FB" }}>
                            <div className="min-w-0">
                              <p className="text-sm font-bold truncate" style={{ color: COLORS.INK }}>{book?.title || "Título removido"}</p>
                              <p className="text-xs mt-1" style={{ color: COLORS.MUTED }}>
                                Coletado em {fmtDate(l.checkoutDate)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge status={status} />
                              {isAdmin && (
                                <div className="flex gap-1 border-l pl-3 ml-1" style={{ borderColor: COLORS.BORDER_STRONG }}>
                                  <IconBtn title="Renovar por mais 7 dias" onClick={() => extendLoan(l, 7)}><RotateCw size={14} /></IconBtn>
                                  <IconBtn title="Marcar como devolvido" onClick={() => onReturnRequest(l)}><CheckCircle2 size={14} /></IconBtn>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Past Loans Section */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: COLORS.MUTED }}>
                    <span className="w-2 h-2 rounded-full bg-current"></span>
                    Histórico de Devoluções ({past.length})
                  </p>
                  {past.length === 0 ? (
                    <p className="text-sm text-center py-4 bg-gray-50 rounded-xl" style={{ color: COLORS.MUTED }}>Ainda não há devoluções registradas.</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {past.map((l: any) => {
                        const book = bookById[l.bookId];
                        return (
                          <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 bg-white border" style={{ borderColor: COLORS.BORDER }}>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate" style={{ color: COLORS.INK }}>{book?.title || "Título removido"}</p>
                              <p className="text-xs mt-0.5" style={{ color: COLORS.MUTED }}>
                                {fmtDate(l.checkoutDate)} até {fmtDate(l.actualReturnDate)}
                              </p>
                            </div>
                            <div className="shrink-0">
                              <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100" style={{ color: "#6B6478" }}>
                                Devolvido
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir colaborador?" message="Essa ação não pode ser desfeita." onConfirm={() => handleDelete(confirmId!)} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

function EmployeeForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({ name: "", department: "", email: "", ...initial });
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Nome completo *</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Ana Souza" />
      </div>
      <div>
        <FieldLabel>Setor / área</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Ex.: Contábil, Fiscal, RH..." />
      </div>
      <div>
        <FieldLabel>E-mail *</FieldLabel>
        <input type="email" className={inputClass} style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nome@grancont.com.br" />
        <p className="text-[10px] text-slate-400 mt-1">Usado para enviar lembretes automáticos de devolução.</p>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
      </div>
    </div>
  );
}
