import { z } from 'zod';

export const errorCodeSchema = z.enum([
  'settingsRead',
  'settingsInvalid',
  'unreachable',
  'forbidden',
  'unsupported',
  'upstream',
  'invalidData',
  'periodMismatch',
  'method',
  'periodInvalid',
  'limitExceeded',
  'unknownError',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export const errorResponseSchema = z.object({ code: errorCodeSchema });
export class DataError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status = 502,
  ) {
    super(code);
  }
}
