import type { Metadata } from 'next'
import { Building2, Flag, HeartHandshake } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeader from '@/components/public/section-header'
import TeamCard from '@/components/public/team-card'
import { buildPublicMetadata, getPublicAboutData } from '@/lib/public-site'

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'About Us - Vidhya Bharthi High School',
    description:
      'Learn about the history, mission, leadership team, infrastructure, and academic affiliations of Vidhya Bharthi High School.',
    path: '/about',
  })
}

export default async function AboutPage() {
  const data = await getPublicAboutData()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <section className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="About"
            as="h1"
            title="A school shaped by purpose, care, and strong academic foundations."
            description="For years, Vidhya Bharthi High School has helped children grow into thoughtful learners and responsible young citizens."
          />
          <div className="space-y-4 text-base leading-8 text-slate-600">
            <p>
              Our story began with a simple goal: to create a learning environment where academic
              excellence and strong values move together. Today that vision continues through a
              joyful campus culture, consistent teacher guidance, and deep partnerships with
              families.
            </p>
            <p>
              We believe every child deserves a school that combines structure with belonging. That
              is why we invest in fundamentals, communication, creativity, leadership, and
              confidence at every stage of the school journey.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Card className="rounded-[1.75rem] border-white/70 bg-white/85 sm:col-span-3">
            <CardContent className="space-y-3 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
                Affiliation
              </p>
              <p className="text-3xl font-semibold text-slate-950">{data.school.board}</p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
            <CardContent className="space-y-3 p-6">
              <Flag className="h-8 w-8 text-amber-600" />
              <p className="font-semibold text-slate-950">Vision</p>
              <p className="text-sm leading-6 text-slate-600">
                To nurture capable, compassionate learners ready for the future.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
            <CardContent className="space-y-3 p-6">
              <HeartHandshake className="h-8 w-8 text-sky-600" />
              <p className="font-semibold text-slate-950">Mission</p>
              <p className="text-sm leading-6 text-slate-600">
                Deliver rigorous academics with values, mentorship, and co-curricular growth.
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
            <CardContent className="space-y-3 p-6">
              <Building2 className="h-8 w-8 text-emerald-600" />
              <p className="font-semibold text-slate-950">Values</p>
              <p className="text-sm leading-6 text-slate-600">
                Discipline, empathy, curiosity, service, and integrity.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-20">
        <SectionHeader
          eyebrow="Leadership Team"
          title="Meet the people guiding school culture and academic excellence."
          description="Only active leadership profiles intended for public display are shown here."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.leaders.length > 0 ? (
            data.leaders.map((leader) => <TeamCard key={leader.id} leader={leader} />)
          ) : (
            <Card className="rounded-[1.75rem] border-dashed border-slate-300 bg-white/75 sm:col-span-2 xl:col-span-3">
              <CardContent className="p-8 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  Leadership profiles will appear here soon.
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  The public team grid automatically shows active Principal, Vice Principal, and
                  HoD records when available.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <section className="mt-20 grid gap-5 lg:grid-cols-3">
        {[
          {
            title: 'Infrastructure Highlights',
            description:
              'Dedicated lab spaces, a reading-focused library, activity zones, and collaborative classrooms support everyday learning.',
          },
          {
            title: 'Student Experience',
            description:
              'Assemblies, sports, projects, clubs, competitions, and celebrations make school life vibrant and memorable.',
          },
          {
            title: 'Academic Affiliation',
            description: `The school follows the ${data.school.board} framework and maintains an approach aligned with holistic development.`,
          },
        ].map((item) => (
          <Card key={item.title} className="rounded-[1.75rem] border-white/70 bg-white/85">
            <CardContent className="space-y-3 p-6">
              <h2 className="text-xl font-semibold text-slate-950">{item.title}</h2>
              <p className="text-sm leading-7 text-slate-600">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
