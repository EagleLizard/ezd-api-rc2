
import crypto from 'node:crypto';

type HasherOpts = {
  alg?: string;
} & {};
export type Hasher = {
  alg: string;
  update: (data: string | Buffer | NodeJS.TypedArray | DataView) => void;
  digest: () => string;
} & {};
type HasherData = (string | Buffer | NodeJS.TypedArray | DataView) & {};

const default_hash_alg = 'sha1';
export const hashUtil = {
  getHasher: getHasher,
} as const;

function getHasher(opts?: HasherOpts): Hasher  {
  let alg = opts?.alg ?? default_hash_alg;
  let hash = crypto.createHash(alg);
  return {
    alg,
    update: (data: HasherData) => hash.update(data),
    digest: () => hash.digest().toString('hex'),
  };
}
