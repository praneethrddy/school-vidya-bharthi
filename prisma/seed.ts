import { PrismaClient, Role, Gender, AttendanceStatus, ConcessionType, FeeFrequency } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // 1. Create School
  const school = await prisma.school.upsert({
    where: { slug: 'vbhs' },
    update: {},
    create: {
      name: 'Vidhya Bharthi High School',
      slug: 'vbhs',
      board: 'CBSE',
      city: 'Hyderabad',
      state: 'Telangana',
    },
  })

  console.log(`School created: ${school.name}`)

  // 2. Create Settings
  const settingsKeys = [
    { key: 'working_days', value: 'MON,TUE,WED,THU,FRI,SAT' },
    { key: 'grading_scheme', value: 'PERCENTAGE' },
    { key: 'receipt_prefix', value: 'VBHS' },
    { key: 'academic_start_month', value: '6' },
    { key: 'attendance_type', value: 'DAILY' },
  ]

  for (const s of settingsKeys) {
    await prisma.schoolSetting.upsert({
      where: { school_id_setting_key: { school_id: school.id, setting_key: s.key } },
      update: {},
      create: {
        school_id: school.id,
        setting_key: s.key,
        setting_value: s.value,
      },
    })
  }

  // 3. Create Academic Year
  const academicYear = await prisma.academicYear.upsert({
    where: { school_id_name: { school_id: school.id, name: '2025-2026' } },
    update: {},
    create: {
      school_id: school.id,
      name: '2025-2026',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2026-03-31'),
      is_current: true,
    },
  })

  // 4. Terms
  const term1 = await prisma.term.upsert({
    where: { school_id_academic_year_id_name: { school_id: school.id, academic_year_id: academicYear.id, name: 'Term 1' } },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      name: 'Term 1',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2025-10-31'),
    },
  })

  const term2 = await prisma.term.upsert({
    where: { school_id_academic_year_id_name: { school_id: school.id, academic_year_id: academicYear.id, name: 'Term 2' } },
    update: {},
    create: {
      school_id: school.id,
      academic_year_id: academicYear.id,
      name: 'Term 2',
      start_date: new Date('2025-11-01'),
      end_date: new Date('2026-03-31'),
    },
  })

  // 5. Create Classes
  const classNames = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
  const classes = []
  for (const name of classNames) {
    const cls = await prisma.class.upsert({
      where: { school_id_academic_year_id_name_section: { school_id: school.id, academic_year_id: academicYear.id, name, section: 'A' } },
      update: {},
      create: {
        school_id: school.id,
        academic_year_id: academicYear.id,
        name,
        section: 'A',
      },
    })
    classes.push(cls)
  }

  // 6. Create Users
  const passwordHash = await bcrypt.hash('Test@1234', 12)

  const roles = [
    { email: 'super@vbhs.com', role: Role.SUPER_ADMIN, school_id: null },
    { email: 'principal@vbhs.com', role: Role.PRINCIPAL, school_id: school.id },
    { email: 'staffadmin@vbhs.com', role: Role.STAFF_ADMIN, school_id: school.id },
    { email: 'studentadmin@vbhs.com', role: Role.STUDENT_ADMIN, school_id: school.id },
    { email: 'accountant@vbhs.com', role: Role.ACCOUNTANT, school_id: school.id },
    { email: 'teacher@vbhs.com', role: Role.TEACHER, school_id: school.id },
    { email: 'student@vbhs.com', role: Role.STUDENT, school_id: school.id },
    { email: 'parent@vbhs.com', role: Role.PARENT, school_id: school.id },
  ]

  const users: any = {}

  for (const r of roles) {
    // We treat SUPER_ADMIN differently (assuming null school ignores school_id indexing for upsert)
    // Here we'll just check if it exists:
    let user = null
    if (r.role === Role.SUPER_ADMIN) {
      user = await prisma.user.findFirst({ where: { email: r.email, school_id: null } })
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: r.email,
            password_hash: passwordHash,
            role: r.role,
            school_id: null,
          },
        })
      }
    } else {
      user = await prisma.user.upsert({
        // @ts-ignore
        where: { school_id_email: { school_id: school.id, email: r.email } },
        update: {},
        create: {
          school_id: school.id,
          email: r.email,
          password_hash: passwordHash,
          role: r.role,
        },
      })
    }
    users[r.role] = user
  }

  // 6.5. Create Student and Parent Profiles for School A
  const studentClass = classes[0] // Grade 6
  const studentProfile = await prisma.student.upsert({
    where: { school_id_admission_number: { school_id: school.id, admission_number: 'ADM001' } },
    update: {},
    create: {
      school_id: school.id,
      user_id: users[Role.STUDENT].id,
      admission_number: 'ADM001',
      first_name: 'Aarav',
      last_name: 'Sharma',
      date_of_birth: new Date('2014-01-01'),
      class_id: studentClass.id,
      academic_year_id: academicYear.id,
    },
  })

  const parentProfile = await prisma.parent.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      school_id: school.id,
      user_id: users[Role.PARENT].id,
      first_name: 'Ramesh',
      last_name: 'Sharma',
      phone: '9999999999',
      email: 'parent@vbhs.com',
    },
  })

  await prisma.studentParent.upsert({
    where: { school_id_student_id_parent_id: { school_id: school.id, student_id: studentProfile.id, parent_id: parentProfile.id } },
    update: {},
    create: {
      school_id: school.id,
      student_id: studentProfile.id,
      parent_id: parentProfile.id,
      is_primary: true,
    },
  })

  // 6.6. Create School B (for tenant isolation tests)
  const schoolB = await prisma.school.upsert({
    where: { slug: 'greenvalley' },
    update: {},
    create: {
      name: 'Green Valley School',
      slug: 'greenvalley',
      board: 'ICSE',
      city: 'Bangalore',
      state: 'Karnataka',
    },
  })

  const academicYearB = await prisma.academicYear.upsert({
    where: { school_id_name: { school_id: schoolB.id, name: '2025-2026' } },
    update: {},
    create: {
      school_id: schoolB.id,
      name: '2025-2026',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2026-03-31'),
      is_current: true,
    },
  })

  const classB = await prisma.class.upsert({
    where: { school_id_academic_year_id_name_section: { school_id: schoolB.id, academic_year_id: academicYearB.id, name: 'Grade 6', section: 'A' } },
    update: {},
    create: {
      school_id: schoolB.id,
      academic_year_id: academicYearB.id,
      name: 'Grade 6',
      section: 'A',
    },
  })

  const principalBUser = await prisma.user.upsert({
    where: { school_id_email: { school_id: schoolB.id, email: 'principal@gvs.com' } },
    update: {},
    create: {
      school_id: schoolB.id,
      email: 'principal@gvs.com',
      password_hash: passwordHash,
      role: Role.PRINCIPAL,
    },
  })

  const studentBUser = await prisma.user.upsert({
    where: { school_id_email: { school_id: schoolB.id, email: 'student@gvs.com' } },
    update: {},
    create: {
      school_id: schoolB.id,
      email: 'student@gvs.com',
      password_hash: passwordHash,
      role: Role.STUDENT,
    },
  })

  const parentBUser = await prisma.user.upsert({
    where: { school_id_email: { school_id: schoolB.id, email: 'parent@gvs.com' } },
    update: {},
    create: {
      school_id: schoolB.id,
      email: 'parent@gvs.com',
      password_hash: passwordHash,
      role: Role.PARENT,
    },
  })

  const studentBProfile = await prisma.student.upsert({
    where: { school_id_admission_number: { school_id: schoolB.id, admission_number: 'ADM-B-001' } },
    update: {},
    create: {
      school_id: schoolB.id,
      user_id: studentBUser.id,
      admission_number: 'ADM-B-001',
      first_name: 'Bob',
      last_name: 'Jones',
      date_of_birth: new Date('2014-01-01'),
      class_id: classB.id,
      academic_year_id: academicYearB.id,
    },
  })

  const parentBProfile = await prisma.parent.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      school_id: schoolB.id,
      user_id: parentBUser.id,
      first_name: 'Alice',
      last_name: 'Jones',
      phone: '8888888888',
      email: 'parent@gvs.com',
    },
  })

  await prisma.studentParent.upsert({
    where: { school_id_student_id_parent_id: { school_id: schoolB.id, student_id: studentBProfile.id, parent_id: parentBProfile.id } },
    update: {},
    create: {
      school_id: schoolB.id,
      student_id: studentBProfile.id,
      parent_id: parentBProfile.id,
      is_primary: true,
    },
  })

  // 7. Create Staff
  const staffToCreate = [
    { user_id: users[Role.PRINCIPAL].id, first: 'Rakesh', last: 'Sharma', code: 'EMP100', desig: 'Principal' },
    { user_id: users[Role.STAFF_ADMIN].id, first: 'Anita', last: 'Desai', code: 'EMP101', desig: 'Staff Admin' },
    { user_id: users[Role.TEACHER].id, first: 'Vikram', last: 'Singh', code: 'EMP102', desig: 'Teacher' },
    { user_id: undefined, first: 'Meera', last: 'Patel', code: 'EMP103', desig: 'Teacher' },
    { user_id: users[Role.ACCOUNTANT].id, first: 'Sanjay', last: 'Gupta', code: 'EMP104', desig: 'Accountant' }
  ]

  const staff = []
  for (const s of staffToCreate) {
    const st = await prisma.staff.upsert({
      where: { school_id_employee_code: { school_id: school.id, employee_code: s.code } },
      update: {},
      create: {
        school_id: school.id,
        user_id: s.user_id,
        employee_code: s.code,
        first_name: s.first,
        last_name: s.last,
        designation: s.desig,
      },
    })
    staff.push(st)
  }

  // 8. Create Subjects
  const subjectList = ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi']
  for (const cls of classes) {
    for (const sub of subjectList) {
      await prisma.subject.upsert({
        where: { school_id_class_id_code: { school_id: school.id, class_id: cls.id, code: sub.substring(0, 3).toUpperCase() } },
        update: {},
        create: {
          school_id: school.id,
          class_id: cls.id,
          name: sub,
          code: sub.substring(0, 3).toUpperCase(),
        },
      })
    }
  }

  // 9. Permissions Seed
  const permissionModules = [
    'ATTENDANCE', 'GRADES', 'FEES', 'STUDENTS', 'STAFF', 'TIMETABLE',
    'HOMEWORK', 'ANNOUNCEMENTS', 'ADMISSIONS', 'LIBRARY', 'TRANSPORT', 'REPORTS', 'SETTINGS'
  ]

  let permCount = 0
  for (const mod of permissionModules) {
    const actions = ['create', 'read', 'update', 'delete'] // generic map for seed
    for (const act of actions) {
      const code = `${mod}.${act}`
      const isPrincipalOnly = ['FEES.delete', 'STUDENTS.delete', 'STAFF.delete', 'SETTINGS.update'].includes(code)
      await prisma.permission.upsert({
        where: { code },
        update: {},
        create: {
          code,
          module: mod,
          action: act,
          name: `Can ${act} ${mod}`,
          is_principal_only: isPrincipalOnly,
        },
      })
      permCount++
    }
  }

  // Seed application-specific permissions
  const ROLE_PERMISSION_DEFAULTS = {
    STAFF_ADMIN: ['STAFF.create', 'STAFF.view', 'STAFF.edit', 'ATTENDANCE.view_all'],
    STUDENT_ADMIN: [
      'STUDENTS.create',
      'STUDENTS.view',
      'STUDENTS.edit',
      'STUDENTS.promote',
      'STUDENTS.assign_class',
      'ADMISSIONS.create',
      'ADMISSIONS.view',
      'ADMISSIONS.process',
      'ADMISSIONS.shortlist',
      'ADMISSIONS.schedule_test',
    ],
    ACCOUNTANT: [
      'FEES.view_structure',
      'FEES.record_payment',
      'FEES.generate_receipt',
      'FEES.view_reports',
      'FEES.view_defaulters',
      'FEES.create_concession_request',
    ],
    TEACHER: [
      'ATTENDANCE.mark',
      'ATTENDANCE.view_own_class',
      'GRADES.enter',
      'GRADES.view_own_subject',
      'HOMEWORK.create',
      'HOMEWORK.view',
      'HOMEWORK.edit',
      'HOMEWORK.grade_submissions',
      'TIMETABLE.view',
    ],
  }

  const PRINCIPAL_ONLY_PERMISSION_CODES = [
    'ATTENDANCE.delete',
    'FEES.approve_concession',
    'FEES.configure_structure',
    'STUDENTS.delete',
    'STAFF.delete',
    'ADMISSIONS.admit',
    'ADMISSIONS.reject',
    'SETTINGS.manage_permissions',
  ]

  const allSpecificCodes = new Set([
    ...Object.values(ROLE_PERMISSION_DEFAULTS).flat(),
    ...PRINCIPAL_ONLY_PERMISSION_CODES
  ])

  for (const code of allSpecificCodes) {
    const parts = code.split('.')
    const isPrincipalOnly = PRINCIPAL_ONLY_PERMISSION_CODES.includes(code)
    await prisma.permission.upsert({
      where: { code },
      update: { is_principal_only: isPrincipalOnly },
      create: {
        code,
        module: parts[0],
        action: parts[1],
        name: `Can ${parts[1]} ${parts[0]}`,
        is_principal_only: isPrincipalOnly,
      }
    })
    permCount++
  }

  // Seeding RolePermissions for School A (vbhs)
  for (const [roleStr, codes] of Object.entries(ROLE_PERMISSION_DEFAULTS)) {
    const roleEnum = roleStr as Role
    for (const code of codes) {
      const dbPerm = await prisma.permission.findUnique({ where: { code } })
      if (dbPerm) {
        const existing = await prisma.rolePermission.findFirst({
          where: {
            school_id: school.id,
            role: roleEnum,
            permission_id: dbPerm.id,
          }
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              school_id: school.id,
              role: roleEnum,
              permission_id: dbPerm.id,
              granted_by: users[Role.PRINCIPAL].id,
            }
          })
        }
      }
    }
  }

  // Seeding RolePermissions for School B (greenvalley)
  for (const [roleStr, codes] of Object.entries(ROLE_PERMISSION_DEFAULTS)) {
    const roleEnum = roleStr as Role
    for (const code of codes) {
      const dbPerm = await prisma.permission.findUnique({ where: { code } })
      if (dbPerm) {
        const existing = await prisma.rolePermission.findFirst({
          where: {
            school_id: schoolB.id,
            role: roleEnum,
            permission_id: dbPerm.id,
          }
        })
        if (!existing) {
          await prisma.rolePermission.create({
            data: {
              school_id: schoolB.id,
              role: roleEnum,
              permission_id: dbPerm.id,
              granted_by: principalBUser.id,
            }
          })
        }
      }
    }
  }
  
  console.log(`Seeded ${permCount} permissions.`)
  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
