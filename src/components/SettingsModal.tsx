import React, { useState, useEffect } from 'react';
import { Modal, FieldLabel, inputClass, inputStyle } from './Shared';
import { COLORS } from '../lib/utils';

export function SettingsModal({ open, onClose, settings, onSave }: any) {
  const [days, setDays] = useState(settings.defaultLoanDays);
  useEffect(() => setDays(settings.defaultLoanDays), [settings]);
  return (
    <Modal open={open} title="Configurações" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>Prazo padrão de empréstimo (dias)</FieldLabel>
          <input type="number" min="1" className={inputClass} style={inputStyle} value={days} onChange={(e) => setDays(e.target.value)} />
          <p className="text-xs mt-1.5" style={{ color: COLORS.MUTED }}>Usado para sugerir a data de devolução ao registrar um novo empréstimo.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ color: COLORS.INK, backgroundColor: COLORS.BORDER }}>Cancelar</button>
          <button onClick={() => { onSave({ ...settings, defaultLoanDays: Number(days) || 21 }); onClose(); }} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: COLORS.PURPLE }}>Salvar</button>
        </div>
      </div>
    </Modal>
  );
}
