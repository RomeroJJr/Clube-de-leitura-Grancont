import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from 'motion/react';
import { onSnapshot, collection, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';

import { Bell, Users, BookOpen, ArrowRightLeft, Settings, ShieldAlert, LogOut, Lightbulb } from "lucide-react";
import { todayISO, addDays, daysUntil, COLORS } from "./lib/utils";
import { Logomark, Toast, ReturnModal } from "./components/Shared";
import { Dashboard } from "./components/Dashboard";
import { EmployeesTab } from "./components/EmployeesTab";
import { BooksTab } from "./components/BooksTab";
import { LoansTab } from "./components/LoansTab";
import { SuggestionsTab } from "./components/SuggestionsTab";
import { SettingsModal } from "./components/SettingsModal";

const NAV = [
  { key: "dashboard", label: "Painel", icon: Bell },
  { key: "employees", label: "Colaboradores", icon: Users },
  { key: "books", label: "Acervo", icon: BookOpen },
  { key: "loans", label: "Empréstimos", icon: ArrowRightLeft },
  { key: "suggestions", label: "Sugestões", icon: Lightbulb },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [employees, setEmployees] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [settings, setSettings] = useState({ defaultLoanDays: 21 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: string } | null>(null);
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [returnModal, setReturnModal] = useState<any>(null);
  
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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      if (user.email === 'rjuniiior40@gmail.com') {
        setIsAdmin(true);
        return;
      }
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.email || user.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          setIsAdmin(employees.some(e => e.email === user.email && e.role === 'admin'));
        }
      } catch (e) {
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user, employees]);

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
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'suggestions'));

    return () => { unsubSettings(); unsubEmployees(); unsubBooks(); unsubLoans(); unsubSuggestions(); };
  }, [triggerNotifications]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      notify("Login realizado com sucesso!");
    } catch (e: any) {
      notify(e.message || "Erro ao fazer login.", "error");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    notify("Sessão encerrada.");
  };

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
    <div className="min-h-screen flex" style={{ backgroundColor: COLORS.BG, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadein { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .brand-font { font-family: 'Manrope', system-ui, sans-serif; }
        select { -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%236B6478' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 10px center; background-size: 16px; padding-right: 32px; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: #E4DAEC; border-radius: 8px; }
      `}</style>

      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3" style={{ backgroundColor: COLORS.PURPLE }}>
        <div className="flex items-center gap-2">
          <Logomark size={26} />
          <span className="text-white font-bold brand-font">grancont</span>
        </div>
        <button onClick={() => setNavOpen((v) => !v)} className="text-white text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>Menu</button>
      </div>

      <aside
        className={`fixed md:static z-30 top-0 left-0 h-full w-64 flex-col px-5 py-6 transition-transform duration-200 ${navOpen ? "flex translate-x-0" : "hidden md:flex"} shadow-2xl md:shadow-none border-r border-white/10`}
        style={{ background: `linear-gradient(180deg, ${COLORS.PURPLE} 0%, ${COLORS.PURPLE_DARK} 100%)` }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="relative shadow-lg rounded-2xl overflow-hidden shrink-0 group cursor-pointer">
            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Logomark size={38} />
          </div>
          <div>
            <p className="text-white font-extrabold text-xl leading-none brand-font tracking-tight drop-shadow-sm">grancont</p>
            <p className="text-white/60 text-[10px] tracking-[0.2em] uppercase mt-1">soluções</p>
          </div>
        </div>
        <div className="h-px w-full bg-white/10 my-5"></div>
        <p className="text-white/50 text-[11px] mb-3 px-2 font-bold uppercase tracking-wider">Clube de Leitura</p>
        <nav className="flex flex-col gap-1.5">
          {NAV.map((n) => {
            const active = tab === n.key;
            return (
              <button
                key={n.key}
                onClick={() => { setTab(n.key); setNavOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative group overflow-hidden"
                style={{ 
                  color: active ? COLORS.PURPLE_DARK : "rgba(255,255,255,0.75)", 
                }}
              >
                {active && (
                  <motion.div 
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-white rounded-xl shadow-sm"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`absolute inset-0 rounded-xl bg-white/10 opacity-0 transition-opacity ${!active && "group-hover:opacity-100"}`}></div>
                <n.icon size={18} className={`relative z-10 transition-transform duration-300 ${active ? "scale-110" : "group-hover:scale-110"}`} />
                <span className="relative z-10">{n.label}</span>
                {n.key === "loans" && overdueCount > 0 && (
                  <span className="ml-auto relative z-10 text-[10px] font-bold rounded-full px-2 py-0.5 shadow-sm" style={{ backgroundColor: active ? "#FBEAEA" : "#C63C3C", color: active ? "#C63C3C" : "white" }}>
                    {overdueCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 border-t space-y-1" style={{ borderColor: "rgba(255,255,255,0.15)" }}>
          {isAdmin && (
            <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-white/80 hover:bg-white/15 transition-colors mb-2">
              <Settings size={18} /> Configurações
            </button>
          )}
          <div className="flex items-center justify-between gap-3 px-2 py-2 w-full">
            {user ? (
              <>
                <div className="flex items-center gap-3 min-w-0">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {user?.email?.substring(0, 2).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{user?.displayName || user?.email?.split('@')[0]}</p>
                    <p className="text-white/50 text-[10px] truncate">{isAdmin ? "Administrador" : "Leitor"}</p>
                  </div>
                </div>
                <button onClick={handleLogout} title="Sair" className="text-white/50 hover:text-white transition-colors">
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <div className="w-full">
                <button onClick={handleLogin} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold w-full text-white/80 hover:bg-white/15 transition-colors">
                  <ShieldAlert size={18} /> Acesso Admin
                </button>
                <div className="mt-4 px-3 py-2">
                  <p className="text-white/70 text-xs font-semibold">Modo Leitura</p>
                  <p className="text-white/40 text-[10px] mt-0.5">Apenas visualização do acervo</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {navOpen && <div className="fixed inset-0 z-20 md:hidden" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setNavOpen(false)} />}

      <main className="flex-1 px-4 py-6 md:px-10 md:py-8 pt-20 md:pt-8 max-w-6xl overflow-y-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {tab === "dashboard" && <Dashboard employees={employees} books={books} loans={loans} suggestions={suggestions} onGoTo={setTab} notify={notify} />}
            {tab === "employees" && (
              <EmployeesTab employees={employees} books={books} loans={loans} upsert={upsertEmployee} remove={removeEmployee} extendLoan={extendLoan} onReturnRequest={setReturnModal} notify={notify} isAdmin={isAdmin} />
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
          </motion.div>
        </AnimatePresence>
      </main>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} onSave={saveSettings} />
      <ReturnModal open={!!returnModal} loan={returnModal} onClose={() => setReturnModal(null)} onConfirm={(l: any, c: string) => { markReturned(l, c); setReturnModal(null); }} />
      <Toast toast={toast} />
    </div>
  );
}
