import pino from 'pino'

const config = {
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  browser: {
    write: (o: any) => console.log(JSON.stringify(o)),
  },
  worker: {
    autoEnd: false
  },
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
    },
  } : undefined,
  formatters: {
    bindings: () => ({}),
  },
}

export const logger = pino(config)

export type Logger = typeof logger 