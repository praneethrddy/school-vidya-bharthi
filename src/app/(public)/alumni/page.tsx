import type { Metadata } from 'next'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicSchoolInfo } from '@/lib/public-site'

const notableAlumni = [
  { name: 'Ananya Rao', achievement: 'Education innovator and public speaker' },
  { name: 'Kiran Verma', achievement: 'National-level athlete and youth mentor' },
  { name: 'Meera Nair', achievement: 'Technology leader and startup founder' },
]

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Alumni - Vidhya Bharthi High School',
    description:
      'Explore the alumni welcome page for Vidhya Bharthi High School and stay connected with the school community.',
    path: '/alumni',
  })
}

export default async function AlumniPage() {
  const school = await getPublicSchoolInfo()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Alumni"
            as="h1"
            title="Once a student here, always part of the story."
            description="Our alumni page is a V1 foundation designed to celebrate legacy and support future school connection."
          />
          <p className="text-base leading-8 text-slate-600">
            Whether you graduated recently or many years ago, your journey remains part of the
            school’s identity. We look forward to building a richer alumni community experience in a
            future release.
          </p>
        </div>

        <Card className="rounded-[2rem] border-white/70 bg-white/85">
          <CardContent className="space-y-4 p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Stay Connected</h2>
            <p className="text-sm leading-7 text-slate-600">
              For now, alumni can reconnect through the school office and express interest in future
              events, mentoring, and community stories.
            </p>
            <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              Contact email: {school.email}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20">
        <SectionHeader
          eyebrow="Notable Alumni"
          title="A few example stories to shape the first version."
          description="This section is static in V1 and can later move to school-managed content."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {notableAlumni.map((alumnus) => (
            <Card key={alumnus.name} className="rounded-[1.75rem] border-white/70 bg-white/85">
              <CardContent className="space-y-3 p-6">
                <h2 className="text-xl font-semibold text-slate-950">{alumnus.name}</h2>
                <p className="text-sm leading-7 text-slate-600">{alumnus.achievement}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <Card className="rounded-[2rem] border-dashed border-slate-300 bg-white/75">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Alumni Registration</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              A dedicated alumni registration workflow is planned for a future release. This V1 page
              intentionally keeps the experience simple while reserving space for the next step.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
