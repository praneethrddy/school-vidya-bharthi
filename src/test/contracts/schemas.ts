import { z } from 'zod'

// Helper Common Schemas
export const PaginationSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number().optional(),
  total_pages: z.number().optional(), // Route support varies
})

export const StudentSchema = z.object({
  id: z.string().uuid(),
  admission_number: z.string(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  name: z.string().optional(),
  gender: z.string().nullable().optional(),
  date_of_birth: z.string().optional(),
  blood_group: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  roll_number: z.string().nullable().optional(),
  is_active: z.boolean(),
  class_id: z.string().uuid().nullable().optional(),
  class: z.union([
    z.string(),
    z.object({
      id: z.string().uuid().optional(),
      name: z.string(),
      section: z.string().nullable().optional(),
    })
  ]).nullable().optional(),
  section: z.string().nullable().optional(),
  academic_year: z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
  }).nullable().optional(),
})

export const StaffSchema = z.object({
  id: z.string().uuid(),
  employee_code: z.string().nullable().optional(),
  first_name: z.string(),
  last_name: z.string(),
  name: z.string().optional(),
  photo_url: z.string().nullable().optional(),
  designation: z.string().nullable().optional(),
  department: z.string().nullable().optional(),
  is_active: z.boolean(),
  user_id: z.string().uuid().nullable().optional(),
  user_email: z.string().nullable().optional(),
  user_role: z.string().nullable().optional(),
  user_is_active: z.boolean().nullable().optional(),
  subjects_count: z.number().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const AttendanceSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
  date: z.string(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY']),
  remarks: z.string().nullable().optional(),
})

export const GradeSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  exam_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  marks_obtained: z.number().nullable().optional(),
  grade: z.string().nullable().optional(),
  remarks: z.string().nullable().optional(),
})

export const FeeStructureSchema = z.object({
  id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  class_id: z.string().uuid(),
  fee_category_id: z.string().uuid(),
  amount: z.number(),
  frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
})

export const FeePaymentSchema = z.object({
  id: z.string().uuid(),
  student_id: z.string().uuid(),
  fee_structure_id: z.string().uuid(),
  amount_paid: z.number(),
  payment_date: z.string(),
  payment_mode: z.enum(['CASH', 'CHEQUE', 'DD', 'BANK_TRANSFER', 'OTHER']),
  receipt_number: z.string(),
})

export const AdmissionSchema = z.object({
  id: z.string().uuid(),
  school_id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().nullable().optional(),
  phone: z.string(),
  status: z.enum(['APPLIED', 'SHORTLISTED', 'TESTING', 'ADMITTED', 'REJECTED', 'WAITLIST']),
  created_at: z.string(),
})

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['ATTENDANCE', 'FEE', 'GRADE', 'ANNOUNCEMENT', 'HOMEWORK', 'PTM', 'GENERAL']),
  is_read: z.boolean(),
  link: z.string().nullable().optional(),
  created_at: z.string(),
})

export const ClassSchema = z.object({
  id: z.string().uuid(),
  school_id: z.string().uuid(),
  academic_year_id: z.string().uuid(),
  name: z.string(),
  section: z.string().nullable().optional(),
  class_teacher_id: z.string().uuid().nullable().optional(),
  room_number: z.string().nullable().optional(),
  max_students: z.number(),
})

export const AcademicYearSchema = z.object({
  id: z.string().uuid(),
  school_id: z.string().uuid(),
  name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  is_current: z.boolean(),
})

export const TimetableSlotSchema = z.object({
  id: z.string().uuid(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid(),
  staff_id: z.string().uuid(),
  day_of_week: z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
  period_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
})

// 31A - Define Response Schemas

// TEST-CONTRACT-001: StudentListResponse schema
export const StudentListResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    students: z.array(StudentSchema),
    pagination: PaginationSchema,
    filters: z.object({
      classes: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        section: z.string().nullable().optional(),
        label: z.string().optional(),
        academic_year_id: z.string().uuid().optional(),
      })),
      academic_years: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        is_current: z.boolean(),
      })),
    }).optional(),
    search_note: z.string().optional(),
  }).or(z.array(StudentSchema)) // Accept direct array or success wrapper
})

