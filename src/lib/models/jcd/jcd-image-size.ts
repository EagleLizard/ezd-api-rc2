
import assert from 'node:assert';
import { prim } from '../../../util/validate-primitives';

const image_size_map = {
  xxl: 'xxl',
  xl: 'xl',
  lg: 'lg',
  md: 'md',
  sm: 'sm',
  xs: 'xs',
  xxs: 'xxs',
} as const;
assert(Object.entries(image_size_map).every(pair => pair[0] === pair[1]));
// const image_fmt_sizes = Object.values(image_size_map);
export type JcdImageSize = typeof image_size_map[keyof typeof image_size_map];
export type JcdResizeFmt = {
  // kind: ImgSize,
  prefix: JcdImageSize,
  width: number;
  height?: number;
} & {};
const resize_fmt_map = {
  'xxl': {
    prefix: image_size_map.xxl,
    width: 2560,
  },
  'xl': {
    prefix: image_size_map.xl,
    width: 2100,
  },
  'lg': {
    prefix: image_size_map.lg,
    width: 1600,
  },
  'md': {
    prefix: image_size_map.md,
    width: 1200,
  },
  'sm': {
    prefix: image_size_map.sm,
    width: 800,
  },
  'xs': {
    prefix: image_size_map.xs,
    width: 500,
  },
  'xxs': {
    prefix: image_size_map.xxs,
    width: 250,
  },
} as const satisfies Record<JcdImageSize, JcdResizeFmt>;

export const jcdImageSize = {
  image_size_map: image_size_map,
  resize_fmt_map: resize_fmt_map,
  checkImgSize: checkImgSize,
};

function checkImgSize(val: unknown): val is JcdImageSize {
  return prim.isString(val) && Object.keys(jcdImageSize.image_size_map).includes(val);
}
