import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/portal/profile-client";

export const metadata = { title: "My Profile" };

export default async function ProfilePage({ params }: { params: Promise<any> }) {
  await params;

  const session = await auth();
  if (!session?.user) redirect('/login');

  const { id, role, schoolId } = session.user;
  
  let profile = null;
  
  if (role === 'STUDENT') {
    const student = await prisma.student.findFirst({
      where: { user_id: id, school_id: schoolId! },
      include: { class: true }
    });
    if (student) {
      profile = {
        first_name: student.first_name, last_name: student.last_name, gender: student.gender,
        date_of_birth: student.date_of_birth?.toISOString(), blood_group: student.blood_group,
        phone: student.phone, address: student.address,
        emergency_contact_name: student.emergency_contact_name, emergency_contact_phone: student.emergency_contact_phone,
        photo_url: student.photo_url, admission_number: student.admission_number,
        class_name: student.class ? `${student.class.name} ${student.class.section || ''}`.trim() : null,
        roll_number: student.roll_number
      };
    }
  } else if (role === 'PARENT') {
    const parent = await prisma.parent.findFirst({
      where: { user_id: id, school_id: schoolId! },
      include: { students: { include: { student: { include: { class: true } } } } }
    });
    if (parent) {
      profile = {
        first_name: parent.first_name, last_name: parent.last_name, relation: parent.relation,
        phone: parent.phone, alternate_phone: parent.alternate_phone, email: parent.email,
        occupation: parent.occupation, address: parent.address, photo_url: parent.photo_url,
        children: parent.students.map(sp => ({
          name: `${sp.student.first_name} ${sp.student.last_name}`,
          class_name: sp.student.class ? `${sp.student.class.name} ${sp.student.class.section || ''}`.trim() : null
        }))
      };
    }
  } else {
    // Staff roles
    const staff = await prisma.staff.findFirst({
      where: { user_id: id, school_id: schoolId! }
    });
    if (staff) {
      profile = {
        first_name: staff.first_name, last_name: staff.last_name, gender: staff.gender,
        date_of_birth: staff.date_of_birth?.toISOString(), phone: staff.phone,
        address: staff.address, photo_url: staff.photo_url, employee_code: staff.employee_code,
        designation: staff.designation, department: staff.department,
        date_of_joining: staff.date_of_joining?.toISOString(), qualification: staff.qualification
      };
    }
  }

  if (!profile) {
    return <div className="p-6">Profile not found. Please contact administrator.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 px-4 pt-4 md:px-6">
      <ProfileClient initialProfile={profile} role={role} />
    </div>
  );
}
