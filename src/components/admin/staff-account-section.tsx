'use client'

import { useState } from 'react'
import {
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StaffAccountSectionProps {
  user: {
    id: string
    email: string
    role: string
    is_active: boolean
    last_login?: string | null
  } | null
  canManage: boolean
  onCreateAccount: (
    email: string,
    role: string
  ) => Promise<{ generatedPassword?: string | null } | void>
  onResetPassword: () => Promise<{ generatedPassword?: string | null } | void>
}

export function StaffAccountSection({
  user,
  canManage,
  onCreateAccount,
  onResetPassword,
}: StaffAccountSectionProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!email || !role) {
      return
    }

    setIsCreating(true)
    setGeneratedPassword(null)
    try {
      const result = await onCreateAccount(email, role)
      if (result?.generatedPassword) {
        setGeneratedPassword(result.generatedPassword)
      }
      setEmail('')
      setRole('')
    } finally {
      setIsCreating(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    setGeneratedPassword(null)
    try {
      const result = await onResetPassword()
      if (result?.generatedPassword) {
        setGeneratedPassword(result.generatedPassword)
      }
    } finally {
      setIsResetting(false)
    }
  }

  if (user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Login Account
            {user.is_active ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">Inactive</Badge>
            )}
          </CardTitle>
          <CardDescription>System access credentials and role configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">Email Address</div>
              <div className="text-base">{user.email}</div>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">System Role</div>
              <div className="text-base font-semibold">{user.role}</div>
            </div>
            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">Last Login</div>
              <div className="text-base">
                {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
              </div>
            </div>
          </div>

          {generatedPassword ? (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <div className="mb-2 text-sm font-medium text-green-800">Temporary Password</div>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded bg-white px-2 py-1 text-sm font-semibold">
                  {generatedPassword}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(generatedPassword)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
              </div>
            </div>
          ) : null}

          {canManage && user.is_active ? (
            <div className="mt-2 flex items-center justify-between border-t pt-4">
              <div>
                <h4 className="text-sm font-medium">Reset Password</h4>
                <p className="text-sm text-muted-foreground">
                  Generate and share a one-time replacement password.
                </p>
              </div>
              <Button variant="outline" onClick={handleReset} disabled={isResetting}>
                {isResetting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Reset Password
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="rounded-t-lg bg-amber-50 pb-4">
        <CardTitle className="flex items-center gap-2 text-amber-800">
          <ShieldAlert className="h-5 w-5" />
          No Login Account
        </CardTitle>
        <CardDescription className="text-amber-700">
          This staff member cannot sign in until a user account is created.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        {generatedPassword ? (
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <div className="mb-2 text-sm font-medium text-green-800">Generated Password</div>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-white px-2 py-1 text-sm font-semibold">
                {generatedPassword}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(generatedPassword)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        {canManage ? (
          <div className="grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="staff@school.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TEACHER">Teacher</SelectItem>
                  <SelectItem value="STAFF_ADMIN">Staff Admin</SelectItem>
                  <SelectItem value="STUDENT_ADMIN">Student Admin</SelectItem>
                  <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={!email || !role || isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create User Account
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to create staff login accounts.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

