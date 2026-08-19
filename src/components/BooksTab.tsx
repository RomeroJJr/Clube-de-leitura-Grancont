import React, { useState } from 'react';
import { BookOpen, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { uid, downloadCSV, availableCopies, tagStyle, COLORS } from '../lib/utils';
import { TabHeader, ExportBtn, EmptyState, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle } from './Shared';

export function BooksTab({ books, loans, upsert, remove, notify, isAdmin }: any) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("Todas");

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
    upsert({ ...form, id: form.id || uid(), title: form.title.trim(), category: form.category?.trim(), totalCopies: Number(form.totalCopies) || 1 });
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
            return (
              <div key={b.id} className="bg-white rounded-2xl border p-4 flex flex-col hover:shadow-md transition-shadow" style={{ borderColor: COLORS.BORDER }}>
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
                      {avail < (b.totalCopies || 1) && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-50 text-red-600 border border-red-100 mb-1" title="Existem exemplares emprestados deste título">
                          <AlertCircle size={10} />
                          Emprestado
                        </div>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
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
    </div>
  );
}

function BookForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({ title: "", author: "", category: initial?.category || initial?.area || "", totalCopies: 1, description: "", coverUrl: "", ...initial });
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Título *</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: Pai Rico, Pai Pobre" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Autor</FieldLabel>
          <input className={inputClass} style={inputStyle} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Ex.: Robert Kiyosaki" />
        </div>
        <div>
          <FieldLabel>Link da Imagem de Capa (URL)</FieldLabel>
          <input className={inputClass} style={inputStyle} value={form.coverUrl} onChange={(e) => setForm({ ...form, coverUrl: e.target.value })} placeholder="https://..." type="url" />
        </div>
      </div>
      <div>
        <FieldLabel>Descrição / Sinopse</FieldLabel>
        <textarea className={inputClass} style={{ ...inputStyle, minHeight: '80px', resize: 'none' }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Breve resumo sobre o livro..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Categoria / Gênero</FieldLabel>
          <input className={inputClass} style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Ex.: Finanças, Ficção..." list="categories-list" />
        </div>
        <div>
          <FieldLabel>Exemplares</FieldLabel>
          <input type="number" min="1" className={inputClass} style={inputStyle} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
      </div>
    </div>
  );
}
