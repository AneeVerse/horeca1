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
