import { StorageSerializers } from '@vueuse/core';
import type { LoginAccount } from '~/types/types';

export default () => {
  return useLocalStorage<LoginAccount>('login', null, {
    serializer: StorageSerializers.object,
  });
};
