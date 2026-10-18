
import crypto from 'node:crypto';
import stream from 'node:stream';
import { prim } from '../../util/validate-primitives';

type HasherOpts = {
  alg?: string;
} & {};
export type Hasher = {
  alg: string;
  update: (data: string | Buffer | NodeJS.TypedArray | DataView) => void;
  digest: {
    (enc: crypto.BinaryToTextEncoding): string;
    (): Buffer<ArrayBuffer>;
  };
} & {};
type HasherData = (string | Buffer | NodeJS.TypedArray | DataView) & {};

const default_hash_alg = 'sha1';
export const hashUtil = {
  getHasher: getHasher,
  getTransform: getHashTransform,
} as const;

function getHasher(opts?: HasherOpts): Hasher  {
  let alg = opts?.alg ?? default_hash_alg;
  let hash = crypto.createHash(alg);
  return {
    alg,
    update: (data: HasherData) => hash.update(data),
    digest: _hasherDigest,
  };
  function _hasherDigest(): Buffer<ArrayBuffer>
  function _hasherDigest(enc: crypto.BinaryToTextEncoding): string
  function _hasherDigest(enc?: crypto.BinaryToTextEncoding): Buffer<ArrayBuffer> | string {
    return prim.isString(enc) ? hash.digest(enc) : hash.digest();
  }
}

function getHashTransform() {
  let hashTransform = new HashTransform();
  return hashTransform;
}

export class HashTransform extends stream.Transform {
  hasher: Hasher;
  constructor(opts?: stream.TransformOptions) {
    super(opts);
    this.hasher = hashUtil.getHasher();
  }
  digest(): Buffer<ArrayBuffer>
  digest(enc: crypto.BinaryToTextEncoding): string
  digest(enc?: crypto.BinaryToTextEncoding): Buffer<ArrayBuffer> | string {
    return prim.isString(enc)
      ? this.hasher.digest(enc)
      : this.hasher.digest()
    ;
  }
  override _transform(
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    chunk: any,
    encoding: BufferEncoding,
    cb: stream.TransformCallback
  ): void {
    this.hasher.update(chunk);
    this.push(chunk);
    cb();
  }
}
