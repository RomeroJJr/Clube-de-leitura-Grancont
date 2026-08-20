import React, { useState } from 'react';
import { Users, Building2, Pencil, Trash2, RotateCw, CheckCircle2, BookPlus } from 'lucide-react';
import { uid, downloadCSV, getLoanStatus, fmtDate, COLORS, LoanStatus, todayISO, addDays, availableCopies } from '../lib/utils';
import { TabHeader, ExportBtn, EmptyState, Avatar, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle, Badge } from './Shared';

export function EmployeesTab({ employees, books, loans, upsert, remove, extendLoan, onReturnRequest, notify, isAdmin, upsertLoan, defaultLoanDays }: any) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [assigningLoan, setAssigningLoan] = useState(false);

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b" style={{ borderColor: COLORS.BORDER }}>
                <div className="flex items-center gap-4">
                  <Avatar name={profile.name} size={52} />
                  <div>
                    <p className="font-bold text-lg" style={{ color: COLORS.INK }}>{profile.name}</p>
                    <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: COLORS.MUTED }}>
                      <Building2 size={14} /> {profile.department || "Setor não informado"}
                      {profile.email ? ` · ${profile.email}` : ""}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => setAssigningLoan(true)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors shrink-0" style={{ backgroundColor: COLORS.PURPLE }}>
                    <BookPlus size={16} /> Designar Livro
                  </button>
                )}
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: COLORS.INK }}>
                    Histórico de Atividade
                  </p>
                  {empLoans(profile.id).length === 0 ? (
                    <p className="text-sm text-center py-6 bg-gray-50 rounded-xl" style={{ color: COLORS.MUTED }}>Ainda não há histórico de empréstimos.</p>
                  ) : (
                    <div className="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-[7px] before:w-px before:bg-gray-200">
                      {empLoans(profile.id).map((l: any) => {
                        const status = getLoanStatus(l) as LoanStatus;
                        const book = bookById[l.bookId];
                        const isActive = !l.actualReturnDate;
                        
                        return (
                          <div key={l.id} className="relative">
                            <span className={`absolute -left-[21px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ${isActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></span>
                            <div className={`rounded-xl px-4 py-3 border ${isActive ? 'border-indigo-100 bg-indigo-50/30' : 'border-gray-200 bg-white'}`}>
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-bold truncate" style={{ color: COLORS.INK }}>{book?.title || "Título removido"}</p>
                                  <p className="text-xs mt-1" style={{ color: COLORS.MUTED }}>
                                    Retirado em {fmtDate(l.checkoutDate)}
                                    {l.actualReturnDate ? ` • Devolvido em ${fmtDate(l.actualReturnDate)}` : ` • Previsão para ${fmtDate(l.expectedReturnDate)}`}
                                  </p>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {isActive ? <Badge status={status} /> : (
                                    <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-slate-500">
                                      Devolvido
                                    </span>
                                  )}
                                  {isActive && isAdmin && (
                                    <div className="flex gap-1 border-l pl-3 ml-1" style={{ borderColor: COLORS.BORDER_STRONG }}>
                                      <IconBtn title="Renovar por mais 7 dias" onClick={() => extendLoan(l, 7)}><RotateCw size={14} /></IconBtn>
                                      <IconBtn title="Marcar como devolvido" onClick={() => onReturnRequest(l)}><CheckCircle2 size={14} /></IconBtn>
                                    </div>
                                  )}
                                </div>
                              </div>
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

      <Modal open={assigningLoan} title={`Designar Livro para ${profile?.name}`} onClose={() => setAssigningLoan(false)}>
        <AssignLoanForm employee={profile} books={books} loans={loans} defaultLoanDays={defaultLoanDays} onSave={(data: any) => { upsertLoan(data); setAssigningLoan(false); }} onCancel={() => setAssigningLoan(false)} />
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir colaborador?" message="Essa ação não pode ser desfeita." onConfirm={() => handleDelete(confirmId!)} onCancel={() => setConfirmId(null)} />
    </div>
  );
}

function AssignLoanForm({ employee, books, loans, defaultLoanDays, onSave, onCancel }: any) {
  const [form, setForm] = useState({
    employeeId: employee?.id,
    bookId: "",
    checkoutDate: todayISO(),
    expectedReturnDate: addDays(todayISO(), defaultLoanDays || 21),
    actualReturnDate: "",
    notes: "",
  });

  if (!employee) return null;

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Colaborador</FieldLabel>
        <input className={inputClass} style={inputStyle} value={employee.name} disabled />
      </div>
      <div>
        <FieldLabel>Livro *</FieldLabel>
        <select className={inputClass} style={inputStyle} value={form.bookId} onChange={(e) => setForm({ ...form, bookId: e.target.value })}>
          <option value="">Selecione...</option>
          {books.map((b: any) => {
            const avail = availableCopies(b, loans);
            const isMaintenance = b.maintenance;
            const disabled = avail <= 0 || isMaintenance;
            const suffix = isMaintenance ? " (em manutenção)" : " (indisponível)";
            return <option key={b.id} value={b.id} disabled={disabled}>{b.title}{disabled ? suffix : ""}</option>;
          })}
        </select>
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
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button 
          onClick={() => {
            if (!form.bookId) return;
            onSave({ ...form, id: uid() });
          }} 
          disabled={!form.bookId}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" 
          style={{ backgroundColor: COLORS.PURPLE }}
        >
          Confirmar Empréstimo
        </button>
      </div>
    </div>
  );
}

function EmployeeForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({ name: "", department: "", email: "", role: "user", ...initial });
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
        <p className="text-[10px] text-slate-400 mt-1">Usado para enviar lembretes automáticos de devolução e acesso.</p>
      </div>
      <div>
        <FieldLabel>Acesso à Plataforma</FieldLabel>
        <select className={inputClass} style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="user">Usuário Comum (Leitura e sugestões)</option>
          <option value="admin">Administrador (Gestão do acervo)</option>
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
      </div>
    </div>
  );
}
