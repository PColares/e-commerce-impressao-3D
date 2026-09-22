import type {
  PrinterManualStatus,
  PrintJobStatus,
} from '../generated/prisma/client.js';

export type PrinterStatus = 'AVAILABLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE';

// "Imprimindo" e "Disponível" saem dos jobs, não de um campo salvo: assim o
// status nunca fica desatualizado. Só manutenção/offline são definidos à mão.
export function printerStatus(manual: PrinterManualStatus, hasPrintingJob: boolean): PrinterStatus {
  if (manual !== 'ACTIVE') return manual;
  return hasPrintingJob ? 'PRINTING' : 'AVAILABLE';
}

export function maintenanceDue(printer: {
  maintenanceIntervalHours: number | null;
  printedMinutes: number;
  printedMinutesAtLastMaintenance: number;
}): boolean {
  if (!printer.maintenanceIntervalHours) return false;
  const hoursSince = (printer.printedMinutes - printer.printedMinutesAtLastMaintenance) / 60;
  return hoursSince >= printer.maintenanceIntervalHours;
}

// Movimentos livres entre colunas. Entrar em PRINTING só pelo "iniciar"
// (exige impressora) e sair dele só por "terminar" ou "falhou".
const MOVES: Record<PrintJobStatus, PrintJobStatus[]> = {
  QUEUED: ['PREPARING'],
  PREPARING: ['QUEUED'],
  PRINTING: [],
  FINISHING: ['INSPECTION'],
  INSPECTION: ['READY', 'FINISHING'],
  READY: ['INSPECTION'],
};

export function canMove(from: PrintJobStatus, to: PrintJobStatus): boolean {
  return MOVES[from].includes(to);
}

export function isLate(job: { dueDate: Date | null; status: PrintJobStatus }, now: Date): boolean {
  return job.dueDate !== null && job.status !== 'READY' && job.dueDate.getTime() < now.getTime();
}

export function elapsedMinutes(from: Date | null, to: Date): number {
  if (!from) return 0;
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
}
