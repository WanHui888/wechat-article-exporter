import { cookieStore } from '~/server/utils/CookieStore';

interface DebugQuery {
  key: string;
}

export default defineEventHandler(async event => {
  const { key } = getQuery<DebugQuery>(event);
  if (key && key === process.env.DEBUG_KEY) {
    return cookieStore.toJSON();
  } else {
    return 'not set debug key';
  }
});
