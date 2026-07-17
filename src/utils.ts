export type Primitive = boolean | string | number;
export type RefKey<T> = T extends Record<infer K, Primitive> ? K : never;
export type RefVal<T> = T extends Record<any, infer V> ? V : never;
export type Ref<T> = Record<RefKey<T>, RefVal<T>>;