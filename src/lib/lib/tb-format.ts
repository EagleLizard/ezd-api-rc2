
import Format from 'typebox/format';

export const tbFormat = {
  isPgDateTime: isPgDateTime,
} as const;

/*
  Based on Typebox provided format, modified for postgres.
  see: https://github.com/sinclairzx81/typebox/blob/97f80db07eb2607480b3f84bcbbf21b56a6cce71/src/format/date-time.ts
_*/
function isPgDateTime(value: string, strictTimeZone: boolean = false) {
  const dateTime: string[] = value.split(/ /i);
  return (
    dateTime.length === 2
    && Format.IsDate(dateTime[0])
    && Format.IsTime(dateTime[1], strictTimeZone)
  );
}
