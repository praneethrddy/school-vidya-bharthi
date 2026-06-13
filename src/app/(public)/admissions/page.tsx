import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CircleCheckBig } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicSchoolInfo } from '@/lib/public-site'

const admissionSteps = [
  'Connect with the school office or submit your enquiry through the contact page.',
  'Schedule a campus visit and counselling conversation with the admissions team.',
  'Collect the admission form details and review class availability.',
  'Submit the required documents for verification and next-step guidance.',
]

const documents = [
  'Student birth certificate copy',
  'Previous school report card or transfer certificate, where applicable',
  'Passport-size photographs',
  'Parent ID proof and address proof',
  'Immunisation or health records if requested by the school office',
]

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Admissions - Vidhya Bharthi High School',
    description:
      'Review the public admission process, age criteria, documents checklist, and enquiry guidance for Vidhya Bharthi High School.',
    path: '/admissions',
  })
}

export default async function AdmissionsPage() {
  const school = await getPublicSchoolInfo()

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <SectionHeader
            eyebrow="Admissions"
            as="h1"
            title="A clear and family-friendly introduction to joining our school community."
            description="This page shares public admissions guidance only. It is separate from the internal admin admissions module."
          />
          <p className="text-base leading-8 text-slate-600">
            We welcome families who are looking for a supportive, academically focused school
            environment. Our admissions process is designed to be transparent, warm, and easy to
            navigate for prospective parents.
          </p>
          <Button asChild size="lg" className="bg-slate-950 text-white hover:bg-slate-800">
            <Link href="/contact">
              Apply Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Card className="rounded-[2rem] border-white/70 bg-white/85">
          <CardContent className="space-y-4 p-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
              Admission Process
            </h2>
            <div className="space-y-4">
              {admissionSteps.map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                  <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-amber-500 font-semibold text-slate-950">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 grid gap-5 lg:grid-cols-3">
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Age Criteria</h2>
            <p className="text-sm leading-7 text-slate-600">
              Age expectations vary by entry class. Families receive grade-specific guidance during
              the admissions conversation to ensure appropriate placement.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Fee Structure Overview</h2>
            <p className="text-sm leading-7 text-slate-600">
              Public fee guidance is intentionally high level. Detailed fee breakdowns are shared by
              the school office based on grade, transport preference, and applicable services.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.75rem] border-white/70 bg-white/85">
          <CardContent className="space-y-3 p-6">
            <h2 className="text-xl font-semibold text-slate-950">Admission Enquiries</h2>
            <p className="text-sm leading-7 text-slate-600">{school.phone}</p>
            <p className="text-sm leading-7 text-slate-600">{school.email}</p>
          </CardContent>
        </Card>
      </section>

      <section className="mt-20">
        <SectionHeader
          eyebrow="Checklist"
          title="Documents to keep ready"
          description="The admissions office may ask for additional paperwork depending on the class and transfer history."
        />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {documents.map((document) => (
            <Card key={document} className="rounded-[1.5rem] border-white/70 bg-white/85">
              <CardContent className="flex gap-3 p-5">
                <CircleCheckBig className="mt-1 h-5 w-5 flex-none text-emerald-600" />
                <p className="text-sm leading-7 text-slate-600">{document}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
