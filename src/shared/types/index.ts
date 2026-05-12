// Brand a primitive type so two ids of different kinds aren't structurally compatible.
// Example: type UserId = Branded<string, 'UserId'>;
export type Branded<T, Brand extends string> = T & { readonly __brand: Brand };

export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

export type Nullable<T> = T | null;
