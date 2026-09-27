import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
            VB
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Vidhya Bharthi High School</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
