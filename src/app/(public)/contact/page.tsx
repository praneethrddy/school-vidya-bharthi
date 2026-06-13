import type { Metadata } from 'next'
import { Clock3, Mail, MapPin, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import ContactForm from '@/components/public/contact-form'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata, getPublicSchoolInfo } from '@/lib/public-site'

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Contact Us - Vidhya Bharthi High School',
    description:
      'Get in touch with Vidhya Bharthi High School for admission enquiries, campus visits, and school information.',
    path: '/contact',
  })
}

export default async function ContactPage() {
  const school = await getPublicSchoolInfo()
  const mapQuery = encodeURIComponent(`${school.address}, ${school.city}, ${school.state}`)
  const contactJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: school.name,
    url: school.website,
    telephone: school.phone,
    email: school.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: school.address,
      addressLocality: school.city,
      addressRegion: school.state,
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      telephone: school.phone,
      email: school.email,
    },
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <section className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="space-y-8">
          <SectionHeader
            eyebrow="Contact"
            as="h1"
            title="We’d love to help with your enquiry."
            description="Reach the school office for admissions questions, campus visits, and general information."
          />

          <div className="grid gap-4">
            {[
              { icon: MapPin, title: 'Campus Address', value: `${school.address}, ${school.city}, ${school.state}` },
              { icon: Phone, title: 'Phone', value: school.phone },
              { icon: Mail, title: 'Email', value: school.email },
              { icon: Clock3, title: 'Office Hours', value: 'Monday to Saturday, 8:30 AM - 4:30 PM' },
            ].map((item) => (
              <Card key={item.title} className="rounded-[1.5rem] border-white/70 bg-white/85">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">{item.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Send us a message</h2>
              <p className="text-sm leading-6 text-slate-600">
                The contact form is validated on the client, protected with a honeypot field, and
                rate limited at the API.
              </p>
            </div>
            <ContactForm />
          </CardContent>
        </Card>
      </section>

      <section className="mt-20 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 p-3 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
          <iframe
            title="School location map"
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            className="h-[420px] w-full rounded-[1.5rem] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <Card className="rounded-[2rem] border-white/70 bg-white/85">
          <CardContent className="space-y-4 p-8">
            <h2 className="text-2xl font-semibold text-slate-950">Visit the Campus</h2>
            <p className="text-sm leading-7 text-slate-600">
              Families are encouraged to connect in advance so the school office can help plan a
              smooth visit, answer grade-level questions, and share the right next steps.
            </p>
            <div className="rounded-[1.5rem] bg-slate-50 p-5 text-sm leading-7 text-slate-600">
              Best times for visits are usually during office hours on working days. If you are
              coming specifically for admissions, please carry any school records that may help the
              counsellor guide you.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
