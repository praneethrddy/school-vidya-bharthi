'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface SchoolProfile {
  id: string
  name: string
  logo_url: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  website: string | null
  board: string | null
  brand_primary: string
  brand_accent: string
  updated_at: string
}

interface SchoolProfilePayload {
  school: SchoolProfile
}

async function parseApi<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.error || 'Request failed')
  }
  return (payload?.success ? payload.data : payload) as T
}

export function SchoolProfileForm() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingDomain, setSavingDomain] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [customDomain, setCustomDomain] = useState('')
  const [profile, setProfile] = useState<SchoolProfile>({
    id: '',
    name: '',
    logo_url: null,
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    website: '',
    board: '',
    brand_primary: '#1d4ed8',
    brand_accent: '#f59e0b',
    updated_at: '',
  })

  const previewUrl = useMemo(() => {
    if (logoFile) {
      return URL.createObjectURL(logoFile)
    }
    return profile.logo_url
  }, [logoFile, profile.logo_url])

  useEffect(() => {
    if (!logoFile) {
      return
    }
    return () => {
      URL.revokeObjectURL(previewUrl || '')
    }
  }, [logoFile, previewUrl])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const [profileData, domainData] = await Promise.all([
        parseApi<SchoolProfilePayload>(
          await fetch('/api/settings/school-profile', { cache: 'no-store' })
        ),
        parseApi<{ domain: string | null }>(
          await fetch('/api/settings/domain', { cache: 'no-store' })
        ),
      ])
      setProfile(profileData.school)
      setCustomDomain(domainData.domain || '')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load school profile'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const updateField = <K extends keyof SchoolProfile>(key: K, value: SchoolProfile[K]) => {
    setProfile((current) => ({ ...current, [key]: value }))
  }

  const handleLogoSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setLogoFile(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    setLogoFile(file)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.set('name', profile.name)
      formData.set('address', profile.address || '')
      formData.set('city', profile.city || '')
      formData.set('state', profile.state || '')
      formData.set('phone', profile.phone || '')
      formData.set('email', profile.email || '')
      formData.set('website', profile.website || '')
      formData.set('board', profile.board || '')
      formData.set('brand_primary', profile.brand_primary)
      formData.set('brand_accent', profile.brand_accent)
      if (logoFile) {
        formData.set('logo', logoFile)
      }

      const data = await parseApi<SchoolProfilePayload>(
        await fetch('/api/settings/school-profile', {
          method: 'PATCH',
          body: formData,
        })
      )

      setProfile(data.school)
      setLogoFile(null)
      toast.success('School profile saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update school profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDomainSave = async () => {
    setSavingDomain(true)
    try {
      const data = await parseApi<{ domain: string }>(
        await fetch('/api/settings/domain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: customDomain,
          }),
        })
      )
      setCustomDomain(data.domain)
      toast.success('Custom domain saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save custom domain'
      toast.error(message)
    } finally {
      setSavingDomain(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Profile</CardTitle>
        <CardDescription>
          Update school name, contact details, board information, and logo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name</Label>
              <Input
                id="school-name"
                value={profile.name}
                disabled={loading}
                onChange={(event) => updateField('name', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-board">Board</Label>
              <Input
                id="school-board"
                value={profile.board || ''}
                disabled={loading}
                onChange={(event) => updateField('board', event.target.value)}
                placeholder="CBSE / ICSE / State Board"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-address">Address</Label>
            <Textarea
              id="school-address"
              value={profile.address || ''}
              disabled={loading}
              onChange={(event) => updateField('address', event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="school-city">City</Label>
              <Input
                id="school-city"
                value={profile.city || ''}
                disabled={loading}
                onChange={(event) => updateField('city', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-state">State</Label>
              <Input
                id="school-state"
                value={profile.state || ''}
                disabled={loading}
                onChange={(event) => updateField('state', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-phone">Phone</Label>
              <Input
                id="school-phone"
                value={profile.phone || ''}
                disabled={loading}
                onChange={(event) => updateField('phone', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="school-email">Email</Label>
              <Input
                id="school-email"
                type="email"
                value={profile.email || ''}
                disabled={loading}
                onChange={(event) => updateField('email', event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-website">Website</Label>
              <Input
                id="school-website"
                type="url"
                value={profile.website || ''}
                disabled={loading}
                onChange={(event) => updateField('website', event.target.value)}
                placeholder="https://example.edu"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand-primary">Primary Brand Color</Label>
              <div className="flex gap-3">
                <Input
                  id="brand-primary"
                  type="color"
                  value={profile.brand_primary}
                  disabled={loading}
                  onChange={(event) => updateField('brand_primary', event.target.value)}
                  className="h-11 w-16 p-1"
                />
                <Input
                  value={profile.brand_primary}
                  disabled={loading}
                  onChange={(event) => updateField('brand_primary', event.target.value)}
                  placeholder="#1d4ed8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-accent">Accent Color</Label>
              <div className="flex gap-3">
                <Input
                  id="brand-accent"
                  type="color"
                  value={profile.brand_accent}
                  disabled={loading}
                  onChange={(event) => updateField('brand_accent', event.target.value)}
                  className="h-11 w-16 p-1"
                />
                <Input
                  value={profile.brand_accent}
                  disabled={loading}
                  onChange={(event) => updateField('brand_accent', event.target.value)}
                  placeholder="#f59e0b"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="school-logo">Logo</Label>
            <Input id="school-logo" type="file" accept="image/*" onChange={handleLogoSelection} />
            {previewUrl ? (
              <div className="w-32 overflow-hidden rounded-md border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="School logo preview" className="h-24 w-32 object-contain p-2" />
              </div>
            ) : null}
          </div>

          <Button type="submit" disabled={loading || saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </form>

        <div className="mt-8 space-y-4 rounded-xl border border-dashed p-5">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-950">Custom Domain</h3>
            <p className="text-sm text-muted-foreground">
              Connect a branded domain such as `school.example.com`.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              value={customDomain}
              onChange={(event) => setCustomDomain(event.target.value)}
              placeholder="school.example.com"
            />
            <Button
              type="button"
              variant="outline"
              disabled={savingDomain || !customDomain.trim()}
              onClick={() => void handleDomainSave()}
            >
              {savingDomain ? 'Saving...' : 'Save Domain'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
