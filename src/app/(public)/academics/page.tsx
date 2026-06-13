import type { Metadata } from 'next'
import { CheckCircle2, GraduationCap, NotebookText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicAcademicsData } from '@/lib/public-site'

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Academics - Vidhya Bharthi High School',
    description:
      'Discover the curriculum, class offerings, subject pathways, assessment approach, and learning philosophy at Vidhya Bharthi High School.',
    path: '/academics',
  })
}

export default async function AcademicsPage() {
  const data = await getPublicAcademicsData()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Academics"
            as="h1"
            title="A structured academic journey that stays child-centred and future-ready."
            description="We focus on concept clarity, strong communication, independent thinking, and consistent assessment."
          />
          <div className="space-y-4 text-base leading-8 text-slate-600">
            <p>
              Our curriculum approach blends strong classroom instruction with revision planning,
              project work, lab activity, and meaningful teacher feedback. Students are encouraged
              to ask questions, build confidence, and apply what they learn.
            </p>
            <p>
              The school follows the {data.school.board} framework and uses a{' '}
              {data.gradingScheme.toLowerCase()}-oriented assessment approach for progress tracking.
            </p>
          </div>
        </div>

        <Card className="rounded-[2rem] border-white/70 bg-white/85">
          <CardContent className="space-y-5 p-8">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-amber-600" />
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Curriculum Overview</h2>
            </div>
            <ul className="space-y-4 text-sm leading-7 text-slate-600">
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-emerald-600" />
                Foundational literacy, numeracy, and conceptual clarity across stages.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-emerald-600" />
                Subject-wise progression supported by regular practice, remediation, and enrichment.
              </li>
              <li className="flex gap-3">
                <CheckCircle2 className="mt-1 h-4 w-4 flex-none text-emerald-600" />
                Balanced emphasis on academics, life skills, values, communication, and co-curricular growth.
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <NotebookText className="h-6 w-6 text-sky-600" />
              <h2 className="text-xl font-semibold text-slate-950">Classes Offered</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {data.classLabels.map((classLabel) => (
                <span
                  key={classLabel}
                  className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700"
                >
                  {classLabel}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-6 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Subjects by Class</h2>
            {data.subjectsByClass.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {data.subjectsByClass.map((group) => (
                  <div key={group.classLabel} className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-900">{group.classLabel}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {group.subjects.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-600">
                Subject groups will appear here when class and subject records are configured for the
                current academic year.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 grid gap-5 lg:grid-cols-2">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Assessment System</h2>
            <p className="text-sm leading-7 text-slate-600">
              Students are assessed through periodic tests, classwork, projects, and term-end
              evaluations. Reporting is aligned with the configured grading scheme: {data.gradingScheme}.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Achievements</h2>
            <p className="text-sm leading-7 text-slate-600">
              This V1 public page includes a placeholder achievements section that can later be wired
              to school-managed highlights, competition results, and academic milestones.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
