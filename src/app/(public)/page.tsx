import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BookOpenText,
  BusFront,
  ContactRound,
  FlaskConical,
  Library,
  Medal,
  Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import FeatureCard from '@/components/public/feature-card'
import GalleryGrid from '@/components/public/gallery-grid'
import HeroSection from '@/components/public/hero-section'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicGalleryAlbums, getPublicHomePageData } from '@/lib/public-site'
import { formatDate } from '@/lib/utils'

const testimonials = [
  {
    quote:
      'The balance of academics, discipline, and joyful school life has been wonderful for our family.',
    author: 'Parent of Grade 6 student',
  },
  {
    quote:
      'Teachers are approachable and deeply invested in helping every student feel seen and capable.',
    author: 'Parent of Grade 9 student',
  },
  {
    quote:
      'Our child has grown in confidence, communication, and curiosity since joining the school.',
    author: 'Parent of Grade 3 student',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Vidhya Bharthi High School - Excellence in Education',
    description:
      'Explore academics, admissions, gallery highlights, and the values-driven learning experience at Vidhya Bharthi High School.',
    path: '/',
  })
}

export default async function HomePage() {
  const [homeData, galleryData] = await Promise.all([getPublicHomePageData(), getPublicGalleryAlbums()])
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: homeData.school.name,
    url: homeData.school.website,
    telephone: homeData.school.phone,
    email: homeData.school.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: homeData.school.address,
      addressLocality: homeData.school.city,
      addressRegion: homeData.school.state,
      addressCountry: 'IN',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <HeroSection
        school={homeData.school}
        studentCount={homeData.studentCount}
        staffCount={homeData.staffCount}
        yearsOfExcellence={homeData.yearsOfExcellence}
      />

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[2rem] border border-amber-100 bg-white/80 p-8 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <SectionHeader
              eyebrow="About Us"
              title="A school community built on purpose, warmth, and high expectations."
              description="From early years to board exam preparation, we combine academic rigour with mentoring, creative expression, and strong values."
            />
            <p className="text-base leading-7 text-slate-600">
              Our campus nurtures confident learners through project-based exploration, supportive
              teacher guidance, and a culture that celebrates discipline, kindness, and curiosity.
            </p>
            <Button asChild variant="outline" className="border-slate-300 bg-white">
              <Link href="/about">Read More</Link>
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="rounded-[1.75rem] border-amber-100 bg-amber-50/80">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
                  Established
                </p>
                <p className="mt-3 text-4xl font-semibold text-slate-950">
                  {homeData.school.established_year}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.75rem] border-sky-100 bg-sky-50/80">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Board
                </p>
                <p className="mt-3 text-4xl font-semibold text-slate-950">{homeData.school.board}</p>
              </CardContent>
            </Card>
            <Card className="rounded-[1.75rem] border-emerald-100 bg-emerald-50/80 sm:col-span-2">
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">
                  Campus Highlights
                </p>
                <p className="mt-3 text-lg leading-7 text-slate-700">
                  Smart classrooms, lab-based science learning, sports coaching, library periods,
                  and safe transport coverage for daily commuters.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Why Families Choose Us"
          title="A learning experience shaped with intention."
          description="Every part of school life is designed to help students build knowledge, confidence, and character."
          align="center"
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <FeatureCard
            icon={BookOpenText}
            title="Quality Education"
            description="Structured curriculum delivery, frequent revision cycles, and teacher mentoring."
          />
          <FeatureCard
            icon={Trophy}
            title="Sports"
            description="Competitive and recreational sports that strengthen teamwork and resilience."
          />
          <FeatureCard
            icon={FlaskConical}
            title="Labs"
            description="Hands-on science and digital learning spaces that make concepts tangible."
          />
          <FeatureCard
            icon={Library}
            title="Library"
            description="A reading-rich environment that supports independent thinking and language growth."
          />
          <FeatureCard
            icon={BusFront}
            title="Transport"
            description="Reliable route coverage with a focus on punctuality and student safety."
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-4">
          {[
            { label: 'Student community', value: `${homeData.studentCount}+` },
            { label: 'Teaching team', value: `${homeData.staffCount}+` },
            { label: 'Pass percentage', value: `${homeData.passPercentage}%` },
            { label: 'Years of excellence', value: `${homeData.yearsOfExcellence}+` },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-[1.75rem] border-white/70 bg-white/85">
              <CardContent className="space-y-2 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{stat.label}</p>
                <p className="text-4xl font-semibold tracking-tight text-slate-950">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-8">
            <SectionHeader
              eyebrow="Recent Announcements"
              title="What is happening on campus right now"
              description="Latest published updates for parents, students, and prospective families."
            />
            <div className="space-y-4">
              {homeData.announcements.length > 0 ? (
                homeData.announcements.map((announcement) => (
                  <Card key={announcement.id} className="rounded-[1.5rem] border-white/70 bg-white/85">
                    <CardContent className="space-y-3 p-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-700">
                          {announcement.type}
                        </p>
                        <p className="text-sm text-slate-500">
                          {formatDate(announcement.published_at)}
                        </p>
                      </div>
                      <h3 className="text-xl font-semibold text-slate-950">{announcement.title}</h3>
                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                        {announcement.content}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="rounded-[1.5rem] border-dashed border-slate-300 bg-white/75">
                  <CardContent className="p-6">
                    <p className="font-semibold text-slate-900">Fresh announcements are on the way.</p>
                    <p className="mt-2 text-sm text-slate-600">
                      School-wide updates will appear here once they are published.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="space-y-8">
            <SectionHeader
              eyebrow="Gallery Preview"
              title="A quick look at life across the campus"
              description="Events, competitions, classroom moments, and celebrations from our latest published albums."
            />
            <GalleryGrid albums={galleryData.albums} previewLimit={6} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Testimonials"
          title="What families appreciate most"
          description="A V1 starter set of parent voices while the school settings-driven version is still future-facing."
          align="center"
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.author} className="rounded-[1.75rem] border-white/70 bg-white/85">
              <CardContent className="space-y-5 p-6">
                <Medal className="h-8 w-8 text-amber-500" />
                <p className="text-base leading-7 text-slate-700">“{testimonial.quote}”</p>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {testimonial.author}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-[0_24px_60px_-35px_rgba(15,23,42,0.6)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-400">
                Contact Us
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">Ready to visit the campus?</h2>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Connect with our admissions and school office team to schedule a visit, ask
                questions, or learn more about the right grade for your child.
              </p>
            </div>
            <Button asChild size="lg" className="bg-amber-500 text-slate-950 hover:bg-amber-400">
              <Link href="/contact">
                <ContactRound className="mr-2 h-4 w-4" />
                Get in Touch
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
