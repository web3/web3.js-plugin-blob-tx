import { numberToHex, toHex } from "web3-utils";
import { utf8ToBytes } from "ethereum-cryptography/utils";
import { isHexPrefixed } from "web3-validator";
import { sha256 } from "ethereum-cryptography/sha256";
import { BigIntLike, BytesLike, ToBytesInputTypes } from "./types";
import {
  BIGINT_0,
  BIGINT_CACHE,
  BLOB_SIZE,
  FIELD_ELEMENTS_PER_BLOB,
  MAX_USEFUL_BYTES_PER_TX,
  USEFUL_BYTES_PER_BLOB,
} from "./const";
import { kzg } from "./kzg";

export const stripHexPrefix = (str: string): string =>
  isHexPrefixed(str) ? str.slice(2) : str;

const isHexString = (value: string, length?: number): boolean => {
  if (typeof value !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/))
    return false;

  if (
    typeof length !== "undefined" &&
    length > 0 &&
    value.length !== 2 + 2 * length
  )
    return false;

  return true;
};
const parseHexByte = (hexByte: string): number => {
  const byte = Number.parseInt(hexByte, 16);
  if (Number.isNaN(byte)) throw new Error("Invalid byte sequence");
  return byte;
};
const _unprefixedHexToBytes = (hex: string): Uint8Array => {
  if (typeof hex !== "string") {
    throw new TypeError("hexToBytes: expected string, got " + typeof hex);
  }
  if (hex.length % 2)
    throw new Error("hexToBytes: received invalid unpadded hex");
  const array = new Uint8Array(hex.length / 2);
  for (let i = 0; i < array.length; i++) {
    const j = i * 2;
    array[i] = parseHexByte(hex.slice(j, j + 2));
  }
  return array;
};

const padToEven = (value: string): string => {
  let a = value;

  if (typeof a !== "string") {
    throw new Error(
      `[padToEven] value must be type 'string', received ${typeof a}`
    );
  }

  if (a.length % 2) a = `0${a}`;

  return a;
};
const unprefixedHexToBytes = (inp: string): Uint8Array => {
  if (inp.slice(0, 2) === "0x") {
    throw new Error("hex string is prefixed with 0x, should be unprefixed");
  } else {
    return _unprefixedHexToBytes(padToEven(inp));
  }
};
export const hexToBytes = (hex: string): Uint8Array => {
  console.log("hex", hex);
  if (typeof hex !== "string") {
    throw new Error(`hex argument type ${typeof hex} must be of type string`);
  }

  if (!hex.startsWith("0x")) {
    throw new Error(
      `prefixed hex input should start with 0x, got ${hex.substring(0, 2)}`
    );
  }

  hex = hex.slice(2);

  if (hex.length % 2 !== 0) {
    hex = padToEven(hex);
  }

  const byteLen = hex.length / 2;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    const byte = parseInt(hex.slice(i * 2, (i + 1) * 2), 16);
    bytes[i] = byte;
  }
  return bytes;
};

const intToHex = (i: number): string => {
  if (!Number.isSafeInteger(i) || i < 0) {
    throw new Error(`Received an invalid integer type: ${i}`);
  }
  return `0x${i.toString(16)}`;
};

const intToBytes = (i: number): Uint8Array => {
  const hex = intToHex(i);
  return hexToBytes(hex);
};

const cachedHexes = Array.from({ length: 256 }, (_v, i) =>
  i.toString(16).padStart(2, "0")
);
function bytesToHex(uint8a: Uint8Array): string {
  // Pre-caching chars with `cachedHexes` speeds this up 6x
  let hex = "";
  for (let i = 0; i < uint8a.length; i++) {
    hex += cachedHexes[uint8a[i]];
  }
  return hex;
}

