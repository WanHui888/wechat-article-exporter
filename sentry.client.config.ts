import * as Sentry from '@sentry/nuxt';
import { useRuntimeConfig } from '#imports';

const dsn = useRuntimeConfig().public.sentry.dsn;

if (process.env.NODE_ENV === 'production' && dsn) {
  Sentry.init({
    dsn: dsn,
    environment: process.env.NODE_ENV || 'development',

    // Adds request headers and IP for users, for more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nuxt/configuration/options/#sendDefaultPii
    sendDefaultPii: true,

    integrations: [
      Sentry.browserTracingIntegration({ router: useRouter() }), // 路由追踪
      Sentry.replayIntegration(),
      // Sentry.feedbackIntegration({
      //   colorScheme: 'system',
      // }),

      // send console.log, console.warn, and console.error calls as logs to Sentry
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for tracing.
    // We recommend adjusting this value in production
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
    tracesSampleRate: 0.5,

    // Capture Replay for 10% of all sessions,
    // plus for 100% of sessions with an error
    // Learn more at
    // https://docs.sentry.io/platforms/javascript/session-replay/configuration/#general-integration-configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,
  });
}
