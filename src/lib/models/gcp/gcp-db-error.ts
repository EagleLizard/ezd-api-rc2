import { prim } from '../../../util/validate-primitives';

export type GcpDbError = {
  code: number;
  details: string;
  // todo: this is incomplete
} & Error & {};

export const gcpDbError = {
  isGcpDbError,
} as const;

function isGcpDbError(e: unknown): e is GcpDbError {
  return (
    (e instanceof Error)
    && ('code' in e)
    && prim.isNumber(e.code)
    && ('details' in e)
    && prim.isString(e.details)
  );
}
