import type {
  AppData,
  AuthUser,
  Block,
  Complex,
  DocumentApplication,
  FinancialConcept,
  FinancialDocument,
  Owner,
  Property,
  Role,
  User,
} from './types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api')
  ?.trim()
  .replace(/\/+$/, '') ?? ''

export class ApiError extends Error {
  status: number
  details: string[]

  constructor(message: string, status: number, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

function extractErrorMessage(payload: unknown, fallback: string): { message: string; details: string[] } {
  if (!payload || typeof payload !== 'object') return { message: fallback, details: [] }

  const record = payload as Record<string, unknown>
  const rawMessage = record.message
  const messages = Array.isArray(rawMessage)
    ? rawMessage.filter((value): value is string => typeof value === 'string')
    : typeof rawMessage === 'string'
      ? [rawMessage]
      : []

  return {
    message: messages[0] ?? (typeof record.error === 'string' ? record.error : fallback),
    details: messages.slice(1),
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      'No fue posible conectar con la API. Revisa VITE_API_BASE_URL, la disponibilidad del backend y su configuración CORS.',
      0,
    )
  }

  const text = await response.text()
  if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
    throw new ApiError(
      'La URL respondió con HTML en lugar de la API. Configura VITE_API_BASE_URL o API_PROXY_TARGET.',
      response.status,
    )
  }
  let payload: unknown
  if (text) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    const error = extractErrorMessage(payload, `La API respondió con error ${response.status}.`)
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ph:unauthorized'))
    }
    throw new ApiError(error.message, response.status, error.details)
  }

  return payload as T
}

function list<T>(payload: unknown, resource: string): T[] {
  const value = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)
      ? (payload as { data: unknown[] }).data
      : null
  if (!value) {
    throw new Error(`La respuesta de ${resource} no tiene el formato esperado (lista). Revisa la URL de la API y su formato JSON.`)
  }
  return value as T[]
}

export function sanitizeUser(value: unknown): User {
  if (!value || typeof value !== 'object') throw new Error('La API devolvió un usuario inválido.')
  const envelope = value as Record<string, unknown>
  const raw = envelope.user && typeof envelope.user === 'object'
    ? envelope.user as Record<string, unknown>
    : envelope.data && typeof envelope.data === 'object'
      ? envelope.data as Record<string, unknown>
      : envelope
  const userRoles = Array.isArray(raw.userRoles)
    ? raw.userRoles.flatMap((item) => {
        if (!item || typeof item !== 'object') return []
        const role = (item as { role?: unknown }).role
        if (!role || typeof role !== 'object') return []
        const roleData = role as Record<string, unknown>
        return [{
          role: {
            id: String(roleData.id ?? ''),
            phId: typeof roleData.phId === 'string' ? roleData.phId : null,
            name: String(roleData.name ?? ''),
            description: String(roleData.description ?? ''),
          },
        }]
      })
    : []

  return {
    id: String(raw.id ?? ''),
    phId: String(raw.phId ?? ''),
    email: String(raw.email ?? ''),
    isActived: raw.isActived === true,
    lastLogin: typeof raw.lastLogin === 'string' ? raw.lastLogin : null,
    userRoles,
  }
}

async function getList<T>(path: string, resource: string): Promise<T[]> {
  return list<T>(await request<unknown>(path), resource)
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
})

