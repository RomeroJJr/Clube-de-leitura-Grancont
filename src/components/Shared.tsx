import React, { useState } from 'react';
import { Search, Plus, AlertTriangle, X, Download, Users } from 'lucide-react';
import { hueOf, initials, STATUS_META, LoanStatus, COLORS } from '../lib/utils';

export function Logomark({ size = 32 }: { size?: number }) {
  return (
    <>
      <img 
        src="/logo.png" 
        alt="Mascote Grancont" 
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: '25%' }} 
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const next = e.currentTarget.nextElementSibling as HTMLElement;
          if (next) next.style.display = 'block';
        }}
      />
      <svg className="hidden-fallback" style={{ display: 'none' }} width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="16" fill="white" fillOpacity="0.15" />
        <path d="M20 44V20C20 17.7909 21.7909 16 24 16H40C42.2091 16 44 17.7909 44 20V44L32 38L20 44Z" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 26H38" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M26 32H34" stroke="white" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </>
  );
}

export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const h = hueOf(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, backgroundColor: `hsl(${h},55%,92%)`, color: `hsl(${h},55%,32%)` }}
    >
      {initials(name)}
    </div>
  );
}

export function Badge({ status }: { status: LoanStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, actionLabel, onAction }: any) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-6 border border-zinc-200 bg-white rounded-xl shadow-sm">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5 bg-zinc-100 border border-zinc-200">
        <Icon size={20} className="text-zinc-600" />
      </div>
      <p className="font-semibold text-zinc-900">{title}</p>
      <p className="text-sm mt-1 max-w-sm text-zinc-500">{subtitle}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition-all active:scale-[0.98] shadow-sm"
          style={{ backgroundColor: COLORS.PURPLE }}
        >
          <Plus size={16} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export function Toast({ toast }: { toast: any }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className="fixed bottom-6 right-6 left-6 sm:left-auto z-50 rounded-xl px-4 py-3 shadow-lg text-sm font-medium text-white"
      style={{ backgroundColor: isError ? "#C63C3C" : COLORS.INK, animation: "fadein .2s ease-out" }}
    >
      {toast.message}
    </div>
  );
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-zinc-950/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-zinc-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 border border-red-100">
            <AlertTriangle size={16} className="text-red-600" />
          </div>
          <p className="font-bold text-zinc-900">{title}</p>
        </div>
        <p className="text-sm mb-6 text-zinc-500">{message}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm">
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold mb-1.5" style={{ color: "#6B6478" }}>{children}</label>;
}

export const inputClass = "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[#5B2A79]";
export const inputStyle = { borderColor: COLORS.BORDER_STRONG, color: COLORS.INK };

export function Modal({ open, title, onClose, children, wide }: any) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(36,20,41,0.45)" }}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-xl" : "max-w-lg"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-10" style={{ borderColor: COLORS.BORDER }}>
          <p className="font-bold text-base" style={{ color: COLORS.INK }}>{title}</p>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <X size={18} style={{ color: "#6B6478" }} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}



export function LoginModal({ open, onClose, onLogin }: any) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  const handleConfirm = () => {
    if (onLogin(user, pass)) {
      setUser("");
      setPass("");
      setError("");
      onClose();
    } else {
      setError("Usuário ou senha incorretos.");
    }
  };

  return (
    <Modal open={open} title="Acesso Restrito" onClose={onClose}>
      <div className="space-y-4">
        {error && <div className="text-red-600 text-sm font-semibold mb-2 bg-red-50 p-2 rounded-lg">{error}</div>}
        <div>
          <FieldLabel>Usuário</FieldLabel>
          <input className={inputClass} style={inputStyle} value={user} onChange={(e) => setUser(e.target.value)} placeholder="E-mail ou Nome" />
        </div>
        <div>
          <FieldLabel>Senha</FieldLabel>
          <input type="password" className={inputClass} style={inputStyle} value={pass} onChange={(e) => setPass(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirm()} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
          <button onClick={handleConfirm} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Entrar</button>
        </div>
      </div>
    </Modal>
  );
}

export function ReturnModal({ open, loan, onClose, onConfirm }: any) {
  const [comment, setComment] = useState("");
  
  if (!open || !loan) return null;
  
  return (
    <Modal open={open} title="Registrar Devolução" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm" style={{ color: COLORS.MUTED }}>
          Confirme a devolução do livro. Se o colaborador deixou algum feedback sobre a leitura, você pode registrá-lo abaixo.
        </p>
        <div>
          <FieldLabel>Comentário sobre a leitura (Opcional)</FieldLabel>
          <textarea
            className={inputClass}
            style={{ ...inputStyle, minHeight: "80px", resize: "none" }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Livro excelente, leitura muito recomendada para a área..."
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
          <button onClick={() => { onConfirm(loan, comment); setComment(""); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Confirmar Devolução</button>
        </div>
      </div>
    </Modal>
  );
}

export function IconBtn({ children, onClick, danger, title }: any) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
        danger 
          ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {children}
    </button>
  );
}

export function TabHeader({ title, subtitle, actionLabel, onAction, query, setQuery, placeholder, extra }: any) {
  return (
    <div className="mb-8 border-b border-zinc-200 pb-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 brand-font">{title}</h1>
          {subtitle && <p className="text-sm mt-2 text-zinc-500 max-w-lg leading-relaxed">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {extra}
          {actionLabel && (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-all shadow-sm active:scale-[0.98]"
              style={{ backgroundColor: COLORS.PURPLE }}
            >
              <Plus size={16} /> <span className="hidden sm:inline">{actionLabel}</span>
            </button>
          )}
        </div>
      </div>
      {(setQuery || placeholder) && (
        <div className="relative mt-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full md:w-80 pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-white border-zinc-200 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-sm"
          />
        </div>
      )}
    </div>
  );
}

export function ExportBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Exportar CSV"
      className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm shrink-0"
    >
      <Download size={16} /> <span className="hidden lg:inline">Exportar</span>
    </button>
  );
}
