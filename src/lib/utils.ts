import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for combining class names with tailwind-merge support.
 * Ensures that Tailwind classes are merged correctly and conflicts are resolved.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

/**
 * Combine `packSize` (e.g. "500") and `unit` (e.g. "ml") for display: "500 ml".
 * - If packSize already contains the unit (legacy "500ml" data), returns as-is.
 * - If only one is present, returns it alone.
 * - If both are empty, returns empty string (caller decides fallback).
 */
export function formatPackSize(packSize?: string | null, unit?: string | null): string {
    const ps = (packSize ?? '').trim();
    const u = (unit ?? '').trim();
    if (!ps && !u) return '';
    if (!u) return ps;
    if (!ps) return u;
    if (ps.toLowerCase().includes(u.toLowerCase())) return ps;
    return `${ps} ${u}`;
}

/**
 * Format price for display in INR (Indian Rupee).
 */
export function formatPrice(price: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(price);
}

/**
 * Debounce function for performance optimization.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/**
 * Throttle function for performance optimization.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}

/**
 * Generate a short unique ID.
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Truncate text with ellipsis.
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
}

/**
 * Environment checks.
 */
export const isClient = typeof window !== 'undefined';
export const isServer = typeof window === 'undefined';

/** Extract the real client IP from a Next.js request, handling proxies. */
export function getClientIp(req: { headers: { get(name: string): string | null } }): string {
    return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}
