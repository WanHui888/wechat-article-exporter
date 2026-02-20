import { type EventBusKey, useEventBus } from '@vueuse/core';

const accountEventKey: EventBusKey<string> = Symbol('account-event');

// 统一的账号相关事件，用于不同组件之间同步状态
type AccountEvent = 'account-added' | 'account-removed';
interface AccountEventPayload {
  fakeid: string;
}

export default () => {
  const accountEventBus = useEventBus<AccountEvent, AccountEventPayload>(accountEventKey);

  return {
    accountEventBus,
  };
};
