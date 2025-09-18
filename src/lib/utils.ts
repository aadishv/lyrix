import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function log<T>(message: T) {
  if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
    console.log(message);
  }
  return message;
}
export function convertMsToMs(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number): string => num.toString().padStart(2, "0");

  return `${pad(minutes)}:${pad(seconds)}`;
}
