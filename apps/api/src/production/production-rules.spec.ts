import { describe, it, expect } from 'vitest';
import { canMove, elapsedMinutes, isLate, maintenanceDue, printerStatus } from './production-rules.js';

describe('printerStatus', () => {
  it('manutenção e offline vencem qualquer job', () => {
    expect(printerStatus('MAINTENANCE', true)).toBe('MAINTENANCE');
    expect(printerStatus('OFFLINE', false)).toBe('OFFLINE');
  });

  it('ativa com job imprimindo fica ocupada; sem job, disponível', () => {
    expect(printerStatus('ACTIVE', true)).toBe('PRINTING');
    expect(printerStatus('ACTIVE', false)).toBe('AVAILABLE');
  });
});

describe('maintenanceDue', () => {
  it('sem intervalo definido nunca avisa', () => {
    expect(maintenanceDue({ maintenanceIntervalHours: null, printedMinutes: 99999, printedMinutesAtLastMaintenance: 0 })).toBe(false);
  });

  it('avisa quando as horas desde a última manutenção chegam no intervalo', () => {
    const base = { maintenanceIntervalHours: 100, printedMinutesAtLastMaintenance: 60 * 50 };
    expect(maintenanceDue({ ...base, printedMinutes: 60 * 149 })).toBe(false);
    expect(maintenanceDue({ ...base, printedMinutes: 60 * 150 })).toBe(true);
  });
});

describe('canMove', () => {
  it('segue o fluxo da produção', () => {
    expect(canMove('QUEUED', 'PREPARING')).toBe(true);
    expect(canMove('FINISHING', 'INSPECTION')).toBe(true);
    expect(canMove('INSPECTION', 'READY')).toBe(true);
  });

  it('permite voltar um passo quando faz sentido', () => {
    expect(canMove('PREPARING', 'QUEUED')).toBe(true);
    expect(canMove('INSPECTION', 'FINISHING')).toBe(true);
    expect(canMove('READY', 'INSPECTION')).toBe(true);
  });

  it('não pula etapas nem entra em "imprimindo" sem escolher impressora', () => {
    expect(canMove('QUEUED', 'READY')).toBe(false);
    expect(canMove('PREPARING', 'PRINTING')).toBe(false);
    expect(canMove('QUEUED', 'PRINTING')).toBe(false);
  });

  it('sair de "imprimindo" só pelas ações de terminar ou falhar', () => {
    // Terminar soma as horas na impressora; falhar registra o motivo.
    expect(canMove('PRINTING', 'FINISHING')).toBe(false);
    expect(canMove('PRINTING', 'QUEUED')).toBe(false);
  });
});

describe('isLate', () => {
  const now = new Date('2026-09-22T12:00:00Z');

  it('atrasado é prazo vencido e ainda não pronto', () => {
    expect(isLate({ dueDate: new Date('2026-09-21T12:00:00Z'), status: 'PRINTING' }, now)).toBe(true);
  });

  it('pronto não conta como atrasado, nem job sem prazo', () => {
    expect(isLate({ dueDate: new Date('2026-09-21T12:00:00Z'), status: 'READY' }, now)).toBe(false);
    expect(isLate({ dueDate: null, status: 'QUEUED' }, now)).toBe(false);
    expect(isLate({ dueDate: new Date('2026-09-23T12:00:00Z'), status: 'QUEUED' }, now)).toBe(false);
  });
});

describe('elapsedMinutes', () => {
  it('arredonda para minutos inteiros e nunca fica negativo', () => {
    const start = new Date('2026-09-22T10:00:00Z');
    expect(elapsedMinutes(start, new Date('2026-09-22T12:30:29Z'))).toBe(150);
    expect(elapsedMinutes(start, new Date('2026-09-22T09:00:00Z'))).toBe(0);
    expect(elapsedMinutes(null, new Date())).toBe(0);
  });
});
