import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiBaseUrl() {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const url = env.VITE_API_BASE_URL || env.VITE_PUBLIC_URL || window.location.origin;
  return String(url);
}
