import { ApiError } from '../api'
import { toCents } from '../money'
import type {
  Block,
  Complex,
  DocumentApplication,
  DocumentType,
  FinancialDocument,
  Property,
} from '../types'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.'
}

export function isItemized(type: DocumentType): boolean {
  return type === 'F' || type === 'ND'
}

export function availableCents(
  document: FinancialDocument,
  kind: 'debt' | 'credit',
  applications: DocumentApplication[],
): number {
  const used = applications
    .filter((application) =>
      (kind === 'debt' ? application.debtDocumentId : application.creditDocumentId) === document.id,
    )
    .reduce((sum, application) => sum + (toCents(String(application.appliedAmount)) ?? 0), 0)
  return Math.max(0, (toCents(String(document.totalAmount)) ?? 0) - used)
}

export function complexName(complexes: Complex[], id: string): string {
  return complexes.find((complex) => complex.id === id)?.name ?? 'Conjunto no disponible'
}

export function propertyName(properties: Property[], id: string): string {
  return properties.find((property) => property.id === id)?.name ?? 'Propiedad no disponible'
}

export function blockName(blocks: Block[], id: string): string {
  return blocks.find((block) => block.id === id)?.name ?? 'Bloque no disponible'
}

export function documentTypeName(type: DocumentType): string {
  return ({ F: 'Factura', ND: 'Nota débito', RC: 'Recibo', NC: 'Nota crédito' })[type]
}

export function localDateString(): string {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function errorDetails(error: unknown): string[] {
  return error instanceof ApiError ? error.details : []
}
