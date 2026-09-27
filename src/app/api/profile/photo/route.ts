import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'
import { bucket, buildPublicFileUrl, r2Client } from '@/lib/r2'
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: Request, { params }: { params: Promise<any> }) {
  await params // For Next.js 15 async semantics

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, role, schoolId } = session.user

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File size exceeds 10MB limit' }, { status: 400 })
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG and WEBP are allowed' }, { status: 400 })

    let currentPhotoUrl: string | null = null
    let entityId: string = ''

    if (role === 'STUDENT') {
      const student = await prisma.student.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
      currentPhotoUrl = student.photo_url
      entityId = student.id
    } else if (role === 'PARENT') {
      const parent = await prisma.parent.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })
      currentPhotoUrl = parent.photo_url
      entityId = parent.id
    } else {
      const staff = await prisma.staff.findFirst({ where: { user_id: id, school_id: schoolId! } })
      if (!staff) return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
      currentPhotoUrl = staff.photo_url
      entityId = staff.id
    }

    if (currentPhotoUrl) {
      const parts = currentPhotoUrl.split('/')
      const key = parts[parts.length - 1]
      if (key) {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: `profiles/${key}`,
            })
          )
        } catch (e) {
          console.warn('Failed to delete old photo:', e)
        }
      }
    }

    const ext = file.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`
    const key = `profiles/${filename}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    const publicUrl = buildPublicFileUrl(key)

    if (role === 'STUDENT') {
      await prisma.student.update({
        where: { id: entityId },
        data: { photo_url: publicUrl }
      })
    } else if (role === 'PARENT') {
      await prisma.parent.update({
        where: { id: entityId },
        data: { photo_url: publicUrl }
      })
    } else {
      await prisma.staff.update({
        where: { id: entityId },
        data: { photo_url: publicUrl }
      })
    }

    await createAuditLog({
      school_id: schoolId || null,
      user_id: id,
      action: 'UPDATE',
      entity_type: role.toLowerCase(),
      entity_id: entityId,
      old_value: { photo_url: currentPhotoUrl },
      new_value: { photo_url: publicUrl }
    })

    return NextResponse.json({ success: true, photo_url: publicUrl })
  } catch (error) {
    console.error('Photo upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
