export interface Complex {
  id: string
  name: string
  nit: string
  address?: string
  city?: string
  whatsapp?: string
  phone?: string
  email?: string
  isActive: boolean
}

export interface Block {
  id: string
  phId: string
  name: string
  totalFloor: number | null
  hasElevator: boolean
}

export interface Property {
  id: string
  phId: string
  blockId: string
  name: string
  areaM2: number
  coefficient: number
  block?: { id: string; name: string }
  owners?: Owner[]
}

export interface Role {
  id: string
  phId: string | null
  name: string
  description: string
}

export interface UserRole {
  id?: string
  role: Role
}

export interface User {
  id: string
  phId: string
  email: string
  isActived: boolean
  lastLogin: string | null
  userRoles: UserRole[]
}

export type AuthUser = Pick<User, 'id' | 'phId' | 'email' | 'isActived' | 'lastLogin' | 'userRoles'>

export type OwnerDocumentType = 'CC' | 'NIT' | 'CE' | 'PASSPORT'

export interface Owner {
  id: string
  phId: string
  documentType: OwnerDocumentType
  documentNumber: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  properties: Property[]
}

export interface FinancialConcept {
  id: string
  phId: string | null
  name: string
  description: string | null
}

export type DocumentType = 'F' | 'ND' | 'RC' | 'NC'
export type DocumentStatus = 'ACTIVE' | 'ANNULLED'

export interface DocumentItem {
  id?: string
  conceptId: string
  concept?: FinancialConcept
  description: string
  amount: number
}

export interface FinancialDocument {
  id: string
  phId: string
  propertyId: string
  property?: Property
  documentType: DocumentType
  documentNumber: string
  issueDate: string
  totalAmount: number
  status: DocumentStatus
  items: DocumentItem[]
}

export interface DocumentApplication {
  id: string
  phId: string
  debtDocumentId: string
  creditDocumentId: string
  debtDocument?: FinancialDocument
  creditDocument?: FinancialDocument
  appliedAmount: number
}

export interface AppData {
  complexes: Complex[]
  blocks: Block[]
  properties: Property[]
  users: User[]
  roles: Role[]
  owners: Owner[]
  concepts: FinancialConcept[]
  documents: FinancialDocument[]
  applications: DocumentApplication[]
}

export type NewUser = {
  phId: string
  email: string
  password?: string
  isActived?: boolean
}