// TEST-CONTRACT-002: StudentDetailResponse schema
export const StudentDetailResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    student: StudentSchema.extend({
      parents: z.array(z.object({
        id: z.string().uuid(),
        first_name: z.string(),
        last_name: z.string(),
        name: z.string().optional(),
        relation: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        is_primary: z.boolean(),
        linked_at: z.string().optional(),
      })),
    }),
    summaries: z.object({
      attendance: z.object({
        total_records: z.number(),
        present: z.number(),
        absent: z.number(),
        late: z.number(),
        half_day: z.number(),
        holiday: z.number().optional(),
      }),
      grades: z.object({
        records: z.number(),
        exams: z.number(),
        average_marks: z.number(),
      }),
      fees: z.object({
        payment_count: z.number(),
        total_paid: z.number(),
        latest_payment: z.object({
          payment_date: z.string(),
          amount_paid: z.number(),
          receipt_number: z.string(),
        }).nullable(),
      }),
    }).optional(),
    activity: z.array(z.object({
      id: z.string(),
      action: z.string(),
      actor_email: z.string(),
      actor_role: z.string(),
      created_at: z.string(),
    })).optional(),
  })
})

// TEST-CONTRACT-003: StaffListResponse schema
export const StaffListResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    staff: z.array(StaffSchema),
    pagination: PaginationSchema,
  }).or(z.array(StaffSchema)), // Direct array or data wrapper
  pagination: PaginationSchema.optional(),
  filters: z.object({
    departments: z.array(z.string()),
    designations: z.array(z.string()),
  }).optional(),
})

// TEST-CONTRACT-004: DashboardStudentResponse schema
export const DashboardStudentResponseSchema = z.object({
  student: z.object({
    id: z.string().uuid(),
    name: z.string(),
    class: z.string(),
    roll_number: z.string().nullable().optional(),
    photo_url: z.string().nullable().optional(),
    academic_year: z.string(),
  }),
  attendance_summary: z.object({
    percentage: z.number(),
    present: z.number(),
    absent: z.number(),
    late: z.number(),
    half_day: z.number(),
    total_days: z.number(),
  }).nullable(),
  fee_summary: z.object({
    total: z.number(),
    paid: z.number(),
    concession: z.number(),
    balance: z.number(),
  }).nullable(),
  grade_summary: z.object({
    last_exam: z.string(),
    percentage: z.number(),
    overall_grade: z.string(),
    grading_scheme: z.string(),
  }).nullable(),
  announcements: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    type: z.string(),
    published_at: z.string().nullable().optional(),
  })),
})

