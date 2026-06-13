"use client";

import { useMemo } from "react";

export function PasswordStrength({ password }: { password?: string }) {
  const strength = useMemo(() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  }, [password]);

  let label = "Weak";
  let colorClass = "bg-red-500";
  
  if (strength >= 50) {
    label = "Fair";
    colorClass = "bg-yellow-500";
  }
  if (strength >= 75) {
    label = "Good";
    colorClass = "bg-blue-500";
  }
  if (strength === 100) {
    label = "Strong";
    colorClass = "bg-green-500";
  }

  return (
    <div className="space-y-2 mt-2">
      <div className="flex justify-between text-xs font-medium">
        <span>Password Strength</span>
        <span className={strength === 100 ? "text-green-600 font-bold" : ""}>{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${strength}%` }}
        />
      </div>
    </div>
  );
}