export const bytesToBigInt = (bytes: Uint8Array): bigint => {
  const hex = bytesToHex(bytes);
  if (hex === "0x") {
    return BIGINT_0;
  }
  if (hex.length === 4) {
    // If the byte length is 1 (this is faster than checking `bytes.length === 1`)
    return BIGINT_CACHE[bytes[0]];
  }
  if (hex.length === 6) {
    return BIGINT_CACHE[bytes[0] * 256 + bytes[1]];
  }
  return BigInt(hex);
};
export const ___toBytes = (v: ToBytesInputTypes): Uint8Array => {
  if (v === null || v === undefined) {
    return new Uint8Array();
  }

  // @ts-ignore
  if (Array.isArray(v) || v instanceof Uint8Array) {
    return Uint8Array.from(v);
  }

  if (typeof v === "string") {
    if (!isHexString(v)) {
      throw new Error(
        `Cannot convert string to Uint8Array. toBytes only supports 0x-prefixed hex strings and this string was given: ${v}`
      );
    }
    return hexToBytes(v);
  }

  if (typeof v === "number") {
    return intToBytes(v);
  }

  if (typeof v === "bigint") {
    if (v < BIGINT_0) {
      throw new Error(
        `Cannot convert negative bigint to Uint8Array. Given: ${v}`
      );
    }
    let n = v.toString(16);
    if (n.length % 2) n = "0" + n;
    return unprefixedHexToBytes(n);
  }
  // @ts-ignore
  if (v.toBytes !== undefined) {
    // converts a `TransformableToBytes` object to a Uint8Array
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
    return v.toBytes();
  }

  throw new Error("invalid type");
};

export const validateNoLeadingZeroes = (values: {
  [key: string]: Uint8Array | undefined;
}) => {
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined && v.length > 0 && v[0] === 0) {
      throw new Error(`${k} cannot have leading zeroes, received: ${toHex(v)}`);
    }
  }
};

function get_padded(data: Uint8Array, blobs_len: number): Uint8Array {
  const pdata = new Uint8Array(blobs_len * USEFUL_BYTES_PER_BLOB).fill(0);
  pdata.set(data);
  pdata[data.byteLength] = 0x80;
  return pdata;
}

function get_blob(data: Uint8Array): Uint8Array {
  const blob = new Uint8Array(BLOB_SIZE);
  for (let i = 0; i < FIELD_ELEMENTS_PER_BLOB; i++) {
    const chunk = new Uint8Array(32);
    chunk.set(data.subarray(i * 31, (i + 1) * 31), 0);
    blob.set(chunk, i * 32);
  }

  return blob;
}

export const getBlobs = (input: string): Uint8Array[] => {
  const data = utf8ToBytes(input);
  const len = data.byteLength;
  if (len === 0) {
    throw Error("invalid blob data");
  }
  if (len > MAX_USEFUL_BYTES_PER_TX) {
    throw Error("blob data is too large");
  }

  const blobs_len = Math.ceil(len / USEFUL_BYTES_PER_BLOB);

  const pdata = get_padded(data, blobs_len);

  const blobs: Uint8Array[] = [];
  for (let i = 0; i < blobs_len; i++) {
    const chunk = pdata.subarray(
      i * USEFUL_BYTES_PER_BLOB,
      (i + 1) * USEFUL_BYTES_PER_BLOB
    );
    const blob = get_blob(chunk);
    blobs.push(blob);
  }

  return blobs;
};

const assertIsBytes = function (input: Uint8Array): void {
  if (!(input instanceof Uint8Array)) {
    const msg = `This method only supports Uint8Array but input was: ${input}`;
    throw new Error(msg);
  }
};
type PrefixedHexString = string;
const stripZeros = <
  T extends Uint8Array | number[] | PrefixedHexString =
    | Uint8Array
    | number[]
    | PrefixedHexString
>(
  a: T
): T => {
  let first = a[0];
  while (a.length > 0 && first.toString() === "0") {
    a = a.slice(1) as T;
    first = a[0];
  }
  return a;
};
const unpadBytes = (a: Uint8Array): Uint8Array => {
  assertIsBytes(a);
  return stripZeros(a);
};
const bigIntToBytes = (num: bigint): Uint8Array => {
  console.log("padToEven(num.toString(16))", padToEven(num.toString(16)));
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return toBytes(`0x${padToEven(num.toString(16))}`);
};
export const bigIntToUnpaddedBytes = (value: bigint): Uint8Array => {
  console.log("value", value, "res");
  return unpadBytes(bigIntToBytes(value));
};