// TEST-CONTRACT-005: DashboardAdminResponse schema
export const DashboardAdminResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    school: z.object({
      id: z.string().uuid(),
      name: z.string(),
      academic_year: z.string(),
      term: z.string(),
    }),
    generated_at: z.string(),
    visible_sections: z.object({
      enrollment: z.boolean(),
      attendance: z.boolean(),
      fee_collection: z.boolean(),
      recent_payments: z.boolean(),
      pending_actions: z.boolean(),
      recent_activity: z.boolean(),
      teacher_summary: z.boolean(),
    }),
    quick_actions: z.array(z.object({
      key: z.string(),
      label: z.string(),
      description: z.string(),
      href: z.string(),
      icon: z.string(),
    })),
    enrollment: z.object({
      total_students: z.number(),
      total_staff: z.number(),
      total_classes: z.number(),
      class_wise: z.array(z.object({
        class_id: z.string().uuid(),
        class_name: z.string(),
        student_count: z.number(),
      })),
    }).nullable(),
    today_attendance: z.object({
      total_students: z.number(),
      present: z.number(),
      absent: z.number(),
      late: z.number(),
      percentage: z.number(),
      not_marked: z.number(),
    }).nullable(),
    fee_collection: z.object({
      total_expected: z.number(),
      total_collected: z.number(),
      total_outstanding: z.number(),
      collection_percentage: z.number(),
      this_month_collected: z.number(),
    }).nullable(),
    recent_payments: z.array(z.object({
      id: z.string().uuid(),
      student_name: z.string(),
      amount: z.number(),
      receipt_number: z.string(),
      date: z.string(),
    })),
    pending_actions: z.object({
      pending_admissions: z.number(),
      pending_concessions: z.number(),
      overdue_books: z.number(),
    }).nullable(),
    recent_activity: z.array(z.object({
      id: z.string(),
      action: z.string(),
      entity_type: z.string(),
      user_name: z.string(),
      timestamp: z.string(),
    })),
    teacher_summary: z.object({
      assigned_classes: z.number(),
      assigned_subjects: z.number(),
      total_students: z.number(),
      classes_marked_today: z.number(),
      class_names: z.array(z.string()),
      grade_entries_recorded: z.number(),
      latest_exam_name: z.string().nullable(),
    }).nullable(),
  }).or(z.any()) // Allow direct payload validation
})

// TEST-CONTRACT-006: AttendanceRecordsResponse schema
export const AttendanceRecordsResponseSchema = z.object({
  records: z.array(z.object({
    date: z.string(),
    status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'HOLIDAY']),
    remarks: z.string().nullable().optional(),
  })),
  summary: z.object({
    total_working_days: z.number(),
    present: z.number(),
    absent: z.number(),
    late: z.number(),
    half_day: z.number(),
    holidays: z.number(),
    percentage: z.number(),
  })
})

// TEST-CONTRACT-007: GradesResponse schema
export const GradesResponseSchema = z.object({
  exams: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    term: z.string(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    subjects: z.array(z.object({
      subject_name: z.string(),
      subject_code: z.string(),
      max_marks: z.number(),
      passing_marks: z.number(),
      marks_obtained: z.number().nullable(),
      grade: z.string().nullable(),
      remarks: z.string().nullable(),
      is_passed: z.boolean(),
    })),
    total_obtained: z.number(),
    total_max: z.number(),
    percentage: z.number(),
    overall_grade: z.string(),
    grading_scheme: z.string(),
  }))
})

// TEST-CONTRACT-008: FeesResponse schema
export const FeesResponseSchema = z.object({
  fee_summary: z.object({
    total_fees: z.number(),
    total_concessions: z.number(),
    total_paid: z.number(),
    total_balance: z.number(),
  }),
  fee_details: z.array(z.object({
    fee_structure_id: z.string().uuid(),
    category_name: z.string(),
    amount: z.number(),
    frequency: z.enum(['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'ANNUALLY']),
    due_date: z.string().nullable().optional(),
    concession: z.object({
      type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
      value: z.number(),
      status: z.string(),
      deduction: z.number(),
    }).nullable().optional(),
    total_paid: z.number(),
    balance: z.number(),
    status: z.string(),
    payments: z.array(z.object({
      id: z.string().uuid(),
      amount_paid: z.number(),
      payment_date: z.string(),
      payment_mode: z.string(),
      receipt_number: z.string(),
      receipt_url: z.string().nullable().optional(),
      category_name: z.string(),
    })),
  }))
})

// TEST-CONTRACT-009: AdmissionsListResponse schema
export const AdmissionsListResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    admissions: z.array(z.object({
      id: z.string().uuid(),
      applicant_name: z.string(),
      date_of_birth: z.string(),
      gender: z.string(),
      applying_for_class: z.string(),
      parent_name: z.string(),
      parent_phone: z.string(),
      parent_email: z.string().nullable().optional(),
      status: z.enum(['APPLIED', 'SHORTLISTED', 'TESTING', 'ADMITTED', 'REJECTED', 'WAITLIST']),
      applied_at: z.string(),
      processed_by: z.string().uuid().nullable().optional(),
      decided_by: z.string().uuid().nullable().optional(),
      remarks: z.string().nullable().optional(),
      documents_url: z.array(z.string()).optional(),
      processed_by_email: z.string().nullable().optional(),
      decided_by_email: z.string().nullable().optional(),
    })),
    pagination: PaginationSchema,
    counts: z.record(z.string(), z.number()),
    current_academic_year_id: z.string().uuid().nullable(),
    filters: z.any().optional(),
  }),
})

