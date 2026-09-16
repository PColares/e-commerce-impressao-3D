const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function brl(value: number): string {
  return currency.format(value).replace(/ /, ' ')
}

export function layerHeightLabel(millimeters: string | number): string {
  return Number(millimeters).toFixed(2)
}
