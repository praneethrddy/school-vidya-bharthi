"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PhotoUploadProps {
  currentPhotoUrl?: string | null;
  name: string;
  onUploadSuccess: (newUrl: string) => void;
}

export function PhotoUpload({ currentPhotoUrl, name, onUploadSuccess }: PhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setFile(selected);
      const url = URL.createObjectURL(selected);
      setPreview(url);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Profile photo updated successfully");
        onUploadSuccess(data.photo_url);
        setIsOpen(false);
      } else {
        toast.error(data.error || "Failed to upload photo");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setTimeout(() => {
        setFile(null);
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
      }, 200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className="relative group cursor-pointer inline-block rounded-full">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-sm">
            <AvatarImage src={currentPhotoUrl || ""} alt={name} className="object-cover" />
            <AvatarFallback className="text-2xl sm:text-4xl bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white flex-col gap-1">
            <Camera className="w-6 h-6 sm:w-8 sm:h-8" />
            <span className="text-[10px] sm:text-xs font-medium">Change</span>
          </div>
        </div>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Profile Photo</DialogTitle>
          <DialogDescription>
            Choose a new photo for your profile. Max size 10MB.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <Avatar className="h-32 w-32 border border-border">
            <AvatarImage src={preview || currentPhotoUrl || ""} alt="Preview" className="object-cover" />
            <AvatarFallback className="text-4xl bg-primary/10 text-primary">
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            className="w-full max-w-xs"
          >
            <Upload className="w-4 h-4 mr-2" />
            Select Image
          </Button>
        </div>
        
        <DialogFooter className="flex gap-2 sm:justify-end">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
