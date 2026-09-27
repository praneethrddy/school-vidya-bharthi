let currentHeaders = new Headers()

export async function headers(): Promise<Headers> {
  return currentHeaders
}

export function setMockHeaders(nextHeaders: HeadersInit): Headers {
  currentHeaders = new Headers(nextHeaders)
  return currentHeaders
}

export function resetMockHeaders(): void {
  currentHeaders = new Headers()
}
