import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { api } from '@/lib/api'
import type {
  FailureReason,
  JobPriority,
  JobStatus,
  PrinterManualStatus,
  PrinterStatus,
} from '@/lib/production'

interface QuoteSummary {
  fileName: string
  quantity: number
  material: { name: string }
  color: { name: string; hex: string }
  layerHeight: { millimeters: string }
}

export interface AdminQuote extends QuoteSummary {
  id: string
  fileKey: string
  calculatedPrice: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  user: { name: string; email: string }
  order: { id: string; status: string; _count: { printJobs: number } } | null
}

export interface PrinterSlot {
  id: string
  position: number
  material: { id: string; name: string } | null
  color: { id: string; name: string; hex: string } | null
}

export interface Printer {
  id: string
  name: string
  model: string
  buildVolume: string | null
  nozzleDiameter: string
  manualStatus: PrinterManualStatus
  status: PrinterStatus
  printedMinutes: number
  maintenanceIntervalHours: number | null
  printedMinutesAtLastMaintenance: number
  lastMaintenanceAt: string | null
  maintenanceDue: boolean
  notes: string | null
  slots: PrinterSlot[]
  currentJob: { id: string; title: string; startedAt: string; estimatedMinutes: number | null } | null
  _count: { failures: number }
}

export interface PrintFailure {
  id: string
  reason: FailureReason
  notes: string | null
  wastedGrams: number | null
  createdAt: string
  printer: { name: string } | null
}

export interface PrintJob {
  id: string
  title: string
  status: JobStatus
  priority: JobPriority
  dueDate: string | null
  late: boolean
  estimatedMinutes: number | null
  estimatedGrams: number | null
  notes: string | null
  startedAt: string | null
  printer: { id: string; name: string } | null
  order: { id: string; quoteId: string | null; status: string; user: { name: string }; quote: QuoteSummary | null }
  failures: PrintFailure[]
}

export interface JobInput {
  title?: string
  priority?: JobPriority
  dueDate?: string | null
  estimatedMinutes?: number
  estimatedGrams?: number
  notes?: string
}

export interface PrinterInput {
  name?: string
  model?: string
  buildVolume?: string
  nozzleDiameter?: number
  maintenanceIntervalHours?: number
  notes?: string
  manualStatus?: PrinterManualStatus
}

// Quase toda ação mexe em mais de uma lista (um job iniciado muda o quadro e o
// status da impressora; aprovar orçamento muda a lista de orçamentos), então
// tudo que é da produção é recarregado junto.
function useRefreshProduction() {
  const client = useQueryClient()
  return () =>
    Promise.all(
      ['quotes', 'jobs', 'printers'].map((key) => client.invalidateQueries({ queryKey: ['admin', key] })),
    )
}

function useProductionMutation<TVars>(fn: (vars: TVars) => Promise<unknown>) {
  const refresh = useRefreshProduction()
  return useMutation({ mutationFn: fn, onSuccess: refresh })
}

// O modelo 3D do orçamento, com o nome original (para abrir direto no fatiador).
export const downloadQuoteFile = (quoteId: string, fileName: string) =>
  api.download(`/admin/quotes/${quoteId}/file`, fileName)

export const useAdminQuotes = () =>
  useQuery({ queryKey: ['admin', 'quotes'], queryFn: () => api.get<AdminQuote[]>('/admin/quotes') })

export const usePrinters = () =>
  useQuery({ queryKey: ['admin', 'printers'], queryFn: () => api.get<Printer[]>('/admin/printers') })

export const useJobs = () =>
  useQuery({ queryKey: ['admin', 'jobs'], queryFn: () => api.get<PrintJob[]>('/admin/jobs') })

export const useApproveQuote = () => useProductionMutation((id: string) => api.post(`/admin/quotes/${id}/approve`))
export const useRejectQuote = () => useProductionMutation((id: string) => api.post(`/admin/quotes/${id}/reject`))

export const useCreateJob = () =>
  useProductionMutation((data: JobInput & { orderId: string }) => api.post('/admin/jobs', data))
export const useUpdateJob = () =>
  useProductionMutation(({ id, data }: { id: string; data: JobInput }) => api.patch(`/admin/jobs/${id}`, data))
export const useStartJob = () =>
  useProductionMutation(({ id, printerId }: { id: string; printerId: string }) =>
    api.post(`/admin/jobs/${id}/start`, { printerId }),
  )
export const useFinishPrint = () => useProductionMutation((id: string) => api.post(`/admin/jobs/${id}/finish-print`))
export const useMoveJob = () =>
  useProductionMutation(({ id, status }: { id: string; status: JobStatus }) =>
    api.post(`/admin/jobs/${id}/move`, { status }),
  )
export const useFailJob = () =>
  useProductionMutation(
    ({ id, data }: { id: string; data: { reason: FailureReason; notes?: string; wastedGrams?: number } }) =>
      api.post(`/admin/jobs/${id}/fail`, data),
  )

export const useSavePrinter = () =>
  useProductionMutation(({ id, data }: { id?: string; data: PrinterInput }) =>
    id ? api.patch(`/admin/printers/${id}`, data) : api.post('/admin/printers', data),
  )
export const useDeletePrinter = () => useProductionMutation((id: string) => api.delete(`/admin/printers/${id}`))
export const useRegisterMaintenance = () =>
  useProductionMutation((id: string) => api.post(`/admin/printers/${id}/maintenance`))
export const useSetSlots = () =>
  useProductionMutation(
    ({ id, slots }: { id: string; slots: { position: number; materialId?: string; colorId?: string }[] }) =>
      api.put(`/admin/printers/${id}/slots`, { slots }),
  )