export const api = {
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await request<unknown>('/auth/login', json('POST', { email, password }))
    return sanitizeUser(response)
  },
  async currentUser(): Promise<AuthUser> {
    return sanitizeUser(await request<unknown>('/auth/me'))
  },
  logout: () => request<{ loggedOut: boolean }>('/auth/logout', json('POST')),
  async loadData(): Promise<AppData> {
    const [complexes, blocks, properties, usersRaw, roles, owners, concepts, documents, applications] =
      await Promise.all([
        getList<Complex>('/complex', 'conjuntos'),
        getList<Block>('/blocks', 'bloques'),
        getList<Property>('/properties', 'propiedades'),
        getList<unknown>('/users', 'usuarios'),
        getList<Role>('/roles', 'roles'),
        getList<Owner>('/owners', 'propietarios'),
        getList<FinancialConcept>('/financial-concepts', 'conceptos'),
        getList<FinancialDocument>('/financial-documents', 'documentos'),
        getList<DocumentApplication>('/document-applications', 'aplicaciones'),
      ])

    return {
      complexes,
      blocks,
      properties,
      users: usersRaw.map(sanitizeUser),
      roles,
      owners,
      concepts,
      documents,
      applications,
    }
  },
  createComplex: (body: Omit<Complex, 'id'>) =>
    request<Complex>('/complex', json('POST', body)),
  updateComplex: (id: string, body: Partial<Omit<Complex, 'id'>>) =>
    request<unknown>(`/complex/${id}`, json('PATCH', body)),
  deleteComplex: (id: string) => request<unknown>(`/complex/${id}`, json('DELETE')),
  createBlock: (body: Omit<Block, 'id'>) =>
    request<Block>('/blocks', json('POST', body)),
  updateBlock: (id: string, body: Partial<Omit<Block, 'id'>>) =>
    request<unknown>(`/blocks/${id}`, json('PATCH', body)),
  deleteBlock: (id: string) => request<unknown>(`/blocks/${id}`, json('DELETE')),
  createProperty: (body: Omit<Property, 'id' | 'block' | 'owners'>) =>
    request<Property>('/properties', json('POST', body)),
  updateProperty: (id: string, body: Partial<Omit<Property, 'id' | 'block' | 'owners'>>) =>
    request<unknown>(`/properties/${id}`, json('PATCH', body)),
  deleteProperty: (id: string) => request<unknown>(`/properties/${id}`, json('DELETE')),
  createOwner: (body: Omit<Owner, 'id' | 'properties'> & { propertyIds: string[] }) =>
    request<Owner>('/owners', json('POST', body)),
  updateOwner: (id: string, body: Partial<Omit<Owner, 'id' | 'properties'>> & { propertyIds?: string[] }) =>
    request<Owner>(`/owners/${id}`, json('PATCH', body)),
  deleteOwner: (id: string) => request<unknown>(`/owners/${id}`, json('DELETE')),
  createConcept: (body: { phId: string | null; name: string; description: string | null }) =>
    request<FinancialConcept>('/financial-concepts', json('POST', body)),
  updateConcept: (id: string, body: Partial<{ phId: string | null; name: string; description: string | null }>) =>
    request<FinancialConcept>(`/financial-concepts/${id}`, json('PATCH', body)),
  deleteConcept: (id: string) => request<unknown>(`/financial-concepts/${id}`, json('DELETE')),
  createRole: (body: { phId: string | null; name: string; description: string }) =>
    request<Role>('/roles', json('POST', body)),
  updateRole: (id: string, body: Partial<{ phId: string | null; name: string; description: string }>) =>
    request<Role>(`/roles/${id}`, json('PATCH', body)),
  deleteRole: (id: string) => request<unknown>(`/roles/${id}`, json('DELETE')),
  async createUser(body: { phId: string; email: string; password: string; isActived: boolean }) {
    const user = sanitizeUser(await request<unknown>('/users', json('POST', body)))
    return { id: user.id }
  },
  async updateUser(id: string, body: { phId?: string; email?: string; password?: string; isActived?: boolean }) {
    const user = sanitizeUser(await request<unknown>(`/users/${id}`, json('PATCH', body)))
    return { id: user.id }
  },
  assignRole: (userId: string, roleId: string) =>
    request<unknown>(`/users/${userId}/roles/${roleId}`, json('POST')),
  removeRole: (userId: string, roleId: string) =>
    request<unknown>(`/users/${userId}/roles/${roleId}`, json('DELETE')),
  createDocument: (body: Omit<FinancialDocument, 'id' | 'property' | 'items' | 'status'> & { status?: FinancialDocument['status']; items?: FinancialDocument['items'] }) =>
    request<FinancialDocument>('/financial-documents', json('POST', body)),
  updateDocument: (id: string, body: Partial<Omit<FinancialDocument, 'id' | 'property'>>) =>
    request<FinancialDocument>(`/financial-documents/${id}`, json('PATCH', body)),
  createApplication: (body: { phId: string; debtDocumentId: string; creditDocumentId: string; appliedAmount: number }) =>
    request<DocumentApplication>('/document-applications', json('POST', body)),
}
