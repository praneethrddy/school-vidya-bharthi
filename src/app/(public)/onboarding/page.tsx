import type { Metadata } from 'next'
import { OnboardingWizard } from '@/components/public/onboarding-wizard'
import SectionHeader from '@/components/public/section-header'
import { buildPublicMetadata } from '@/lib/public-site'

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicMetadata({
    title: 'Register Your School - SchoolOS',
    description:
      'Create a new multi-tenant school workspace with principal access, academic year setup, starter classes, and branding.',
    path: '/onboarding',
  })
}

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <section className="space-y-4 pb-10">
        <SectionHeader
          eyebrow="SchoolOS SaaS"
          as="h1"
          title="Bring a new school live in one setup flow."
          description="Spin up a tenant with branding, principal access, starter structure, and platform defaults ready to go."
        />
      </section>

      <OnboardingWizard />
    </div>
  )
}
