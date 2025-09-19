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

// GPT-5
export function getCaretCharIndex(rootEl: HTMLElement, clientX: number, clientY: number): number | null {
  const doc = rootEl.ownerDocument || document;

  // Try WebKit/Blink
  const rangeFromPoint = (doc as any).caretRangeFromPoint?.(clientX, clientY) as Range | undefined;
  if (rangeFromPoint) {
    const before = doc.createRange();
    before.setStart(rootEl, 0);
    before.setEnd(rangeFromPoint.startContainer, rangeFromPoint.startOffset);
    return before.toString().length;
  }

  // Fallback Firefox
  const pos = (doc as any).caretPositionFromPoint?.(clientX, clientY);
  if (pos) {
    const before = doc.createRange();
    before.setStart(rootEl, 0);
    before.setEnd(pos.offsetNode, pos.offset);
    return before.toString().length;
  }

  return null;
}

// gpt-4.1
export function offsetsToLineNumbers(
  text: string,
  offsets: number[] // [startOffset, endOffset]
): { startLine: number, endLine: number } {
  const lines = text.split('\n');

  let charCount = 0;
  let startLine = -1;
  let endLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1; // +1 for the newline character

    if (startLine === -1 && charCount + lineLen > offsets[0]) {
      startLine = i + 1;
    }
    if (endLine === -1 && charCount + lineLen > offsets[1]) {
      endLine = i + 1;
      break;
    }
    charCount += lineLen;
  }

  return { startLine, endLine };
}
