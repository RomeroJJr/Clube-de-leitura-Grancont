import React from 'react';
import { Users, BookOpen, ArrowRightLeft, AlertTriangle, Bell, Trophy, Copy, BarChart2, Download, TrendingUp, Mail, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';
import { getLoanStatus, daysUntil, fmtDate, reminderText, downloadCSV, STATUS_META, COLORS, LoanStatus, getLast6Months, sendEmailReminder } from '../lib/utils';
import { Avatar, IconBtn } from './Shared';

export function Dashboard({ employees, books, loans, suggestions, onGoTo, notify }: any) {
  const activeLoans = loans.filter((l: any) => !l.actualReturnDate);
  const overdue = activeLoans.filter((l: any) => getLoanStatus(l) === "overdue");
  const dueSoon = activeLoans.filter((l: any) => getLoanStatus(l) === "dueSoon");
  const empById = Object.fromEntries(employees.map((e: any) => [e.id, e]));
  const bookById = Object.fromEntries(books.map((b: any) => [b.id, b]));

  const reminders = [...overdue, ...dueSoon].sort(
    (a, b) => daysUntil(a.expectedReturnDate) - daysUntil(b.expectedReturnDate)
  );

  const readCounts: Record<string, number> = {};
  const bookCounts: Record<string, number> = {};
  
  loans.forEach((l: any) => {
    readCounts[l.employeeId] = (readCounts[l.employeeId] || 0) + 1; // Contabiliza todos os empréstimos no histórico
    bookCounts[l.bookId] = (bookCounts[l.bookId] || 0) + 1;
  });
  
  const ranking = Object.entries(readCounts)
    .map(([id, count]) => ({ emp: empById[id], count }))
    .filter((r) => r.emp)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topBooks = Object.entries(bookCounts)
    .map(([id, count]) => ({ title: bookById[id]?.title || "Desconhecido", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const monthsData = getLast6Months();
  const monthlyLoans = monthsData.map(m => {
    const count = loans.filter((l: any) => {
       if (!l.checkoutDate) return false;
       const d = new Date(l.checkoutDate + "T00:00:00");
       return d.getFullYear() === m.year && d.getMonth() === m.month;
    }).length;
    return { name: m.label, "Novos empréstimos": count };
  });

  const stats = [
    { label: "Colaboradores", value: employees.length, icon: Users, tab: "employees" },
    { label: "Títulos no acervo", value: books.length, icon: BookOpen, tab: "books" },
    { label: "Sugestões de leitura", value: suggestions?.length || 0, icon: Lightbulb, tab: "suggestions" },
    { label: "Empréstimos ativos", value: activeLoans.length, icon: ArrowRightLeft, tab: "loans" },
    { label: "Atrasados", value: overdue.length, icon: AlertTriangle, tab: "loans", danger: true },
  ];

  async function copyReminder(l: any) {
    const emp = empById[l.employeeId];
    const book = bookById[l.bookId];
    const text = reminderText(emp?.name || "colaborador", book?.title || "livro", l);
    try {
      await navigator.clipboard.writeText(text);
      notify("Mensagem de lembrete copiada.");
    } catch {
      notify("Não foi possível copiar automaticamente.", "error");
    }
  }

  function exportOverdue() {
    if (overdue.length === 0) return notify("Não há empréstimos atrasados no momento.");
    downloadCSV(
      "relatorio-atrasos-grancont.csv",
      ["Livro", "Colaborador", "Setor", "E-mail", "Dias de Atraso", "Previsão Original"],
      overdue.map((l: any) => {
        const emp = empById[l.employeeId];
        const book = bookById[l.bookId];
        return [
          book?.title || "Removido",
          emp?.name || "Removido",
          emp?.department || "",
          emp?.email || "",
          Math.abs(daysUntil(l.expectedReturnDate)).toString(),
          fmtDate(l.expectedReturnDate)
        ];
      })
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="relative overflow-hidden rounded-2xl px-6 py-7 md:px-8 md:py-9 shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.PURPLE} 0%, ${COLORS.PURPLE_DARK} 100%)` }}>
        <svg className="absolute -right-8 -top-10 opacity-[0.10]" width="240" height="240" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" stroke="white" strokeWidth="6" fill="none" />
          <circle cx="32" cy="32" r="14" stroke="white" strokeWidth="6" fill="none" />
        </svg>
        <p className="text-white/70 text-sm font-medium tracking-wide uppercase">Clube de leitura Grancont</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1.5">
          <h1 className="text-white text-2xl md:text-3xl font-bold brand-font">Boa leitura, equipe!</h1>
          <button onClick={exportOverdue} className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-white/20 hover:bg-white/30 transition-colors shrink-0">
            <Download size={16} /> Relatório de Atrasos
          </button>
        </div>
        <p className="text-white/80 text-sm mt-2 max-w-xl">
          Acompanhe quem está com cada livro, prazos de devolução e o acervo disponível para todas as áreas do escritório.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => onGoTo(s.tab)}
            className="text-left rounded-2xl border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all bg-white group"
            style={{ borderColor: COLORS.BORDER }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 shadow-sm transition-transform group-hover:scale-105" style={{ backgroundColor: s.danger ? "#FEF2F2" : "#EEF2FF" }}>
              <s.icon size={20} style={{ color: s.danger ? "#EF4444" : COLORS.PURPLE }} />
            </div>
            <p className="text-3xl font-extrabold brand-font tracking-tight" style={{ color: COLORS.INK }}>{s.value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: COLORS.MUTED }}>{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lembretes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <Bell size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Lembretes de devolução</p>
          </div>
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-xl border border-dashed" style={{ borderColor: COLORS.BORDER_STRONG }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: "#D1FAE5" }}>
                <ArrowRightLeft size={20} style={{ color: "#059669" }} />
              </div>
              <p className="text-sm font-medium" style={{ color: COLORS.MUTED }}>
                Nenhum lembrete — todos estão em dia! 🎉
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((l) => {
                const d = daysUntil(l.expectedReturnDate);
                const status = getLoanStatus(l) as LoanStatus;
                const emp = empById[l.employeeId];
                const book = bookById[l.bookId];
                return (
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 border transition-colors hover:border-gray-200" style={{ backgroundColor: STATUS_META[status].bg, borderColor: "transparent" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={emp?.name || "?"} size={36} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: COLORS.INK }}>{book?.title || "Título removido"}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: COLORS.MUTED }}>
                          {emp?.name || "colaborador removido"} · previsto para {fmtDate(l.expectedReturnDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold whitespace-nowrap hidden sm:inline" style={{ color: STATUS_META[status].color }}>
                        {status === "overdue" ? `${Math.abs(d)}d atrasado` : d === 0 ? "vence hoje" : `${d}d restantes`}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconBtn title="Copiar mensagem de lembrete" onClick={() => copyReminder(l)}><Copy size={16} /></IconBtn>
                        <IconBtn title="Enviar lembrete por e-mail" onClick={() => sendEmailReminder(emp, book?.title || "livro", l, notify)}><Mail size={16} /></IconBtn>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Leitores */}
        <div className="bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <Trophy size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Top 5 Leitores</p>
          </div>
          {ranking.length === 0 ? (
            <p className="text-sm py-8 text-center bg-gray-50 rounded-xl" style={{ color: COLORS.MUTED }}>
              Assim que os primeiros empréstimos forem feitos, o ranking aparece aqui.
            </p>
          ) : (
            <div className="space-y-4">
              {ranking.map((r, i) => (
                <div key={r.emp.id} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: i === 0 ? "#FEF3C7" : "#F1F5F9", color: i === 0 ? "#D97706" : "#64748B" }}
                  >
                    {i + 1}
                  </span>
                  <Avatar name={r.emp.name} size={32} />
                  <p className="text-sm font-semibold flex-1 truncate" style={{ color: COLORS.INK }}>{r.emp.name}</p>
                  <span className="text-xs font-bold px-2 py-1 bg-indigo-50 rounded-md" style={{ color: COLORS.PURPLE }}>{r.count} livro{r.count > 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Chart 1: Livros mais emprestados */}
        <div className="bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <BarChart2 size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Top 5 Livros</p>
          </div>
          {topBooks.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed" style={{ borderColor: COLORS.BORDER_STRONG }}>
              <p className="text-sm font-medium" style={{ color: COLORS.MUTED }}>Ainda não há dados suficientes para exibir o gráfico.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBooks} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="title" type="category" width={180} tick={{ fontSize: 13, fill: COLORS.INK, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#F1F5F9' }} 
                    contentStyle={{ borderRadius: '12px', border: `1px solid ${COLORS.BORDER}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: COLORS.PURPLE, fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill={COLORS.PURPLE} radius={[0, 6, 6, 0]} barSize={32}>
                    {topBooks.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.PURPLE : '#A5B4FC'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Evolução Mensal */}
        <div className="bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <TrendingUp size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Evolução de Empréstimos (6 Meses)</p>
          </div>
          {loans.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed" style={{ borderColor: COLORS.BORDER_STRONG }}>
              <p className="text-sm font-medium" style={{ color: COLORS.MUTED }}>Ainda não há empréstimos registrados.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyLoans} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.PURPLE} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.PURPLE} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.BORDER} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.MUTED }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.MUTED }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: `1px solid ${COLORS.BORDER}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: COLORS.PURPLE, fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="Novos empréstimos" stroke={COLORS.PURPLE} strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
