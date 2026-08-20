import React from 'react';
import { Users, BookOpen, ArrowRightLeft, AlertTriangle, Bell, Trophy, Copy, BarChart2, Download, TrendingUp, Mail, Lightbulb } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid, PieChart, Pie } from 'recharts';
import { getLoanStatus, daysUntil, fmtDate, reminderText, downloadCSV, STATUS_META, COLORS, LoanStatus, getLast6Months, sendEmailReminder, availableCopies } from '../lib/utils';
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
    .map(([id, count]) => ({ book: bookById[id], count }))
    .filter(r => r.book)
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

  const booksByCategory: Record<string, number> = {};
  let availableCount = 0;
  let loanedCount = 0;
  let maintenanceCount = 0;

  books.forEach((b: any) => {
    const cat = b.category || b.area || "Geral";
    booksByCategory[cat] = (booksByCategory[cat] || 0) + 1;

    if (b.maintenance) {
      maintenanceCount += (b.totalCopies || 1);
    } else {
      const avail = availableCopies(b, loans);
      availableCount += avail;
      loanedCount += ((b.totalCopies || 1) - avail);
    }
  });

  const categoryData = Object.entries(booksByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const collectionStatusData = [
    { name: 'Disponíveis', value: availableCount, color: '#10b981' }, // emerald-500
    { name: 'Emprestados', value: loanedCount, color: COLORS.PURPLE },
    { name: 'Em Manutenção', value: maintenanceCount, color: '#f59e0b' } // amber-500
  ].filter(d => d.value > 0);

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
      <div className="relative overflow-hidden rounded-2xl px-6 py-7 md:px-8 md:py-9 border border-zinc-200 bg-zinc-950">
        <svg className="absolute -right-8 -top-10 opacity-[0.05]" width="240" height="240" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" stroke="white" strokeWidth="6" fill="none" />
          <circle cx="32" cy="32" r="14" stroke="white" strokeWidth="6" fill="none" />
        </svg>
        <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-2">Clube de leitura Grancont</p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-white text-3xl md:text-4xl font-bold brand-font tracking-tight drop-shadow-sm">Boa leitura, equipe!</h1>
          <button onClick={exportOverdue} className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-zinc-950 bg-white hover:bg-zinc-100 transition-colors shrink-0 shadow-sm">
            <Download size={16} /> Relatório de Atrasos
          </button>
        </div>
        <p className="text-zinc-400 text-sm mt-3 max-w-xl leading-relaxed">
          Acompanhe quem está com cada livro, prazos de devolução e o acervo disponível para todas as áreas do escritório.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => onGoTo(s.tab)}
            className={`text-left rounded-xl border p-5 transition-all bg-white hover:shadow-sm ${s.danger ? 'border-red-200 hover:border-red-300' : 'border-zinc-200 hover:border-zinc-300'}`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${s.danger ? "bg-red-50" : "bg-zinc-50 border border-zinc-100"}`}>
              <s.icon size={20} className={s.danger ? "text-red-600" : "text-zinc-600"} strokeWidth={2.5} />
            </div>
            <p className="text-3xl font-extrabold brand-font tracking-tight text-zinc-950">{s.value}</p>
            <p className="text-xs font-semibold mt-1 text-zinc-500 uppercase tracking-wider">{s.label}</p>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Lembretes */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-50 border border-zinc-200">
              <Bell size={16} className="text-zinc-900" />
            </div>
            <p className="font-bold text-lg brand-font text-zinc-950">Lembretes de devolução</p>
          </div>
          {reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 bg-zinc-50 rounded-xl border border-zinc-200">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4 bg-white border border-zinc-200">
                <ArrowRightLeft size={18} className="text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                Nenhum lembrete pendente — tudo em dia.
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
                  <div key={l.id} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3.5 border border-zinc-200 transition-colors hover:border-zinc-300 bg-zinc-50/50">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar name={emp?.name || "?"} size={40} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate text-zinc-950">{book?.title || "Título removido"}</p>
                        <p className="text-[13px] mt-0.5 truncate text-zinc-500">
                          {emp?.name || "colaborador removido"} · previsto para {fmtDate(l.expectedReturnDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider whitespace-nowrap hidden sm:inline" style={{ color: STATUS_META[status].color }}>
                        {status === "overdue" ? `${Math.abs(d)}d atrasado` : d === 0 ? "vence hoje" : `${d}d restantes`}
                      </span>
                      <div className="flex items-center gap-1 border-l border-zinc-200 pl-4">
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
        {/* Chart 1: Distribuição por Categoria */}
        <div className="bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <BarChart2 size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Livros por Categoria</p>
          </div>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed" style={{ borderColor: COLORS.BORDER_STRONG }}>
              <p className="text-sm font-medium" style={{ color: COLORS.MUTED }}>Ainda não há dados suficientes.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={COLORS.BORDER} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: COLORS.MUTED }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: COLORS.INK, fontWeight: 600 }} width={80} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: `1px solid ${COLORS.BORDER}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f4f4f5' }}
                  />
                  <Bar dataKey="value" fill={COLORS.PURPLE} radius={[0, 4, 4, 0]} barSize={24} name="Títulos" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Status do Acervo */}
        <div className="bg-white rounded-2xl border p-5 md:p-6 shadow-sm" style={{ borderColor: COLORS.BORDER }}>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50">
              <BookOpen size={16} style={{ color: COLORS.PURPLE }} />
            </div>
            <p className="font-bold text-lg brand-font" style={{ color: COLORS.INK }}>Status Atual do Acervo</p>
          </div>
          {collectionStatusData.length === 0 ? (
            <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed" style={{ borderColor: COLORS.BORDER_STRONG }}>
              <p className="text-sm font-medium" style={{ color: COLORS.MUTED }}>Ainda não há dados suficientes.</p>
            </div>
          ) : (
            <div className="h-[280px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={collectionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {collectionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: `1px solid ${COLORS.BORDER}`, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', padding: '8px 12px' }}
                    itemStyle={{ fontWeight: 'bold', color: COLORS.INK }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-3xl font-extrabold text-zinc-950 brand-font">{availableCount + loanedCount + maintenanceCount}</span>
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Total</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Chart 3: Livros mais emprestados */}
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
            <div className="flex flex-col gap-4 mt-2">
              {topBooks.map((r, i) => (
                <div key={r.book.id} className="flex items-center gap-3">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: i === 0 ? "#FEF3C7" : "#F1F5F9", color: i === 0 ? "#D97706" : "#64748B" }}
                  >
                    {i + 1}
                  </span>
                  {r.book.coverUrl ? (
                    <div className="w-10 h-14 rounded overflow-hidden shrink-0 shadow-sm border border-black/10">
                      <img src={r.book.coverUrl} alt={r.book.title} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-14 rounded flex items-center justify-center shrink-0 shadow-sm border border-black/10 bg-gray-50">
                      <BookOpen size={16} style={{ color: COLORS.MUTED }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: COLORS.INK }}>{r.book.title}</p>
                    <p className="text-[11px] truncate text-slate-500 mt-0.5">{r.book.author || "Autor desconhecido"}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 bg-indigo-50 rounded-md shrink-0" style={{ color: COLORS.PURPLE }}>{r.count} emp.</span>
                </div>
              ))}
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
