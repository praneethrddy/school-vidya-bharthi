"use client";

import { PhotoUpload } from "./photo-upload";
import { Badge } from "@/components/ui/badge";

interface ProfileHeaderProps {
  profile: any;
  role: string;
  onPhotoUploadSuccess: (url: string) => void;
}

export function ProfileHeader({ profile, role, onPhotoUploadSuccess }: ProfileHeaderProps) {
  const fullName = `${profile.first_name} ${profile.last_name}`;
  
  let subtitle = "";
  if (role === "STUDENT") {
    subtitle = `Class: ${profile.class_name || "N/A"} • Roll No: ${profile.roll_number || "N/A"}`;
  } else if (role === "PARENT") {
    subtitle = profile.occupation || "Parent";
  } else {
    subtitle = `${profile.designation || "Staff"} ${profile.department ? `• ${profile.department}` : ""}`;
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-card rounded-xl border shadow-sm mb-6">
      <PhotoUpload
        name={fullName}
        currentPhotoUrl={profile.photo_url}
        onUploadSuccess={onPhotoUploadSuccess}
      />
      <div className="flex flex-col items-center md:items-start text-center md:text-left gap-2">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
          <p className="text-muted-foreground font-medium">{subtitle}</p>
        </div>
        <Badge variant={role === "STUDENT" ? "default" : role === "PARENT" ? "secondary" : "outline"} className="mt-1 text-xs">
          {role.replace("_", " ")}
        </Badge>
      </div>
    </div>
  );
}
