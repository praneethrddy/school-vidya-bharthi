import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@/lib/prisma')
vi.mock('@/lib/redis')
vi.mock('@/lib/auth')
