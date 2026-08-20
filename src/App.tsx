import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { onSnapshot, collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';

import { Bell, Users, BookOpen, ArrowRightLeft, Settings, ShieldAlert, LogOut, Lightbulb, Bookmark, PackagePlus } from "lucide-react";
import { todayISO, addDays, daysUntil, COLORS } from "./lib/utils";
import { Logomark, Toast, ReturnModal, LoginModal } from "./components/Shared";
import { Dashboard } from "./components/Dashboard";
import { EmployeesTab } from "./components/EmployeesTab";
import { BooksTab } from "./components/BooksTab";
import { LoansTab } from "./components/LoansTab";
import { SuggestionsTab } from "./components/SuggestionsTab";
import { ReservationsTab } from "./components/ReservationsTab";
import { AcquisitionsTab } from "./components/AcquisitionsTab";
import { SettingsModal } from "./components/SettingsModal";

const NAV = [
  { key: "dashboard", label: "Painel", icon: Bell },
  { key: "employees", label: "Colaboradores", icon: Users },
  { key: "books", label: "Acervo", icon: BookOpen },
  { key: "acquisitions", label: "Novas Aquisições", icon: PackagePlus },
  { key: "loans", label: "Empréstimos", icon: ArrowRightLeft },
  { key: "reservations", label: "Reservas", icon: Bookmark },
  { key: "suggestions", label: "Sugestões", icon: Lightbulb },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [employees, setEmployees] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [acquisitions, setAcquisitions] = useState<any[]>([]);
  const [settings, setSettings] = useState({ defaultLoanDays: 21 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [returnModal, setReturnModal] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const notify = useCallback((message: string, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const triggerNotifications = useCallback((l: any[]) => {
    const active = l.filter((x: any) => !x.actualReturnDate);
    const overdue = active.filter((x: any) => daysUntil(x.expectedReturnDate) < 0).length;
    if (overdue > 0 && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Clube de Leitura Grancont", { body: `Existem ${overdue} empréstimo(s) atrasado(s). Verifique o painel para enviar lembretes.` });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission();
      }
    }
  }, []);

  const handleLogin = (u: string, p: string) => {
    if (p === 'Grancont123') {
      localStorage.setItem("adminUser", u);
      setUser({ email: u, displayName: u });
      setIsAdmin(true);
      notify("Login realizado com sucesso!");
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    setUser(null);
    setIsAdmin(false);
    notify("Sessão encerrada.");
  };

  useEffect(() => {
    const savedUser = localStorage.getItem("adminUser");
    if (savedUser) {
      setUser({ email: savedUser, displayName: savedUser });
      setIsAdmin(true);
    }
    setAuthLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) setSettings(snap.data() as any);
    }, (err) => console.error(err));

    const unsubEmployees = onSnapshot(collection(db, 'employees'), (snap) => {
      setEmployees(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'employees'));

    const unsubBooks = onSnapshot(collection(db, 'books'), (snap) => {
      setBooks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'books'));

    const unsubLoans = onSnapshot(collection(db, 'loans'), (snap) => {
      const l = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLoans(l);
      triggerNotifications(l);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'loans'));

    const unsubSuggestions = onSnapshot(collection(db, 'suggestions'), (snap) => {
      setSuggestions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'suggestions'));

    const unsubReservations = onSnapshot(collection(db, 'reservations'), (snap) => {
      setReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'reservations'));

    const unsubAcquisitions = onSnapshot(collection(db, 'acquisitions'), (snap) => {
      setAcquisitions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'acquisitions'));

    return () => { unsubSettings(); unsubEmployees(); unsubBooks(); unsubLoans(); unsubSuggestions(); unsubReservations(); unsubAcquisitions(); };
  }, [triggerNotifications]);

  const upsertDoc = async (col: string, item: any, successMsg: string) => {
    try {
      await setDoc(doc(db, col, item.id), item);
      notify(successMsg);
    } catch (e: any) {
      notify(e.message || "Erro ao salvar.", "error");
    }
  };

  const deleteDocItem = async (col: string, id: string, successMsg: string) => {
    try {
      await deleteDoc(doc(db, col, id));
      notify(successMsg);
    } catch (e: any) {
      notify(e.message || "Erro ao remover.", "error");
    }
  };

  const upsertEmployee = async (item: any) => {
    try {
      await setDoc(doc(db, 'employees', item.id), item);
      if (item.email) {
        if (item.role === 'admin') {
          await setDoc(doc(db, 'admins', item.email), { role: 'admin' });
        } else {
          try { await deleteDoc(doc(db, 'admins', item.email)); } catch(e) {}
        }
      }
      notify("Colaborador salvo.");
    } catch (e: any) {
      notify(e.message || "Erro ao salvar.", "error");
    }
  };

  const removeEmployee = async (id: string) => {
    try {
      const emp = employees.find(e => e.id === id);
      await deleteDoc(doc(db, 'employees', id));
      if (emp && emp.email && emp.role === 'admin') {
        try { await deleteDoc(doc(db, 'admins', emp.email)); } catch(e) {}
      }
      notify("Colaborador removido.");
    } catch (e: any) {
      notify(e.message || "Erro ao remover.", "error");
    }
  };
  
  const upsertBook = (item: any) => upsertDoc('books', item, "Título salvo.");
  const removeBook = (id: string) => deleteDocItem('books', id, "Título removido.");
  
  const upsertLoan = async (item: any, silent = false) => {
    try {
      await setDoc(doc(db, 'loans', item.id), item);
      if (!silent) notify("Empréstimo salvo.");
    } catch (e: any) {
      notify(e.message || "Erro ao salvar empréstimo.", "error");
    }
  };
  const saveLoanWithNotice = (item: any) => upsertLoan(item, false);
  const removeLoan = (id: string) => deleteDocItem('loans', id, "Empréstimo removido.");
  
  const extendLoan = (loan: any, days: number) => {
    const base = daysUntil(loan.expectedReturnDate) < 0 ? todayISO() : loan.expectedReturnDate;
    upsertLoan({ ...loan, expectedReturnDate: addDays(base, days), renewals: (loan.renewals || 0) + 1 }, true).then(() => {
      notify(`Prazo renovado por mais ${days} dias.`);
    });
  };
  const markReturned = (loan: any, comment?: string) => {
    upsertLoan({ ...loan, actualReturnDate: todayISO(), feedback: comment }, true).then(() => {
      notify("Devolução registrada.");
    });
  };

  const upsertSuggestion = (item: any) => upsertDoc('suggestions', item, "Sugestão registrada.");
  const removeSuggestion = (id: string) => deleteDocItem('suggestions', id, "Sugestão removida.");

  const upsertReservation = (item: any) => upsertDoc('reservations', item, "Reserva salva.");
  const removeReservation = (id: string) => deleteDocItem('reservations', id, "Reserva cancelada.");

  const upsertAcquisition = (item: any) => upsertDoc('acquisitions', item, "Nova aquisição cadastrada.");
  const removeAcquisition = (id: string) => deleteDocItem('acquisitions', id, "Aquisição removida.");

  const saveSettings = async (s: any) => {
    try {
      await setDoc(doc(db, 'settings', 'global'), s);
      setSettings(s);
      notify("Configurações salvas.");
    } catch (e: any) {
      notify("Erro ao salvar configurações.", "error");
    }
  };

  const overdueCount = loans.filter((l) => !l.actualReturnDate && daysUntil(l.expectedReturnDate) < 0).length;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: COLORS.BG }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full animate-spin" style={{ border: "3px solid #E4DAEC", borderTopColor: COLORS.PURPLE }} />
          <p className="text-sm" style={{ color: COLORS.MUTED }}>Carregando biblioteca...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-zinc-900 font-sans" style={{ backgroundColor: "#fbfbfb", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .brand-font { font-family: 'Lora', serif; }
        select { -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px; padding-right: 32px; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 8px; }
        ::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
      `}</style>

      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 bg-white border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="text-zinc-950 font-bold brand-font text-xl tracking-tight">Clube de Leitura</span>
        </div>
        <button onClick={() => setNavOpen((v) => !v)} className="text-zinc-600 hover:bg-zinc-100 text-sm font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 transition-colors">Menu</button>
      </div>

      <aside
        className={`fixed md:static z-30 top-0 left-0 h-full w-64 flex-col px-5 py-6 transition-transform duration-300 ease-in-out ${navOpen ? "flex translate-x-0" : "hidden md:flex"} shadow-2xl md:shadow-none border-r border-zinc-200 bg-[#fbfbfb]`}
      >
        <p className="text-zinc-500 text-[11px] mb-4 px-3 font-bold uppercase tracking-widest">Clube de Leitura</p>
        <nav className="flex flex-col gap-1.5">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => { setTab(n.key); setNavOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative group overflow-hidden ${active ? "text-zinc-950" : "text-zinc-500 hover:text-zinc-800"}`}
              >
                {active && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 rounded-xl"
                    style={{ backgroundColor: `${COLORS.PURPLE}15` }} // 15% opacity purple
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full" style={{ backgroundColor: COLORS.PURPLE }} />}
                <div className={`absolute inset-0 rounded-xl bg-zinc-900/5 opacity-0 transition-opacity ${!active && "group-hover:opacity-100"}`}></div>
                <n.icon size={18} className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110 text-zinc-400"}`} style={active ? { color: COLORS.PURPLE } : {}} strokeWidth={active ? 2.5 : 2} />
                <span className="relative z-10">{n.label}</span>
                {n.key === "loans" && overdueCount > 0 && (
                  <span className="ml-auto relative z-10 text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm bg-red-600 text-white">
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-6 space-y-1">
          {isAdmin && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-zinc-500 hover:text-zinc-800 hover:bg-zinc-900/5 transition-all mb-2">
              <Settings size={18} className="text-zinc-400" /> Configurações
            </button>
          )}
          <div className="p-3 bg-white rounded-2xl border border-zinc-200 shadow-sm">
            {user ? (
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-3 min-w-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full shrink-0 border border-zinc-100" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 font-bold text-xs shrink-0">
                      {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-zinc-950 text-xs font-bold truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                    <p className="text-zinc-500 text-[10px] truncate mt-0.5">{isAdmin ? "Administrador" : "Leitor"}</p>
                  </div>
                </div>
                <button onClick={handleLogout} title="Sair" className="text-zinc-400 hover:text-zinc-800 transition-colors shrink-0 p-1.5 rounded-md hover:bg-zinc-100">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="w-full">
                <button onClick={() => setLoginOpen(true)} className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-white transition-colors shadow-sm" style={{ backgroundColor: COLORS.INK }}>
                  <ShieldAlert size={16} /> Acesso Admin
                </button>
                <div className="mt-3 text-center">
                  <p className="text-zinc-600 text-xs font-semibold">Modo Leitura</p>
                  <p className="text-zinc-400 text-[10px] mt-0.5">Apenas visualização do acervo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 z-20 md:hidden bg-slate-900/60 backdrop-blur-sm" onClick={() => setNavOpen(false)} />}

      <main className="flex-1 px-4 py-6 md:px-10 md:py-8 pt-20 md:pt-8 max-w-6xl overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -15, filter: 'blur(4px)' }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            {tab === "dashboard" && <Dashboard employees={employees} books={books} loans={loans} suggestions={suggestions} onGoTo={setTab} notify={notify} />}
            {tab === "employees" && (
              <EmployeesTab 
                employees={employees} 
                books={books} 
                loans={loans} 
                upsert={upsertEmployee} 
                remove={removeEmployee} 
                extendLoan={extendLoan} 
                onReturnRequest={setReturnModal} 
                notify={notify} 
                isAdmin={isAdmin} 
                upsertLoan={saveLoanWithNotice} 
                defaultLoanDays={settings.defaultLoanDays} 
              />
            )}
            {tab === "books" && <BooksTab books={books} loans={loans} upsert={upsertBook} remove={removeBook} notify={notify} isAdmin={isAdmin} />}
            {tab === "loans" && (
              <LoansTab
                employees={employees}
                books={books}
                loans={loans}
                upsert={saveLoanWithNotice}
                remove={removeLoan}
                extendLoan={extendLoan}
                onReturnRequest={setReturnModal}
                defaultLoanDays={settings.defaultLoanDays}
                notify={notify}
                isAdmin={isAdmin}
              />
            )}
            {tab === "reservations" && (
              <ReservationsTab
                reservations={reservations}
                employees={employees}
                books={books}
                loans={loans}
                upsert={upsertReservation}
                remove={removeReservation}
                notify={notify}
                isAdmin={isAdmin}
              />
            )}
            {tab === "suggestions" && (
              <SuggestionsTab
                suggestions={suggestions}
                employees={employees}
                upsert={upsertSuggestion}
                remove={removeSuggestion}
                notify={notify}
                isAdmin={isAdmin}
              />
            )}
            {tab === "acquisitions" && (
              <AcquisitionsTab
                acquisitions={acquisitions}
                upsert={upsertAcquisition}
                remove={removeAcquisition}
                notify={notify}
                isAdmin={isAdmin}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={saveSettings} />
      <ReturnModal open={!!returnModal} loan={returnModal} onClose={() => setReturnModal(null)} onConfirm={(l: any, c: string) => { markReturned(l, c); setReturnModal(null); }} />
      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} onLogin={handleLogin} />
      <Toast toast={toast} />
    </div>
  );
}
