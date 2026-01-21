export type TelemetryLevel = 'INFO' | 'WARN' | 'ERROR';

export class Telemetry {
  static log(level: TelemetryLevel, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const dataStr = data ? JSON.stringify(data) : '';
    console.log(`[TELEMETRY] ${level}: ${message} ${dataStr}`);
  }

  static info(message: string, data?: any): void {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: any): void {
    this.log('WARN', message, data);
  }

  static error(message: string, data?: any): void {
    this.log('ERROR', message, data);
  }
}
