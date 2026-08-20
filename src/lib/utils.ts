export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso?: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function daysUntil(iso?: string) {
  if (!iso) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function getLoanStatus(loan: any) {
  if (loan.actualReturnDate) return "returned";
  const d = daysUntil(loan.expectedReturnDate);
  if (d < 0) return "overdue";
  if (d <= 3) return "dueSoon";
  return "active";
}

export function availableCopies(book: any, loans: any[]) {
  const active = loans.filter((l) => l.bookId === book.id && !l.actualReturnDate).length;
  return Math.max(0, (book.totalCopies || 1) - active);
}

export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function hueOf(str = "") {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export function tagStyle(str: string, sat = 60, light = 94, textLight = 34) {
  const h = hueOf(str || "geral");
  return { backgroundColor: `hsl(${h},${sat}%,${light}%)`, color: `hsl(${h},${sat}%,${textLight}%)` };
}

export function downloadCSV(filename: string, headers: string[], rows: any[][]) {
  const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function reminderText(empName: string, bookTitle: string, loan: any) {
  const d = daysUntil(loan.expectedReturnDate);
  const overdue = d < 0;
  return `Olá, ${empName}! 👋\n\nPassando para lembrar sobre o livro "${bookTitle}" do clube de leitura: ${
    overdue ? `a devolução está atrasada há ${Math.abs(d)} dia(s).` : `a devolução está prevista para ${fmtDate(loan.expectedReturnDate)}.`
  }\n\nAssim que puder finalizar a leitura, é só devolver. Obrigado! 📚`;
}

export function sendEmailReminder(emp: any, bookTitle: string, loan: any, notify: any) {
  if (!emp?.name) {
    notify("Colaborador não identificado.", "error");
    return;
  }
  notify(`Notificação enviada para ${emp.name} com sucesso!`);
}

export function compressImage(file: File, maxWidth = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scaleSize = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress as JPEG with 70% quality
      };
      img.onerror = (e) => reject(e);
    };
    reader.onerror = (e) => reject(e);
  });
}

export type LoanStatus = "active" | "dueSoon" | "overdue" | "returned";

export const STATUS_META: Record<LoanStatus, { label: string; color: string; bg: string }> = {
  active: { label: "Em dia", color: "#059669", bg: "#D1FAE5" }, // Emerald 600, Emerald 100
  dueSoon: { label: "Vence em breve", color: "#D97706", bg: "#FEF3C7" }, // Amber 600, Amber 100
  overdue: { label: "Atrasado", color: "#DC2626", bg: "#FEE2E2" }, // Red 600, Red 100
  returned: { label: "Devolvido", color: "#64748B", bg: "#F1F5F9" }, // Slate 500, Slate 100
};

export const COLORS = {
  PURPLE: "#70289B", // Grancont Mascot Purple
  PURPLE_DARK: "#4F1B6E", // Grancont Dark
  INK: "#2D1D3A", // Dark purple-grey instead of black
  MUTED: "#786785", // Muted purple-grey
  BORDER: "#EBE6ED", // Light purple-grey
  BORDER_STRONG: "#D4C8D9", // Stronger purple-grey
  BG: "#FCFBFC", // light background with purple tint
};

export function getLast6Months() {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      label: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
      year: d.getFullYear(),
      month: d.getMonth()
    });
  }
  return result;
}
