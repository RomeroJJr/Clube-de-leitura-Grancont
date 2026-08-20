import React, { useState, useRef } from 'react';
import { BookOpen, Pencil, Trash2, AlertCircle, Upload, X, CheckCircle2, Wrench } from 'lucide-react';
import { uid, downloadCSV, availableCopies, tagStyle, COLORS, compressImage } from '../lib/utils';
import { TabHeader, ExportBtn, EmptyState, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle } from './Shared';

export function BooksTab({ books, loans, upsert, remove, notify, isAdmin }: any) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [selectedBook, setSelectedBook] = useState<any>(null);

  const categories = ["Todas", ...Array.from(new Set(books.map((b: any) => b.category || b.area).filter(Boolean))) as string[]];

  const filtered = books.filter((b: any) => {
    const bCat = b.category || b.area || "";
    const matchesQuery =
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      (b.author || "").toLowerCase().includes(query.toLowerCase()) ||
      bCat.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = categoryFilter === "Todas" || bCat === categoryFilter;
    return matchesQuery && matchesCategory;
  });

  function save(form: any) {
    if (!form.title?.trim()) return notify("Informe o título do livro.", "error");
    upsert({ 
      ...form, 
      id: form.id || uid(), 
      title: form.title.trim(), 
      category: form.category?.trim(), 
      totalCopies: Number(form.totalCopies) || 1,
      description: form.description || "",
      coverUrl: form.coverUrl || "",
      maintenance: Boolean(form.maintenance)
    });
    setModal(null);
  }

  function handleDelete(id: string) {
    const hasActive = loans.some((l: any) => l.bookId === id && !l.actualReturnDate);
    if (hasActive) {
      notify("Este título está emprestado no momento. Registre a devolução antes de excluir.", "error");
      setConfirmId(null);
      return;
    }
    remove(id);
    setConfirmId(null);
  }

  function exportCSV() {
    downloadCSV(
      "acervo-grancont.csv",
      ["Título", "Autor", "Categoria", "Exemplares", "Disponíveis"],
      books.map((b: any) => [b.title, b.author || "", b.category || b.area || "", b.totalCopies || 1, availableCopies(b, loans)])
    );
  }

  return (
    <div>
      <TabHeader
        title="Acervo"
        subtitle="Todos os títulos disponíveis para a equipe."
        actionLabel={isAdmin ? "Novo título" : undefined}
        onAction={() => isAdmin && setModal({})}
        query={query}
        setQuery={setQuery}
        placeholder="Buscar por título, autor ou categoria..."
        extra={books.length > 0 && <ExportBtn onClick={exportCSV} />}
      />

      {categories.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap"
              style={categoryFilter === c ? { backgroundColor: COLORS.PURPLE, color: "white" } : tagStyle(c === "Todas" ? "geral-x" : c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={books.length === 0 ? "Nenhum título cadastrado" : "Nada encontrado"}
          subtitle={books.length === 0 ? "Adicione os livros já comprados e os que forem chegando." : "Tente ajustar a busca ou o filtro."}
          actionLabel={books.length === 0 && isAdmin ? "Novo título" : undefined}
          onAction={() => isAdmin && setModal({})}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((b: any) => {
            const avail = availableCopies(b, loans);
            const bCat = b.category || b.area;
            const isMaintenance = b.maintenance;
            
            let statusLabel = "Disponível";
            let statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
            let StatusIcon = CheckCircle2;
            
            if (isMaintenance) {
              statusLabel = "Em Manutenção";
              statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
              StatusIcon = Wrench;
            } else if (avail === 0) {
              statusLabel = "Emprestado";
              statusStyle = "bg-red-50 text-red-700 border-red-200";
              StatusIcon = AlertCircle;
            }

            return (
              <div 
                key={b.id} 
                onClick={() => setSelectedBook(b)}
                className="bg-white rounded-2xl border p-4 flex flex-col hover:shadow-md transition-shadow cursor-pointer relative" 
                style={{ borderColor: COLORS.BORDER }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {b.coverUrl ? (
                      <div className="w-12 h-16 rounded-md overflow-hidden shrink-0 shadow-sm bg-gray-100 border" style={{ borderColor: COLORS.BORDER }}>
                        <img src={b.coverUrl} alt={b.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#F1E9F5" }}>
                        <BookOpen size={18} style={{ color: COLORS.PURPLE }} />
                      </div>
                    )}
                    <div className="flex flex-col items-start">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${statusStyle}`} title={isMaintenance ? "Este título está em manutenção." : ""}>
                        <StatusIcon size={12} />
                        {statusLabel}
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconBtn onClick={() => setModal(b)}><Pencil size={14} /></IconBtn>
                      <IconBtn danger onClick={() => setConfirmId(b.id)}><Trash2 size={14} /></IconBtn>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex-1">
                  <p className="font-semibold leading-snug" style={{ color: COLORS.INK }}>{b.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: COLORS.MUTED }}>{b.author || "Autor não informado"}</p>
                  {b.description && (
                    <p className="text-xs mt-2 line-clamp-2 text-slate-500 leading-relaxed" title={b.description}>
                      {b.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: COLORS.BORDER }}>
                  {bCat ? (
                    <span className="text-xs font-medium rounded-full px-2.5 py-1 truncate max-w-[120px]" style={tagStyle(bCat)}>{bCat}</span>
                  ) : <span />}
                  <span className="text-xs font-bold whitespace-nowrap ml-2" style={{ color: avail > 0 ? "#1F9D64" : "#C63C3C" }}>
                    {avail}/{b.totalCopies || 1} disp.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!modal} title={modal?.id ? "Editar título" : "Novo título"} onClose={() => setModal(null)}>
        {modal && <BookForm initial={modal} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir título?" message="Essa ação não pode ser desfeita." onConfirm={() => handleDelete(confirmId!)} onCancel={() => setConfirmId(null)} />
      
      <BookDetailsModal open={!!selectedBook} book={selectedBook} onClose={() => setSelectedBook(null)} loans={loans} isAdmin={isAdmin} onEdit={() => { setSelectedBook(null); setModal(selectedBook); }} />
    </div>
  );
}

function BookDetailsModal({ open, book, onClose, loans, isAdmin, onEdit }: any) {
  if (!open || !book) return null;
  const avail = availableCopies(book, loans);

  return (
    <Modal open={open} title="Detalhes do Livro" onClose={onClose}>
      <div className="flex flex-col md:flex-row gap-6">
        {book.coverUrl ? (
          <div className="w-full md:w-1/3 max-w-[160px] mx-auto md:mx-0 shrink-0">
            <div className="rounded-xl overflow-hidden shadow-md border" style={{ borderColor: COLORS.BORDER }}>
              <img src={book.coverUrl} alt={book.title} className="w-full h-auto object-cover aspect-[2/3]" />
            </div>
          </div>
        ) : (
          <div className="w-full md:w-1/3 max-w-[160px] mx-auto md:mx-0 shrink-0">
            <div className="rounded-xl flex items-center justify-center bg-gray-50 border border-gray-200 aspect-[2/3]">
              <BookOpen size={48} style={{ color: COLORS.MUTED }} />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex flex-col space-y-4">
          <div>
            <h3 className="text-xl font-bold leading-tight" style={{ color: COLORS.INK }}>{book.title}</h3>
            <p className="text-base mt-1" style={{ color: COLORS.MUTED }}>{book.author || "Autor desconhecido"}</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {book.category && (
              <span className="text-sm font-medium rounded-full px-3 py-1" style={tagStyle(book.category)}>{book.category}</span>
            )}
            {book.maintenance ? (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                <Wrench size={14} /> Em Manutenção
              </span>
            ) : (
              <span className="text-sm font-bold px-3 py-1 rounded-full bg-gray-100" style={{ color: avail > 0 ? "#1F9D64" : "#C63C3C" }}>
                {avail} / {book.totalCopies || 1} disponíveis
              </span>
            )}
          </div>

          {book.description ? (
            <div className="mt-2 bg-gray-50 p-4 rounded-xl border" style={{ borderColor: COLORS.BORDER }}>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: COLORS.MUTED }}>Sinopse</h4>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: COLORS.INK }}>
                {book.description}
              </p>
            </div>
          ) : (
            <p className="text-sm italic" style={{ color: COLORS.MUTED }}>Nenhuma descrição informada para este livro.</p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-6">
        {isAdmin && (
          <button onClick={onEdit} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors shadow-sm flex items-center gap-2">
            <Pencil size={16} /> Editar
          </button>
        )}
        <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm" style={{ backgroundColor: COLORS.PURPLE }}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}

const PREDEFINED_CATEGORIES = [
  "Liderança e Gestão",
  "Finanças e Economia",
  "Desenvolvimento Pessoal",
  "Técnico / Contabilidade",
  "Técnico / Tributário",
  "Marketing e Vendas",
  "Direito e Legislação",
  "Ficção e Literatura",
  "Biografia",
  "Outros"
];

function BookForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({ title: "", author: "", category: initial?.category || initial?.area || "", totalCopies: 1, description: "", coverUrl: "", maintenance: false, ...initial });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isInitialCustom = form.category && !PREDEFINED_CATEGORIES.includes(form.category);
  const [isCustomCategory, setIsCustomCategory] = useState(isInitialCustom);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const base64 = await compressImage(file, 400); // 400px width limit
      setForm(prev => ({ ...prev, coverUrl: base64 }));
    } catch (err) {
      console.error("Failed to process image", err);
      // fallback error handling could go here
    } finally {
      setUploading(false);
    }
  };

  const generateCoverWithAI = async () => {
    if (!form.title) return alert("Preencha o título primeiro!");
    setUploading(true);
    try {
      const res = await fetch("/api/generate-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, author: form.author })
      });
      const data = await res.json();
      if (data.coverUrl) {
        setForm(prev => ({ ...prev, coverUrl: data.coverUrl }));
      } else {
        alert("Não foi possível encontrar uma capa com a IA.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao buscar capa.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Título *</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Pai Rico, Pai Pobre" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Autor</FieldLabel>
          <input className={inputClass} style={inputStyle} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Ex.: Robert Kiyosaki" />
        </div>
        <div>
          <FieldLabel>Imagem de Capa</FieldLabel>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <div className="flex flex-col gap-2 mt-1">
            <div className="flex gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 h-10 px-4 rounded-lg border border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 text-sm font-medium text-slate-600 transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
                ) : (
                  <><Upload size={16} /> Anexar</>
                )}
              </button>
              <button 
                onClick={generateCoverWithAI}
                disabled={uploading || !form.title}
                className="flex flex-1 items-center justify-center gap-2 h-10 px-4 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium text-indigo-700 transition-colors"
                title="Gerar capa com IA"
              >
                Gerar c/ IA
              </button>
            </div>
            {form.coverUrl && (
              <div className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2 rounded-lg mt-1">
                <span className="text-xs font-semibold text-emerald-600 truncate">✓ Imagem carregada</span>
                <button 
                  onClick={() => setForm(prev => ({ ...prev, coverUrl: "" }))}
                  className="w-6 h-6 flex items-center justify-center rounded border border-red-100 bg-white text-red-600 hover:bg-red-50 shrink-0"
                  title="Remover capa"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div>
        <FieldLabel>Descrição / Sinopse</FieldLabel>
        <textarea className={inputClass} style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve resumo sobre o livro..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Categoria / Gênero</FieldLabel>
          <select 
            className={inputClass} 
            style={inputStyle} 
            value={isCustomCategory ? "Outros" : form.category} 
            onChange={(e) => {
              if (e.target.value === "Outros") {
                setIsCustomCategory(true);
                setForm({ ...form, category: "" });
              } else {
                setIsCustomCategory(false);
                setForm({ ...form, category: e.target.value });
              }
            }}
          >
            <option value="" disabled>Selecione...</option>
            {PREDEFINED_CATEGORIES.filter(c => c !== "Outros").map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="Outros">Outros...</option>
          </select>
          {isCustomCategory && (
            <input 
              className={`${inputClass} mt-2`} 
              style={inputStyle} 
              value={form.category} 
              onChange={(e) => setForm({ ...form, category: e.target.value })} 
              placeholder="Digite a nova categoria..." 
            />
          )}
        </div>
        <div>
          <FieldLabel>Exemplares</FieldLabel>
          <input type="number" min="1" className={inputClass} style={inputStyle} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
        </div>
      </div>
      <div className="pt-2 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input 
            type="checkbox" 
            checked={form.maintenance} 
            onChange={(e) => setForm({...form, maintenance: e.target.checked})} 
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" 
          />
          <span className="text-sm font-medium text-slate-700">Livro em manutenção (indisponível para empréstimo)</span>
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button onClick={() => onSave(form)} disabled={uploading} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
      </div>
    </div>
  );
}
