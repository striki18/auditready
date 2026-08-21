/**
 * Phase 10 — Rate Limit Handling
 * Retry utilities for API calls and downloads.
 */

import { getAccessToken } from './quickbooks';

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (not counting the initial attempt) */
  maxRetries: number;
  /** Wait time in milliseconds between retries */
  waitMs: number;
  /** Optional custom function to determine if an error is retryable */
  isRetryable?: (error: any) => boolean;
  /** Optional callback fired on each retry attempt */
  onRetry?: (attempt: number, error: any) => void;
}

/**
 * Default configuration for API retry (HTTP 429 rate limiting).
 */
export const API_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  waitMs: 60000, // 60 seconds
  isRetryable: (error: any) => {
    // Only retry on HTTP 429 (rate limited)
    return error?.status === 429 || error?.response?.status === 429;
  },
};

/**
 * Determines if an error is a retryable network/connection error.
 * Does NOT retry on HTTP errors (4xx, 5xx) - those are handled by the caller.
 */
export function isRetryableNetworkError(error: any): boolean {
  // Network/connection errors typically have these codes
  const networkErrorCodes = [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'EAI_AGAIN',
  ];

  // Check error code
  if (error?.code && networkErrorCodes.includes(error.code)) {
    return true;
  }

  // Check for TypeError (fetch failed)
  if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return true;
  }

  // Check for generic network error
  if (error?.name === 'NetworkError') {
    return true;
  }

  // If error has a status code (HTTP response), it's NOT a network error
  if (typeof error?.status === 'number') {
    return false;
  }

  return false;
}

/**
 * Default configuration for download retry (connection failures).
 */
export const DOWNLOAD_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  waitMs: 5000, // 5 seconds
  isRetryable: isRetryableNetworkError,
};

/**
 * Sleep utility - injectable for testing.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic.
 * 
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @returns The result of the function if successful
 * @throws The last error if all retries exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig & { sleep?: (ms: number) => Promise<void> }
): Promise<T> {
  let lastError: any;
  const sleepFn = config.sleep || sleep;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if we should retry
      const retryable = config.isRetryable ? config.isRetryable(error) : false;
      
      if (!retryable || attempt >= config.maxRetries) {
        // Not retryable or max retries reached
        throw error;
      }
      
      // Log retry attempt
      console.log(`[Retry] Attempt ${attempt + 1}/${config.maxRetries} failed, retrying in ${config.waitMs}ms: ${error.message || error}`);
      
      if (config.onRetry) {
        config.onRetry(attempt + 1, error);
      }
      
      // Wait before retrying
      await sleepFn(config.waitMs);
    }
  }
  
  throw lastError;
}

/**
 * Wrapper for QuickBooks API calls that handles HTTP 429 rate limiting.
 * 
 * @param apiCall - Function that makes the QBO API call
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param options - Optional config overrides for testing
 * @returns Result of the API call
 */
export async function withApiRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  options?: Partial<RetryConfig & { sleep?: (ms: number) => Promise<void> }>
): Promise<T> {
  return withRetry(apiCall, {
    ...API_RETRY_CONFIG,
    ...options,
    maxRetries, // Apply maxRetries last so it overrides options
  });
}

/**
 * Wrapper for download operations that handles connection failures.
 * 
 * @param downloadFn - Function that performs the download
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @param options - Optional config overrides for testing
 * @returns Result of the download
 */
export async function withDownloadRetry<T>(
  downloadFn: () => Promise<T>,
  maxRetries: number = 3,
  options?: Partial<RetryConfig & { sleep?: (ms: number) => Promise<void> }>
): Promise<T> {
  return withRetry(downloadFn, {
    ...DOWNLOAD_RETRY_CONFIG,
    ...options,
    maxRetries, // Apply maxRetries last so it overrides options
  });
}
