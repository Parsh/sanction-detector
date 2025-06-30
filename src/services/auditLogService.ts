import { writeJsonFile, ensureDirectoryExists, getDateBasedFilePath, getCurrentTimestamp, generateCorrelationId } from '../utils/fileUtils';
import { AuditLog } from '../types';
import config from '../config';
import logger from '../utils/logger';
import path from 'path';

/**
 * Service for managing audit logs
 */
export class AuditLogService {
  constructor() {
    this.initializeDirectories();
  }

  private async initializeDirectories(): Promise<void> {
    await ensureDirectoryExists(config.auditLogsDir);
  }

  /**
   * Log a screening action
   */
  public async logScreeningAction(
    action: string,
    address: string,
    result: Record<string, unknown>,
    processingTimeMs: number,
    correlationId?: string,
    txHash?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      const auditLog: AuditLog = {
        id: generateCorrelationId(),
        action,
        address,
        result,
        timestamp: getCurrentTimestamp(),
        correlationId: correlationId || generateCorrelationId(),
        processingTimeMs,
        success,
        ...(txHash && { txHash }),
        ...(errorMessage && { errorMessage })
      };

      await this.writeAuditLog(auditLog);
    } catch (error) {
      logger.error('Failed to write audit log:', error);
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Log address screening
   */
  public async logAddressScreening(
    address: string,
    result: Record<string, unknown>,
    processingTimeMs: number,
    correlationId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logScreeningAction(
      'ADDRESS_SCREENING',
      address,
      result,
      processingTimeMs,
      correlationId,
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log transaction screening
   */
  public async logTransactionScreening(
    txHash: string,
    address: string,
    result: Record<string, unknown>,
    processingTimeMs: number,
    correlationId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logScreeningAction(
      'TRANSACTION_SCREENING',
      address,
      result,
      processingTimeMs,
      correlationId,
      txHash,
      success,
      errorMessage
    );
  }

  /**
   * Log bulk screening
   */
  public async logBulkScreening(
    itemCount: number,
    result: Record<string, unknown>,
    processingTimeMs: number,
    correlationId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logScreeningAction(
      'BULK_SCREENING',
      `bulk_${itemCount}_items`,
      result,
      processingTimeMs,
      correlationId,
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Log risk assessment
   */
  public async logRiskAssessment(
    address: string,
    result: Record<string, unknown>,
    processingTimeMs: number,
    correlationId?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.logScreeningAction(
      'RISK_ASSESSMENT',
      address,
      result,
      processingTimeMs,
      correlationId,
      undefined,
      success,
      errorMessage
    );
  }

  /**
   * Write audit log to file
   */
  private async writeAuditLog(auditLog: AuditLog): Promise<void> {
    try {
      const filename = `audit_${auditLog.timestamp.split('T')[0]}.json`;
      const filePath = getDateBasedFilePath(config.auditLogsDir, filename);
      
      // Ensure the date directory exists
      await ensureDirectoryExists(path.dirname(filePath));
      
      // Read existing logs for the day or create new array
      let existingLogs: AuditLog[] = [];
      try {
        const { readJsonFile } = await import('../utils/fileUtils');
        existingLogs = await readJsonFile<AuditLog[]>(filePath);
      } catch (error: any) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
        // File doesn't exist, start with empty array
      }
      
      // Add new log
      existingLogs.push(auditLog);
      
      // Write back to file
      await writeJsonFile(filePath, existingLogs);
      
      logger.debug('Audit log written successfully', {
        action: auditLog.action,
        address: auditLog.address,
        correlationId: auditLog.correlationId,
        filePath
      });
    } catch (error) {
      logger.error('Failed to write audit log:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific date
   */
  public async getAuditLogsForDate(date: string): Promise<AuditLog[]> {
    try {
      const filename = `audit_${date}.json`;
      const filePath = getDateBasedFilePath(config.auditLogsDir, filename);
      
      const { readJsonFile } = await import('../utils/fileUtils');
      return await readJsonFile<AuditLog[]>(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      logger.error(`Failed to read audit logs for date ${date}:`, error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific correlation ID
   */
  public async getAuditLogsByCorrelationId(correlationId: string, days: number = 7): Promise<AuditLog[]> {
    const logs: AuditLog[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    try {
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr) {
          const dailyLogs = await this.getAuditLogsForDate(dateStr);
          const matchingLogs = dailyLogs.filter(log => log.correlationId === correlationId);
          logs.push(...matchingLogs);
        }
      }
    } catch (error) {
      logger.error(`Failed to search audit logs by correlation ID ${correlationId}:`, error);
      throw error;
    }
    
    return logs;
  }

  /**
   * Get audit logs for a specific address
   */
  public async getAuditLogsByAddress(address: string, days: number = 7): Promise<AuditLog[]> {
    const logs: AuditLog[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    try {
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr) {
          const dailyLogs = await this.getAuditLogsForDate(dateStr);
          const matchingLogs = dailyLogs.filter(log => 
            log.address.toLowerCase() === address.toLowerCase()
          );
          logs.push(...matchingLogs);
        }
      }
    } catch (error) {
      logger.error(`Failed to search audit logs by address ${address}:`, error);
      throw error;
    }
    
    return logs;
  }

  /**
   * Get statistics for audit logs
   */
  public async getAuditStats(days: number = 7): Promise<Record<string, any>> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const stats = {
      totalLogs: 0,
      successfulLogs: 0,
      failedLogs: 0,
      actionCounts: {} as Record<string, number>,
      averageProcessingTime: 0,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    };
    
    let totalProcessingTime = 0;
    
    try {
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        if (dateStr) {
          const dailyLogs = await this.getAuditLogsForDate(dateStr);
          
          for (const log of dailyLogs) {
            stats.totalLogs++;
            
            if (log.success) {
              stats.successfulLogs++;
            } else {
              stats.failedLogs++;
            }
            
            stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1;
            totalProcessingTime += log.processingTimeMs;
          }
        }
      }
      
      if (stats.totalLogs > 0) {
        stats.averageProcessingTime = totalProcessingTime / stats.totalLogs;
      }
    } catch (error) {
      logger.error('Failed to calculate audit stats:', error);
      throw error;
    }
    
    return stats;
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();
