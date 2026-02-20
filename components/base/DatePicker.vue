<script setup lang="ts">
import { DatePicker as VCalendarDatePicker } from 'v-calendar';
import 'v-calendar/dist/style.css';
import dayjs from 'dayjs';
import { MP_ORIGIN_TIMESTAMP } from '~/config';

defineOptions({
  inheritAttrs: false,
});

const props = defineProps({
  modelValue: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['update:model-value', 'close']);

const date = computed({
  get: () => dayjs.unix(props.modelValue).toDate(),
  set: value => {
    emit('update:model-value', dayjs(value).unix());
    emit('close');
  },
});

const attrs = {
  transparent: true,
  borderless: true,
  locale: 'zh-CN',
  color: 'gray',
  'is-dark': { selector: 'html', darkClass: 'dark' },
  'first-day-of-week': 2,
  'min-date': dayjs.unix(MP_ORIGIN_TIMESTAMP).toDate(),
  'max-date': new Date(),
};

function onDayClick(_: any, event: MouseEvent): void {
  const target = event.target as HTMLElement;
  target.blur();
}
</script>

<template>
  <VCalendarDatePicker v-model="date" v-bind="{ ...attrs, ...$attrs }" @dayclick="onDayClick" />
</template>