export function equalsBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}

export const toBytes = (v?: BytesLike | BigIntLike): Uint8Array => {
  if (v instanceof Uint8Array) {
    return v;
  }
  if (typeof v === "string") {
    if (isHexPrefixed(v)) {
      return hexToBytes(padToEven(stripHexPrefix(v)));
    }
    return utf8ToBytes(v);
  }
  if (typeof v === "number" || typeof v === "bigint") {
    if (!v) {
      return Uint8Array.from([]);
    }
    return hexToBytes(numberToHex(v));
  }
  if (v === null || v === undefined) {
    return Uint8Array.from([]);
  }
  throw new Error(`toBytes: received unsupported type ${typeof v}`);
};

export const concatBytes = (...arrays: Uint8Array[]): Uint8Array => {
  if (arrays.length === 1) return arrays[0];
  const length = arrays.reduce((a, arr) => a + arr.length, 0);
  const result = new Uint8Array(length);
  for (let i = 0, pad = 0; i < arrays.length; i++) {
    const arr = arrays[i];
    result.set(arr, pad);
    pad += arr.length;
  }
  return result;
};

export function txTypeBytes(txType: TransactionType): Uint8Array {
  return hexToBytes(`0x${txType.toString(16).padStart(2, "0")}`);
}

const computeVersionedHash = (
  commitment: Uint8Array,
  blobCommitmentVersion: number
) => {
  const computedVersionedHash = new Uint8Array(32);
  computedVersionedHash.set([blobCommitmentVersion], 0);
  computedVersionedHash.set(sha256(Buffer.from(commitment)).subarray(1), 1);
  return computedVersionedHash;
};
export const blobsToCommitments = (blobs: Uint8Array[]) => {
  const commitments: Uint8Array[] = [];
  for (const blob of blobs) {
    commitments.push(kzg.blobToKzgCommitment(blob));
  }
  return commitments;
};
export const commitmentsToVersionedHashes = (commitments: Uint8Array[]) => {
  const hashes: Uint8Array[] = [];
  for (const commitment of commitments) {
    hashes.push(computeVersionedHash(commitment, 0x01));
  }
  return hashes;
};
export const validateBlobTransactionNetworkWrapper = (
  blobVersionedHashes: Uint8Array[],
  blobs: Uint8Array[],
  commitments: Uint8Array[],
  kzgProofs: Uint8Array[],
  version: number
) => {
  if (
    !(
      blobVersionedHashes.length === blobs.length &&
      blobs.length === commitments.length
    )
  ) {
    throw new Error(
      "Number of blobVersionedHashes, blobs, and commitments not all equal"
    );
  }
  if (blobVersionedHashes.length === 0) {
    throw new Error("Invalid transaction with empty blobs");
  }

  let isValid;
  try {
    isValid = kzg.verifyBlobKzgProofBatch(blobs, commitments, kzgProofs);
  } catch (error) {
    throw new Error(`KZG verification of blobs fail with error=${error}`);
  }
  if (!isValid) {
    throw new Error("KZG proof cannot be verified from blobs/commitments");
  }

  for (let x = 0; x < blobVersionedHashes.length; x++) {
    const computedVersionedHash = computeVersionedHash(commitments[x], version);
    if (!equalsBytes(computedVersionedHash, blobVersionedHashes[x])) {
      throw new Error(
        `commitment for blob at index ${x} does not match versionedHash`
      );
    }
  }
};

export const blobsToProofs = (blobs: Uint8Array[], commitments: Uint8Array[]) =>
  blobs.map((blob, ctx) => kzg.computeBlobKzgProof(blob, commitments[ctx]));

export enum TransactionType {
  Legacy = 0,
  AccessListEIP2930 = 1,
  FeeMarketEIP1559 = 2,
  BlobEIP4844 = 3,
}
