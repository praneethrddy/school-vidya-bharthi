"use client";

import { useState } from "react";
import { ProfileHeader } from "./profile-header";
import { ProfileForm } from "./profile-form";
import { PasswordChangeForm } from "./password-change-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProfileClient({ initialProfile, role }: { initialProfile: any; role: string }) {
  const [profile, setProfile] = useState(initialProfile);

  const handlePhotoUploadSuccess = (url: string) => {
    setProfile((prev: any) => ({ ...prev, photo_url: url }));
  };

  const handleProfileUpdate = (updatedData: any) => {
    setProfile((prev: any) => ({ ...prev, ...updatedData }));
  };

  return (
    <>
      <ProfileHeader 
        profile={profile} 
        role={role} 
        onPhotoUploadSuccess={handlePhotoUploadSuccess} 
      />

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="general">General Information</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                View and update your personal information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} role={role} onSuccess={handleProfileUpdate} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordChangeForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
