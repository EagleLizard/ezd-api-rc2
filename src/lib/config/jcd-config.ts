
import path from 'node:path';

import { BASE_DIR } from '../constants';

const jcd_tmp_dir = '_jcd_tmp';
const jcd_tmp_img_dir = [
  BASE_DIR,
  jcd_tmp_dir,
  'img-v4'
].join(path.sep);

const valid_v4_img_mime_types = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const jcdCfg = {
  img_v3: {
    bucket: 'jcd-image-v3',
  },
  img_v4: {
    bucket: 'jcd-image-v4',
    src_dir: '_src',
    img_folder: 'jcd-img-v4-2',
    tmp_dir: jcd_tmp_img_dir,
    valid_mime_types: valid_v4_img_mime_types,
  },
} as const;
