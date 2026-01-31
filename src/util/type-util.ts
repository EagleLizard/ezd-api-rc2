
export type MapVal<T> = T extends Map<unknown, infer I> ? I : never;
