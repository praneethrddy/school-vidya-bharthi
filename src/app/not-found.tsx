export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-lg text-muted-foreground">Page not found</p>
      <a href="/dashboard" className="mt-6 text-primary underline">
        Go to Dashboard
      </a>
    </div>
  )
}
