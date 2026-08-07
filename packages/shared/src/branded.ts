/** Nominal typing helper for domain identifiers that must not be mixed up. */
declare const brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [brand]: B };
