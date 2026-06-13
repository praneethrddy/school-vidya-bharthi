import { auth } from '@/lib/auth'

export default async function TimetablePage() {
  const session = await auth()
  const isPrincipal = session?.user?.role === 'PRINCIPAL'

  return (
    <div>
      <h1 className="text-2xl font-bold">Timetable</h1>
      <p className="mt-2 text-muted-foreground">Timetable management will appear here.</p>
      {isPrincipal && (
        <div className="mt-4 flex gap-4">
          <button className="px-4 py-2 bg-primary text-white rounded">Add Slot</button>
          <button className="px-4 py-2 bg-secondary text-white rounded">Publish Timetable</button>
        </div>
      )}
    </div>
  )
}
