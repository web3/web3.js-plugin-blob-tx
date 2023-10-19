// eslint-disable-next-line import/no-extraneous-dependencies
import { secp256k1 } from "ethereum-cryptography/secp256k1";

export const MAX_INTEGER = BigInt(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
export const SECP256K1_ORDER = secp256k1.CURVE.n;
export const SECP256K1_ORDER_DIV_2 = SECP256K1_ORDER / BigInt(2);
export const BIGINT_27 = BigInt(27);
export const BIGINT_0 = BigInt(0);
export const BIGINT_1 = BigInt(1);
export const LIMIT_BLOBS_PER_TX = 16777216; // 2 ** 24
export const FIELD_ELEMENTS_PER_BLOB = 4096;
export const BYTES_PER_FIELD_ELEMENT = 32;
export const USEFUL_BYTES_PER_BLOB = 32 * FIELD_ELEMENTS_PER_BLOB;
export const MAX_BLOBS_PER_TX = 2;
export const MAX_USEFUL_BYTES_PER_TX =
  USEFUL_BYTES_PER_BLOB * MAX_BLOBS_PER_TX - 1;
export const BLOB_SIZE = BYTES_PER_FIELD_ELEMENT * FIELD_ELEMENTS_PER_BLOB;
export const BIGINT_CACHE: bigint[] = [];
for (let i = 0; i <= 256 * 256 - 1; i++) {
  BIGINT_CACHE[i] = BigInt(i);
}
