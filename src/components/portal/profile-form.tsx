"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarIcon, Lock, Pencil, Save, X } from "lucide-react";
import { format } from "date-fns";

const studentSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional().nullable(),
  emergency_contact_name: z.string().optional().nullable(),
  emergency_contact_phone: z.string().optional().nullable(),
});

const parentSchema = z.object({
  phone: z.string().optional(),
  alternate_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
});

const staffSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional().nullable(),
});

interface ProfileFormProps {
  profile: any;
  role: string;
  onSuccess: (updatedProfile: any) => void;
}

export function ProfileForm({ profile, role, onSuccess }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Setup dynamic schema based on role
  const schema = role === "STUDENT" ? studentSchema : role === "PARENT" ? parentSchema : staffSchema;
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: profile.phone || "",
      address: profile.address || "",
      emergency_contact_name: profile.emergency_contact_name || "",
      emergency_contact_phone: profile.emergency_contact_phone || "",
      alternate_phone: profile.alternate_phone || "",
      occupation: profile.occupation || "",
    } as any,
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      
      if (!res.ok) {
        toast.error(result.error || 'Failed to update profile');
      } else {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        onSuccess(result.profile); // Pass back updated data
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "PPP");
  };

  const renderField = (
    name: any,
    label: string,
    isEditable: boolean,
    type: "text" | "textarea" = "text",
    value?: string
  ) => {
    if (!isEditing || !isEditable) {
      const displayValue = value || profile[name as keyof typeof profile] || "N/A";
      return (
        <div className="space-y-1">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            {label}
            {!isEditable && <Lock className="w-3 h-3 opacity-50" />}
          </label>
          <div className="bg-muted/30 px-3 py-2 rounded-md border text-sm min-h-10 flex items-center">
            {displayValue}
          </div>
        </div>
      );
    }

    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              {type === "textarea" ? (
                <Textarea {...field} value={field.value || ""} className="min-h-20" />
              ) : (
                <Input {...field} value={field.value || ""} />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Personal Information</h2>
          {!isEditing ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2 relative z-10">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isLoading}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {renderField("first_name", "First Name", false)}
          {renderField("last_name", "Last Name", false)}
          
          {(role === "STUDENT" || role === "STAFF") && renderField("gender", "Gender", false)}
          {(role === "STUDENT" || role === "STAFF") && renderField("date_of_birth", "Date of Birth", false, "text", formatDate(profile.date_of_birth))}
          
          {role === "STUDENT" && renderField("blood_group", "Blood Group", false)}
          {role === "PARENT" && renderField("relation", "Relation", false)}
          {role === "PARENT" && renderField("email", "Email", false)}
          {role === "PARENT" && renderField("occupation", "Occupation", true)}
          
          {renderField("phone", "Primary Phone", true)}
          {role === "PARENT" && renderField("alternate_phone", "Alternate Phone", true)}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium border-b pb-2">Address</h3>
          {renderField("address", "Residential Address", true, "textarea")}
        </div>

        {role === "STUDENT" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Emergency Contact</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {renderField("emergency_contact_name", "Contact Name", true)}
              {renderField("emergency_contact_phone", "Contact Phone", true)}
            </div>
          </div>
        )}

        {role === "STUDENT" && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Academic Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {renderField("admission_number", "Admission Number", false)}
              {renderField("class_name", "Class & Section", false)}
              {renderField("roll_number", "Roll Number", false)}
            </div>
          </div>
        )}

        {['TEACHER', 'ACCOUNTANT', 'PRINCIPAL', 'STAFF_ADMIN', 'STUDENT_ADMIN'].includes(role) && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Employment Information</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {renderField("employee_code", "Employee Code", false)}
              {renderField("designation", "Designation", false)}
              {renderField("department", "Department", false)}
              {renderField("date_of_joining", "Date of Joining", false, "text", formatDate(profile.date_of_joining))}
              <div className="sm:col-span-2">
                {renderField("qualification", "Qualification", false, "textarea")}
              </div>
            </div>
          </div>
        )}

        {role === "PARENT" && profile.children && profile.children.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium border-b pb-2">Linked Minors</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {profile.children.map((child: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-md bg-muted/20">
                  <p className="font-semibold">{child.name}</p>
                  <p className="text-sm text-muted-foreground">{child.class_name}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}
