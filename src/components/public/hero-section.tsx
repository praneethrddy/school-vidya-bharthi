import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import StatCounter from '@/components/public/stat-counter'
import type { PublicSchoolInfo } from '@/lib/public-site'

interface HeroSectionProps {
  school: PublicSchoolInfo
  studentCount: number
  staffCount: number
  yearsOfExcellence: number
}

export default function HeroSection({
  school,
  studentCount,
  staffCount,
  yearsOfExcellence,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.35),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(14,165,233,0.28),_transparent_30%),linear-gradient(135deg,_rgba(15,23,42,0.95),_rgba(30,41,59,0.88))]" />
      <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
        <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-slate-100 backdrop-blur">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Excellence in education, character, and opportunity
            </div>
            <div className="mt-8 space-y-6">
              <h1 className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                {school.name}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
                A vibrant CBSE learning community where strong academics, joyful discovery, and
                values-based leadership help every child grow with confidence.
              </p>
            </div>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-amber-500 text-slate-950 hover:bg-amber-400"
              >
                <Link href="/admissions">
                  Apply for Admission
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/contact">Get in Touch</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCounter value={studentCount} label="Students thriving on campus" suffix="+" />
            <StatCounter value={staffCount} label="Teachers and mentors" suffix="+" />
            <StatCounter value={yearsOfExcellence} label="Years of excellence" suffix="+" />
          </div>
        </div>
      </div>
    </section>
  )
}