// TEST-CONTRACT-010: NotificationsResponse schema
export const NotificationsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    notifications: z.array(NotificationSchema),
    unread_count: z.number(),
    pagination: PaginationSchema,
  }),
})

// TEST-CONTRACT-011: ReportResponse schema (json format)
export const ReportResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    report_type: z.enum(['attendance', 'staff_attendance', 'academic', 'financial']),
    period: z.object({
      from: z.string(),
      to: z.string(),
    }).optional(),
    class: z.object({
      id: z.string().uuid(),
      name: z.string(),
      section: z.string().nullable().optional(),
    }).optional(),
    data: z.any(),
  })
})

// TEST-CONTRACT-012: PermissionsResponse schema
export const PermissionsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    role: z.string(),
    permissions: z.array(z.object({
      id: z.string().uuid(),
      code: z.string(),
      module: z.string(),
      action: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      is_principal_only: z.boolean(),
      is_granted: z.boolean(),
    })),
    grouped_permissions: z.array(z.object({
      module: z.string(),
      permissions: z.array(z.any()),
    })),
  })
})

// TEST-CONTRACT-013: AcademicYearsResponse schema
export const AcademicYearsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    academic_years: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      start_date: z.string(),
      end_date: z.string(),
      is_current: z.boolean(),
      classes_count: z.number(),
      terms: z.array(z.object({
        id: z.string().uuid(),
        name: z.string(),
        start_date: z.string(),
        end_date: z.string(),
      })),
    })),
  })
})

// TEST-CONTRACT-014: ClassesResponse schema
export const ClassesResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    academic_years: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      is_current: z.boolean(),
    })),
    current_academic_year_id: z.string().uuid().nullable(),
    teachers: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
    })),
    classes: z.array(z.object({
      id: z.string().uuid(),
      academic_year_id: z.string().uuid(),
      academic_year_name: z.string(),
      name: z.string(),
      section: z.string().nullable().optional(),
      display_name: z.string(),
      room_number: z.string().nullable().optional(),
      max_students: z.number(),
      class_teacher_id: z.string().uuid().nullable().optional(),
      class_teacher_name: z.string().nullable().optional(),
      current_students: z.number(),
    })),
  })
})

// TEST-CONTRACT-015: TimetableResponse schema
export const TimetableResponseSchema = z.object({
  class_name: z.string(),
  term_name: z.string(),
  working_days: z.array(z.string()),
  schedule: z.record(z.string(), z.array(z.object({
    period_number: z.number(),
    start_time: z.string(),
    end_time: z.string(),
    subject_name: z.string(),
    subject_code: z.string(),
    teacher_name: z.string(),
  })))
})

// TEST-CONTRACT-016: PublicInfoResponse schema
export const PublicInfoResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    school: z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      logo_url: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      board: z.string().nullable().optional(),
    }),
  }),
})

// TEST-CONTRACT-017: SuperAdminSchoolsResponse schema
export const SuperAdminSchoolsResponseSchema = z.object({
  success: z.boolean().optional(),
  data: z.object({
    schools: z.array(z.object({
      id: z.string().uuid(),
      name: z.string(),
      slug: z.string(),
      is_active: z.boolean(),
    })),
  }).or(z.array(z.any())),
})

// Generic Error Response Schema (TEST-CONTRACT-020)
export const ErrorResponseSchema = z.object({
  success: z.literal(false).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).or(z.string())
})
