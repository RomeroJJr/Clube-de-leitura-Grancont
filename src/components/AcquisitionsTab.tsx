import React, { useState } from 'react';
import { PackagePlus, Calendar, Trash2, Pencil, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { uid, COLORS, fmtDate } from '../lib/utils';
import { TabHeader, EmptyState, IconBtn, Modal, ConfirmDialog, FieldLabel, inputClass, inputStyle } from './Shared';

export function AcquisitionsTab({ acquisitions, upsert, remove, onArrived, notify, isAdmin }: any) {
  const [modal, setModal] = useState<any>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [arriveConfirmId, setArriveConfirmId] = useState<any>(null);

  const sorted = [...(acquisitions || [])].sort((a: any, b: any) => {
    return new Date(a.expectedDate || '2099-01-01').getTime() - new Date(b.expectedDate || '2099-01-01').getTime();
  });

  function save(form: any) {
    if (!form.title?.trim()) return notify("Informe o título da obra.", "error");
    upsert({ 
      ...form, 
      id: form.id || uid(), 
      title: form.title.trim()
    });
    setModal(null);
  }

  return (
    <div>
      <TabHeader
        title="Novas Aquisições"
        subtitle="Próximos títulos que chegarão no acervo da Grancont."
        actionLabel={isAdmin ? "Nova Aquisição" : undefined}
        onAction={() => setModal({ expectedDate: new Date().toISOString().split('T')[0] })}
        query=""
        setQuery={() => {}}
        placeholder=""
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={PackagePlus}
          title="Nenhuma nova aquisição"
          subtitle="Ainda não há livros previstos para entrar no acervo."
          actionLabel={isAdmin ? "Cadastrar Título" : undefined}
          onAction={() => setModal({ expectedDate: new Date().toISOString().split('T')[0] })}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {sorted.map((item: any) => (
            <div key={item.id} className="bg-white rounded-2xl border p-4 flex flex-col hover:shadow-md transition-shadow relative overflow-hidden group" style={{ borderColor: COLORS.BORDER }}>
              <div className="flex gap-4 mb-4">
                <div className="w-20 h-28 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border" style={{ borderColor: COLORS.BORDER }}>
                  {item.coverUrl ? (
                    <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="text-gray-300" size={24} />
                  )}
                </div>
                <div className="min-w-0 flex-1 py-1">
                  <p className="font-bold text-base leading-snug" style={{ color: COLORS.INK }}>{item.title}</p>
                  <p className="text-sm mt-1" style={{ color: COLORS.MUTED }}>{item.author || "Autor desconhecido"}</p>
                  
                  {item.expectedDate && (
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-100">
                      <Calendar size={12} />
                      <span>Chega em: {fmtDate(item.expectedDate)}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {isAdmin && (
                <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t" style={{ borderColor: COLORS.BORDER }}>
                  <button 
                    onClick={() => setArriveConfirmId(item)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <CheckCircle size={14} />
                    Chegou
                  </button>
                  <div className="flex items-center gap-2">
                    <IconBtn onClick={() => setModal(item)}><Pencil size={16} /></IconBtn>
                    <IconBtn danger onClick={() => setConfirmId(item.id)}><Trash2 size={16} /></IconBtn>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} title={modal?.id ? "Editar Aquisição" : "Nova Aquisição"} onClose={() => setModal(null)}>
        {modal && <AcquisitionForm initial={modal} onSave={save} onCancel={() => setModal(null)} />}
      </Modal>

      <ConfirmDialog open={!!confirmId} title="Excluir aquisição?" message="Esse título não aparecerá mais como próxima novidade." onConfirm={() => { remove(confirmId!); setConfirmId(null); }} onCancel={() => setConfirmId(null)} />
      
      <ConfirmDialog 
        open={!!arriveConfirmId} 
        title="Livro Chegou?" 
        message={`Confirma que o exemplar "${arriveConfirmId?.title}" chegou no escritório? Ele será transferido para o Acervo principal e ficará disponível para empréstimo.`} 
        onConfirm={() => { 
          if(onArrived) onArrived(arriveConfirmId); 
          setArriveConfirmId(null); 
        }} 
        onCancel={() => setArriveConfirmId(null)} 
        confirmLabel="Confirmar"
        confirmStyle="success"
      />
    </div>
  );
}

function AcquisitionForm({ initial, onSave, onCancel }: any) {
  const [form, setForm] = useState({ title: "", author: "", coverUrl: "", expectedDate: "", ...initial });
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm({ ...form, coverUrl: ev.target?.result as string });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Título da Obra *</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: A Arte da Guerra" />
      </div>
      <div>
        <FieldLabel>Autor (Opcional)</FieldLabel>
        <input className={inputClass} style={inputStyle} value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} placeholder="Ex.: Sun Tzu" />
      </div>
      <div>
        <FieldLabel>Data Prevista de Chegada (Opcional)</FieldLabel>
        <input type="date" className={inputClass} style={inputStyle} value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
      </div>
      
      <div>
        <FieldLabel>Capa do Livro (Opcional)</FieldLabel>
        <div className="flex items-center gap-4">
          <div className="w-16 h-24 bg-gray-100 rounded border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {form.coverUrl ? (
              <img src={form.coverUrl} alt="Capa" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="text-gray-300" size={20} />
            )}
          </div>
          <div className="flex-1">
            <input type="file" accept="image/*" id="cover-upload-acq" className="hidden" onChange={handleFileChange} disabled={uploading} />
            <label htmlFor="cover-upload-acq" className={`inline-block px-4 py-2 rounded-lg text-sm font-semibold border cursor-pointer transition-colors ${uploading ? 'opacity-50' : 'hover:bg-gray-50'}`} style={{ borderColor: COLORS.BORDER, color: COLORS.INK }}>
              {uploading ? "Carregando..." : "Escolher Imagem"}
            </label>
            <p className="text-xs mt-2" style={{ color: COLORS.MUTED }}>JPG ou PNG.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <button onClick={onCancel} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-zinc-700 hover:bg-zinc-100 transition-colors">Cancelar</button>
        <button onClick={() => onSave(form)} disabled={uploading} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors shadow-sm" style={{ backgroundColor: COLORS.PURPLE }}>
          Salvar
        </button>
      </div>
    </div>
  );
}
