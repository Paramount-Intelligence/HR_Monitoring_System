import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanReason(reason: string | null | undefined): string {
  if (!reason) return "—"
  let cleaned = String(reason).trim()
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim()
  }
  return cleaned
}

