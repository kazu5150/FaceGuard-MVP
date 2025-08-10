// CSS class utility
export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}

// API Response helper
export function createResponse<T>(data: T): { success: boolean; data: T } {
  return { success: true, data };
}

export function createErrorResponse(error: string): { success: boolean; error: string } {
  return { success: false, error };
}

// Validation helpers
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 1 && name.trim().length <= 50;
}

// Format helpers
export function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Security helpers
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

// Face recognition helpers
export function isValidFaceEmbedding(embedding: unknown): embedding is number[] {
  return Array.isArray(embedding) && 
         embedding.length > 0 && 
         embedding.every(value => typeof value === 'number' && !isNaN(value));
}

export function isValidQualityScore(quality: unknown): quality is number {
  return typeof quality === 'number' && 
         quality >= 0 && 
         quality <= 1 && 
         !isNaN(quality);
}