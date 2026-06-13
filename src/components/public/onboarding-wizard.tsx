'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle2, Loader2, Rocket, School2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface OnboardingResult {
  school: {
    id: string
    name: string
    slug: string
    email: string
  }
  principal: {
    email: string
    temporary_password: string
  }
  current_academic_year: {
    id: string
    name: string
  }
  login_url: string
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }

  return (payload?.success ? payload.data : payload) as T
}

export function OnboardingWizard() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<OnboardingResult | null>(null)
  const [formState, setFormState] = useState({
    school_name: '',
    slug: '',
    school_email: '',
    principal_name: '',
    principal_email: '',
    phone: '',
    city: '',
    state: '',
    board: 'CBSE',
    brand_primary: '#1d4ed8',
    brand_accent: '#f59e0b',
  })

  const updateField = (key: keyof typeof formState, value: string) => {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = await parseApi<OnboardingResult>(
        await fetch('/api/onboarding/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formState),
        })
      )

      setResult(payload)
      toast.success('Your school workspace is ready')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to onboard school'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
      <Card className="rounded-[2rem] border-slate-200/80 bg-white/85 shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
        <CardHeader className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Rocket className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl tracking-tight text-slate-950">
              Launch a new school workspace
            </CardTitle>
            <CardDescription className="text-base leading-7 text-slate-600">
              We will create your tenant, principal login, starter academic year, classes, fee
              categories, and core settings in one flow.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  value={formState.school_name}
                  onChange={(event) => updateField('school_name', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-slug">Subdomain Slug</Label>
                <Input
                  id="school-slug"
                  value={formState.slug}
                  onChange={(event) =>
                    updateField('slug', event.target.value.trim().toLowerCase())
                  }
                  placeholder="green-valley-school"
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="school-email">School Email</Label>
                <Input
                  id="school-email"
                  type="email"
                  value={formState.school_email}
                  onChange={(event) => updateField('school_email', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal-email">Principal Email</Label>
                <Input
                  id="principal-email"
                  type="email"
                  value={formState.principal_email}
                  onChange={(event) => updateField('principal_email', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principal-name">Principal Name</Label>
                <Input
                  id="principal-name"
                  value={formState.principal_name}
                  onChange={(event) => updateField('principal_name', event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone</Label>
                <Input
                  id="school-phone"
                  value={formState.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="school-city">City</Label>
                <Input
                  id="school-city"
                  value={formState.city}
                  onChange={(event) => updateField('city', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-state">State</Label>
                <Input
                  id="school-state"
                  value={formState.state}
                  onChange={(event) => updateField('state', event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-board">Board</Label>
                <Input
                  id="school-board"
                  value={formState.board}
                  onChange={(event) => updateField('board', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="brand-primary">Primary Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="brand-primary"
                    type="color"
                    value={formState.brand_primary}
                    onChange={(event) => updateField('brand_primary', event.target.value)}
                    className="h-11 w-16 p-1"
                  />
                  <Input
                    value={formState.brand_primary}
                    onChange={(event) => updateField('brand_primary', event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand-accent">Accent Color</Label>
                <div className="flex gap-3">
                  <Input
                    id="brand-accent"
                    type="color"
                    value={formState.brand_accent}
                    onChange={(event) => updateField('brand_accent', event.target.value)}
                    className="h-11 w-16 p-1"
                  />
                  <Input
                    value={formState.brand_accent}
                    onChange={(event) => updateField('brand_accent', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-slate-950 text-white hover:bg-slate-800"
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <School2 className="mr-2 h-4 w-4" />}
              {isSubmitting ? 'Provisioning Workspace...' : 'Create School Workspace'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[2rem] border-amber-100 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.92))] shadow-[0_18px_50px_-35px_rgba(15,23,42,0.35)]">
        <CardHeader className="space-y-3">
          <CardTitle className="text-3xl tracking-tight text-slate-950">
            What gets created automatically
          </CardTitle>
          <CardDescription className="text-base leading-7 text-slate-600">
            This flow is tuned for a fast day-zero setup so schools can log in and start
            configuring operations immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            'Principal login account with a temporary password',
            'Current academic year and starter term set',
            'Default classes from Grade 1 through Grade 10',
            'Starter fee categories and core school settings',
            'Role permission defaults for staff-facing admin roles',
            'Tenant branding colors ready for the public and admin layouts',
          ].map((item) => (
            <div key={item} className="flex gap-3 rounded-2xl bg-white/80 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
              <p className="text-sm leading-7 text-slate-700">{item}</p>
            </div>
          ))}

          {result ? (
            <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Workspace Ready
              </p>
              <div className="mt-4 space-y-2 text-sm text-slate-700">
                <p>
                  <strong>School:</strong> {result.school.name}
                </p>
                <p>
                  <strong>Slug:</strong> {result.school.slug}
                </p>
                <p>
                  <strong>Principal login:</strong> {result.principal.email}
                </p>
                <p>
                  <strong>Temporary password:</strong> {result.principal.temporary_password}
                </p>
                <p>
                  <strong>Current year:</strong> {result.current_academic_year.name}
                </p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
