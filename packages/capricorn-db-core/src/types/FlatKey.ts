type Primitive = string | number | boolean | bigint | symbol | null | undefined | Date

export type FlatKey<T> = T extends object
  ? {
      [K in Extract<keyof T, string>]:
        NonNullable<T[K]> extends Primitive | readonly unknown[]
          ? K
          : NonNullable<T[K]> extends object
            ? `${K}.${FlatKey<NonNullable<T[K]>>}`
            : K
    }[Extract<keyof T, string>]
  : never