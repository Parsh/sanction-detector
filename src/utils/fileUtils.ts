import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Ensure directory exists, create if it doesn't
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Read JSON file with type safety
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write JSON file with formatting
 */
export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDirectoryExists(path.dirname(filePath));
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * Check if file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate correlation ID for request tracking
 */
export function generateCorrelationId(): string {
  return uuidv4();
}

/**
 * Get current timestamp in ISO format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Calculate expiration timestamp
 */
export function getExpirationTimestamp(hoursFromNow: number): string {
  const expirationDate = new Date();
  expirationDate.setHours(expirationDate.getHours() + hoursFromNow);
  return expirationDate.toISOString();
}

/**
 * Check if timestamp has expired
 */
export function isExpired(timestamp: string): boolean {
  return new Date(timestamp) < new Date();
}

/**
 * Format file path with date for audit logs
 */
export function getDateBasedFilePath(baseDir: string, filename: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  if (!today) {
    throw new Error('Failed to generate date string');
  }
  return path.join(baseDir, today, filename);
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-z0-9.-]/gi, '_');
}

/**
 * Calculate performance timing
 */
export function calculateProcessingTime(startTime: number): number {
  return Date.now() - startTime;
}
