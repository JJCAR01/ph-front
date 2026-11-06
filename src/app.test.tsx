import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { api, sanitizeUser } from './api'
import { centsToAmount, toCents } from './money'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const body = String(input) === '/api/auth/me'
      ? JSON.stringify({ user: {
          id: 'session-user',
          phId: 'complex-id',
          email: 'admin@example.com',
          isActived: true,
          lastLogin: null,
          userRoles: [],
        } })
      : '[]'
    return new Response(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }))
})

describe('moneda', () => {
  it('convierte decimales a centavos sin acumular errores binarios', () => {
    expect(toCents('10.10')).toBe(1010)
    expect(toCents('0.01')).toBe(1)
    expect(centsToAmount(1010)).toBe(10.1)
  })

  it('rechaza valores no numéricos o con más de dos decimales', () => {
    expect(toCents('1.001')).toBeNull()
    expect(toCents('-2')).toBeNull()
    expect(toCents('')).toBeNull()
  })
})

describe('protección de usuario', () => {
  it('no conserva la contraseña ni campos no públicos de la respuesta', () => {
    const user = sanitizeUser({
      id: 'user-id',
      phId: 'complex-id',
      email: 'persona@example.com',
      password: 'hash-must-not-be-kept',
      isActived: true,
      userRoles: [{ role: { id: 'role-id', phId: null, name: 'TENANT', description: 'Inquilino', password: 'nested-secret' } }],
    })

    expect(user).not.toHaveProperty('password')
    expect(JSON.stringify(user)).not.toContain('hash-must-not-be-kept')
    expect(JSON.stringify(user)).not.toContain('nested-secret')
  })

  it('envía la contraseña solo en la solicitud de creación y no la conserva en el resultado', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      expect(String(input)).toBe('/api/users')
      expect(options?.method).toBe('POST')
      return new Response(JSON.stringify({
        id: 'user-id',
        phId: 'complex-id',
        email: 'persona@example.com',
        isActived: true,
        password: 'stored-hash',
        userRoles: [],
      }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await api.createUser({
      phId: 'complex-id',
      email: 'persona@example.com',
      password: 'temporary-password',
      isActived: true,
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      phId: 'complex-id',
      email: 'persona@example.com',
      password: 'temporary-password',
      isActived: true,
    })
    expect(result).toEqual({ id: 'user-id' })
    expect(JSON.stringify(result)).not.toContain('stored-hash')
  })
})

describe('pantallas', () => {
  it('muestra la pantalla de documentos y su estado vacío sin datos de demostración', async () => {
    render(<MemoryRouter initialEntries={['/documents']}><App /></MemoryRouter>)

    expect(await screen.findByRole('heading', { name: 'Documentos financieros' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Aún no hay documentos')).toBeInTheDocument())
    expect(screen.getByText('Los documentos financieros se mostrarán aquí cuando estén registrados.')).toBeInTheDocument()
  })

  describe('autenticación', () => {
    it('protege las rutas, inicia sesión y envía la cookie de sesión', async () => {
      const sessionUser = {
        id: 'session-user',
        phId: 'complex-id',
        email: 'admin@example.com',
        isActived: true,
        lastLogin: null,
        userRoles: [],
      }
      const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
        const path = String(input)
        if (path === '/api/auth/me') {
          return new Response(JSON.stringify({ message: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (path === '/api/auth/login') {
          expect(options?.credentials).toBe('include')
          expect(JSON.parse(String(options?.body))).toEqual({ email: 'admin@example.com', password: 'secret-password' })
          return new Response(JSON.stringify({ user: sessionUser }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } })
      })
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()

      render(<MemoryRouter initialEntries={['/documents']}><App /></MemoryRouter>)
      expect(await screen.findByRole('heading', { name: 'Qué bueno verte.' })).toBeInTheDocument()
      await user.type(screen.getByLabelText('Correo electrónico'), 'admin@example.com')
      await user.type(screen.getByLabelText('Contraseña'), 'secret-password')
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('heading', { name: 'Documentos financieros' })).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/login', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }))
    })

    it('muestra el error de credenciales devuelto por la API', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) === '/api/auth/me') {
          return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
        }
        if (String(input) === '/api/auth/login') {
          return new Response(JSON.stringify({ message: 'Correo o contraseña incorrectos.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response('[]', { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()

      render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
      await user.type(await screen.findByLabelText('Correo electrónico'), 'admin@example.com')
      await user.type(screen.getByLabelText('Contraseña'), 'wrong-password')
      await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Correo o contraseña incorrectos, o la cuenta está inactiva.',
      )
      expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).not.toBeInTheDocument()
    })

    it('cierra la sesión en el backend y regresa al login', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
        if (String(input) === '/api/auth/logout') {
          expect(options?.method).toBe('POST')
          expect(options?.credentials).toBe('include')
          return new Response(JSON.stringify({ loggedOut: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        if (String(input) === '/api/auth/me') {
          return new Response(JSON.stringify({ user: {
            id: 'session-user',
            phId: 'complex-id',
            email: 'admin@example.com',
            isActived: true,
            lastLogin: null,
            userRoles: [],
          } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
        }
        return new Response('[]', { status: 200 })
      })
      vi.stubGlobal('fetch', fetchMock)
      const user = userEvent.setup()

      render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>)
      await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))

      expect(await screen.findByRole('heading', { name: 'Qué bueno verte.' })).toBeInTheDocument()
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('muestra el rechazo de validación del backend al aplicar un crédito', async () => {
    const complex = { id: 'complex-id', name: 'Conjunto norte', nit: '900123456', isActive: true }
    const property = { id: 'property-id', phId: complex.id, blockId: 'block-id', name: 'Apto 101', areaM2: 80, coefficient: 0.2 }
    const debt = {
      id: 'debt-id', phId: complex.id, propertyId: property.id, property,
      documentType: 'F', documentNumber: 'F-001', issueDate: '2026-01-01',
      totalAmount: 100000, status: 'ACTIVE', items: [],
    }
    const credit = {
      id: 'credit-id', phId: complex.id, propertyId: property.id, property,
      documentType: 'RC', documentNumber: 'RC-001', issueDate: '2026-01-02',
      totalAmount: 50000, status: 'ACTIVE', items: [],
    }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = String(input)
      if (path === '/api/complex') return new Response(JSON.stringify([complex]))
      if (path === '/api/properties') return new Response(JSON.stringify([property]))
      if (path === '/api/financial-documents') return new Response(JSON.stringify([debt, credit]))
      if (path === '/api/document-applications' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          statusCode: 400,
          message: ['Applied amount exceeds the available credit or outstanding debt'],
          error: 'Bad Request',
        }), { status: 400, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('[]', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemoryRouter initialEntries={['/applications']}><App /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: /aplicar crédito/i }))
    await user.selectOptions(screen.getByLabelText(/documento de deuda/i), 'debt-id')
    await user.selectOptions(screen.getByLabelText(/documento de crédito/i), 'credit-id')
    await user.type(screen.getByLabelText(/importe a aplicar/i), '100.00')
    await user.click(screen.getByRole('button', { name: 'Confirmar aplicación' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Applied amount exceeds the available credit or outstanding debt')
    expect(screen.queryByText('Aplicación confirmada por el backend.')).not.toBeInTheDocument()
  })

  it('crea un usuario y asigna TENANT mediante el endpoint real de roles', async () => {
    const complex = { id: 'complex-id', name: 'Conjunto norte', nit: '900123456', isActive: true }
    const tenantRole = { id: 'tenant-role-id', phId: null, name: 'TENANT', description: 'Inquilino' }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = String(input)
      if (path === '/api/complex') return new Response(JSON.stringify([complex]))
      if (path === '/api/roles') return new Response(JSON.stringify([tenantRole]))
      if (path === '/api/users' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          id: 'new-user-id',
          phId: complex.id,
          email: 'tenant@example.com',
          isActived: true,
          password: 'stored-hash',
          userRoles: [],
        }), { status: 201, headers: { 'Content-Type': 'application/json' } })
      }
      if (path === '/api/users/new-user-id/roles/tenant-role-id' && options?.method === 'POST') {
        return new Response(JSON.stringify({ id: 'assignment-id' }), { status: 201 })
      }
      return new Response('[]', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemoryRouter initialEntries={['/users']}><App /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: /nuevo usuario/i }))
    await user.type(screen.getByLabelText(/correo electrónico/i), 'tenant@example.com')
    await user.type(screen.getByLabelText(/contraseña/i), 'temporary-password')
    await user.click(screen.getByRole('checkbox', { name: /TENANT/i }))
    await user.click(screen.getByRole('button', { name: 'Crear usuario' }))

    expect(await screen.findByText('Usuario creado.')).toBeInTheDocument()
    const createCall = fetchMock.mock.calls.find(([input, options]) => String(input) === '/api/users' && options?.method === 'POST')
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      phId: complex.id,
      email: 'tenant@example.com',
      password: 'temporary-password',
    })
    expect(fetchMock).toHaveBeenCalledWith('/api/users/new-user-id/roles/tenant-role-id', expect.objectContaining({ method: 'POST' }))
    expect(screen.queryByText('stored-hash')).not.toBeInTheDocument()
  })

  it('crea una factura sumando renglones en centavos y envía el total numérico', async () => {
    const complex = { id: 'complex-id', name: 'Conjunto norte', nit: '900123456', isActive: true }
    const property = { id: 'property-id', phId: complex.id, blockId: 'block-id', name: 'Apto 101', areaM2: 80, coefficient: 0.2 }
    const concept = { id: 'concept-id', phId: null, name: 'Administración', description: null }
    const fetchMock = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      const path = String(input)
      if (path === '/api/complex') return new Response(JSON.stringify([complex]))
      if (path === '/api/properties') return new Response(JSON.stringify([property]))
      if (path === '/api/financial-concepts') return new Response(JSON.stringify([concept]))
      if (path === '/api/financial-documents' && options?.method === 'POST') {
        return new Response(JSON.stringify({
          id: 'new-document-id',
          ...JSON.parse(String(options.body)),
          property,
        }), { status: 201, headers: { 'Content-Type': 'application/json' } })
      }
      return new Response('[]', { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()

    render(<MemoryRouter initialEntries={['/documents']}><App /></MemoryRouter>)
    await user.click(await screen.findByRole('button', { name: /nuevo documento/i }))
    await user.selectOptions(screen.getByLabelText(/^conjunto/i), complex.id)
    await user.selectOptions(screen.getByLabelText(/^propiedad/i), property.id)
    await user.type(screen.getByLabelText(/^número/i), 'F-001')
    await user.selectOptions(screen.getByLabelText(/^concepto/i), concept.id)
    await user.type(screen.getByLabelText(/^descripción/i), 'Cuota mensual')
    await user.type(screen.getByLabelText(/importe \(cop\)/i), '10.10')
    await user.click(screen.getByRole('button', { name: 'Crear documento' }))

    expect(await screen.findByText('Documento creado.')).toBeInTheDocument()
    const createCall = fetchMock.mock.calls.find(([input, options]) => String(input) === '/api/financial-documents' && options?.method === 'POST')
    expect(JSON.parse(String(createCall?.[1]?.body))).toMatchObject({
      phId: complex.id,
      propertyId: property.id,
      documentType: 'F',
      documentNumber: 'F-001',
      totalAmount: 10.1,
      items: [{ conceptId: concept.id, description: 'Cuota mensual', amount: 10.1 }],
    })
  })
})
