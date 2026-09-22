// Classes compartilhadas pelos formulários do painel. text-base no celular:
// campo com fonte menor que 16px faz o navegador dar zoom ao focar.
export const labelClass = 'font-mono text-[11px] uppercase tracking-[0.14em] text-steel/70'
export const fieldClass =
  'w-full rounded-[8px] bg-paper px-3 py-2.5 text-base text-ink sm:text-sm ring-1 ring-line placeholder:text-steel/50 focus:outline-none focus:ring-2 focus:ring-copper'

// Campo numérico opcional do formulário: vazio vira undefined (não é enviado).
export function optionalNumber(value: string | number): number | undefined {
  if (value === '' || value === null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function optionalText(value: string): string | undefined {
  return value.trim() === '' ? undefined : value.trim()
}
