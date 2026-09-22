// Rótulos e formatação da área de produção (só o painel usa).

export type JobStatus = 'QUEUED' | 'PREPARING' | 'PRINTING' | 'FINISHING' | 'INSPECTION' | 'READY'
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH'
export type PrinterStatus = 'AVAILABLE' | 'PRINTING' | 'MAINTENANCE' | 'OFFLINE'
export type PrinterManualStatus = 'ACTIVE' | 'MAINTENANCE' | 'OFFLINE'
export type FailureReason =
  | 'WARPING'
  | 'SPAGHETTI'
  | 'NOZZLE_CLOG'
  | 'BED_ADHESION'
  | 'LAYER_SHIFT'
  | 'FILAMENT_RUNOUT'
  | 'POWER_OUTAGE'
  | 'OTHER'

export const JOB_COLUMNS: { status: JobStatus; label: string }[] = [
  { status: 'QUEUED', label: 'Fila' },
  { status: 'PREPARING', label: 'Preparando' },
  { status: 'PRINTING', label: 'Imprimindo' },
  { status: 'FINISHING', label: 'Acabamento' },
  { status: 'INSPECTION', label: 'Conferência' },
  { status: 'READY', label: 'Pronto' },
]

export const PRIORITY_LABEL: Record<JobPriority, string> = { LOW: 'Baixa', NORMAL: 'Normal', HIGH: 'Alta' }

export const PRINTER_STATUS_LABEL: Record<PrinterStatus, string> = {
  AVAILABLE: 'Disponível',
  PRINTING: 'Imprimindo',
  MAINTENANCE: 'Em manutenção',
  OFFLINE: 'Offline',
}

export const MANUAL_STATUS_LABEL: Record<PrinterManualStatus, string> = {
  ACTIVE: 'Ativa',
  MAINTENANCE: 'Em manutenção',
  OFFLINE: 'Offline',
}

export const FAILURE_LABEL: Record<FailureReason, string> = {
  WARPING: 'Empenamento (warping)',
  SPAGHETTI: 'Spaghetti (soltou da mesa)',
  NOZZLE_CLOG: 'Bico entupido',
  BED_ADHESION: 'Não aderiu à mesa',
  LAYER_SHIFT: 'Deslocamento de camada',
  FILAMENT_RUNOUT: 'Filamento acabou',
  POWER_OUTAGE: 'Queda de energia',
  OTHER: 'Outro',
}

export const QUOTE_STATUS_LABEL = { PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Recusado' } as const

export function duration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// O negócio é em Belém: prazos e datas aparecem no fuso de lá, qualquer que
// seja o fuso do computador que abrir o painel.
const TIME_ZONE = 'America/Belem'

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TIME_ZONE }).format(
    new Date(iso),
  )
}

export function dateInputValue(iso: string | null): string {
  if (!iso) return ''
  // en-CA formata como AAAA-MM-DD, o formato do <input type="date">.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso))
}

// "Prazo 30/09" quer dizer até o fim do dia 30 em Belém (UTC-3, sem horário
// de verão). Salvar só a data viraria meia-noite UTC, que em Belém ainda é 29.
export function dueDateFromInput(value: string): string | null {
  return value ? `${value}T23:59:59-03:00` : null
}
