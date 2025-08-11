export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface SecurityEvent {
  type: 'rate_limit' | 'suspicious_activity' | 'validation_error' | 'authentication_failure';
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, unknown>;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function getClientIP(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0] ||
         headers.get('x-real-ip') ||
         headers.get('x-client-ip') ||
         'unknown';
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const existing = rateLimitStore.get(key);
  
  if (!existing || existing.resetTime <= now) {
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime
    };
  }
  
  if (existing.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime
    };
  }
  
  existing.count++;
  rateLimitStore.set(key, existing);
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  };
}

export function validateFaceEmbedding(embedding: unknown): { valid: boolean; error?: string } {
  if (!Array.isArray(embedding)) {
    return { valid: false, error: 'Face embedding must be an array' };
  }
  
  if (embedding.length === 0) {
    return { valid: false, error: 'Face embedding is empty' };
  }
  
  if (embedding.some(val => typeof val !== 'number')) {
    return { valid: false, error: 'Face embedding must contain only numbers' };
  }
  
  if (embedding.length !== 234) {
    return { valid: false, error: `Invalid embedding length: expected 234, got ${embedding.length}` };
  }
  
  return { valid: true };
}

export function validateQuality(quality: unknown): { valid: boolean; error?: string } {
  if (typeof quality !== 'number') {
    return { valid: false, error: 'Quality must be a number' };
  }
  
  if (quality < 0 || quality > 1) {
    return { valid: false, error: 'Quality must be between 0 and 1' };
  }
  
  return { valid: true };
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  };
}

export function detectSuspiciousActivity(ip: string, userAgent: string): boolean {
  if (!ip || ip === 'unknown') {
    return false;
  }
  
  if (!userAgent || userAgent.length < 10) {
    return true;
  }
  
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(userAgent));
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logEntry = {
    timestamp: event.timestamp.toISOString(),
    type: event.type,
    ip: event.ip,
    userAgent: event.userAgent,
    ...event.details
  };
  
  console.warn('Security Event:', JSON.stringify(logEntry));
}