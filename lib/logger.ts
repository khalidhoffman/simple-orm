import { inspect } from 'util';

export abstract class AbstractLogger {
  abstract log(level: 'info' | 'debug' | 'warn' | 'error', message: string, metadata?: any): void;
}

export class DefaultLogger extends AbstractLogger {

  dump(data: any, label?: string) {
    const dump: string = inspect(data, { depth: 0, colors: true });

    console.log(label ? `${label}: ${dump}` : dump);
  }

  log(level: 'info' | 'debug' | 'warn' | 'error', message: string, metadata?: any) {
    switch (level) {
      case 'error':
        console.error.apply(console, [`${level}: ${message}`].concat(metadata));
        break;
      case 'info':
      case 'debug':
      case 'warn':
        console.log.apply(console, [`${level}: ${message}`].concat(metadata));
        break;
    }
  }
}

export const logger = new DefaultLogger();