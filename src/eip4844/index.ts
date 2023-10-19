/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
import { Input, RLP } from "@ethereumjs/rlp";

import { ecrecover, txUtils, BaseTransaction } from "web3-eth-accounts";
import type { AccessList, JsonTx, TxOptions, Common } from "web3-eth-accounts";
import { keccak256 } from "ethereum-cryptography/keccak.js";

import { toBigInt, toHex } from "web3-utils";
import {
  BIGINT_0,
  BIGINT_1,
  BIGINT_27,
  LIMIT_BLOBS_PER_TX,
  MAX_INTEGER,
  SECP256K1_ORDER_DIV_2,
} from "./const";
import {
  AccessListBytes,
  BlobEIP4844NetworkValuesArray,
  BlobEIP4844TxData,
  TxValuesArray,
} from "./types";
import {
  bigIntToUnpaddedBytes,
  blobsToCommitments,
  blobsToProofs,
  commitmentsToVersionedHashes,
  equalsBytes,
  getBlobs,
  toBytes,
  concatBytes,
  TransactionType,
  txTypeBytes,
  validateBlobTransactionNetworkWrapper,
  validateNoLeadingZeroes,
  bytesToBigInt,
} from "./utils";

const {
  getDataFeeEIP2930,
  verifyAccessList,
  getAccessListData,
  getAccessListJSON,
} = txUtils;

/**
 * Typed transaction with a new gas fee market mechanism for transactions that include "blobs" of data
 *
 * - TransactionType: 3
 * - EIP: [EIP-4844](https://eips.ethereum.org/EIPS/eip-4844)
 */
export class BlobEIP4844Transaction extends BaseTransaction<TransactionType.BlobEIP4844> {
  public readonly chainId: bigint;
  public readonly accessList: AccessListBytes;
  public readonly AccessListJSON: AccessList;
  public readonly maxPriorityFeePerGas: bigint;
  public readonly maxFeePerGas: bigint;
  public readonly maxFeePerBlobGas: bigint;

  public readonly common: Common;
  public blobVersionedHashes: Uint8Array[];
  blobs?: Uint8Array[]; // This property should only be populated when the transaction is in the "Network Wrapper" format
  kzgCommitments?: Uint8Array[]; // This property should only be populated when the transaction is in the "Network Wrapper" format
  kzgProofs?: Uint8Array[]; // This property should only be populated when the transaction is in the "Network Wrapper" format

  /**
   * This constructor takes the values, validates them, assigns them and freezes the object.
   *
   * It is not recommended to use this constructor directly. Instead use
   * the static constructors or factory methods to assist in creating a Transaction object from
   * varying data types.
   */
  constructor(txData: BlobEIP4844TxData, opts: TxOptions = {}) {
    super({ ...txData, type: TransactionType.BlobEIP4844 }, opts);
    const {
      chainId,
      accessList,
      maxFeePerGas,
      maxPriorityFeePerGas,
      maxFeePerBlobGas,
    } = txData;

    // @ts-ignore
    this.common = this._getCommon(opts.common, chainId);
    this.chainId = this.common.chainId();

    // if (this.common.isActivatedEIP(1559) === false) {
    //   throw new Error("EIP-1559 not enabled on Common");
    // }
    //
    // if (this.common.isActivatedEIP(4844) === false) {
    //   throw new Error("EIP-4844 not enabled on Common");
    // }
    // this.activeCapabilities = this.activeCapabilities.concat([
    //   1559, 2718, 2930,
    // ]);

    // Populate the access list fields
    const accessListData = getAccessListData(accessList ?? []);
    this.accessList = accessListData.accessList;
    this.AccessListJSON = accessListData.AccessListJSON;
    // Verify the access list format.
    verifyAccessList(this.accessList);

    this.maxFeePerGas = bytesToBigInt(
      toBytes(maxFeePerGas === "" ? "0x" : maxFeePerGas)
    );
    this.maxPriorityFeePerGas = bytesToBigInt(
      toBytes(maxPriorityFeePerGas === "" ? "0x" : maxPriorityFeePerGas)
    );

    this._validateCannotExceedMaxInteger({
      maxFeePerGas: this.maxFeePerGas,
      maxPriorityFeePerGas: this.maxPriorityFeePerGas,
    });

    BaseTransaction._validateNotArray(txData);

    if (this.gasLimit * this.maxFeePerGas > MAX_INTEGER) {
      const msg = this._errorMsg(
        "gasLimit * maxFeePerGas cannot exceed MAX_INTEGER (2^256-1)"
      );
      throw new Error(msg);
    }

    if (this.maxFeePerGas < this.maxPriorityFeePerGas) {
      const msg = this._errorMsg(
        "maxFeePerGas cannot be less than maxPriorityFeePerGas (The total must be the larger of the two)"
      );
      throw new Error(msg);
    }

    this.maxFeePerBlobGas = bytesToBigInt(
      toBytes((maxFeePerBlobGas ?? "") === "" ? "0x" : maxFeePerBlobGas)
    );

    this.blobVersionedHashes = (txData.blobVersionedHashes ?? []).map((vh) =>
      toBytes(vh)
    );
    this.validateYParity();
    this.validateHighS();

    // for (const hash of this.blobVersionedHashes) {
    //   if (hash.length !== 32) {
    //     const msg = this._errorMsg("versioned hash is invalid length");
    //     throw new Error(msg);
    //   }
    //   if (
    //     BigInt(hash[0]) !==
    //     this.common.param("sharding", "blobCommitmentVersionKzg")
    //   ) {
    //     const msg = this._errorMsg(
    //       "versioned hash does not start with KZG commitment version"
    //     );
    //     throw new Error(msg);
    //   }
    // }
    if (this.blobVersionedHashes.length > LIMIT_BLOBS_PER_TX) {
      const msg = this._errorMsg(
        `tx can contain at most ${LIMIT_BLOBS_PER_TX} blobs`
      );
      throw new Error(msg);
    }

    this.blobs = txData.blobs?.map((blob) => toBytes(blob));
    this.kzgCommitments = txData.kzgCommitments?.map((commitment) =>
      toBytes(commitment)
    );
    this.kzgProofs = txData.kzgProofs?.map((proof) => toBytes(proof));
    const freeze = opts?.freeze ?? true;
    if (freeze) {
      Object.freeze(this);
    }
  }

  validateHighS(): void {
    const { s } = this;
    if (
      this.common.gteHardfork("homestead") &&
      s !== undefined &&
      s > SECP256K1_ORDER_DIV_2
    ) {
      const msg = this._errorMsg(
        "Invalid Signature: s-values greater than secp256k1n/2 are considered invalid"
      );
      throw new Error(msg);
    }
  }

  validateYParity(): void {
    const { v } = this;
    if (v !== undefined && v !== BIGINT_0 && v !== BIGINT_1) {
      const msg = this._errorMsg(
        "The y-parity of the transaction should either be 0 or 1"
      );
      throw new Error(msg);
    }
  }

  public static fromTxData(
    txData: BlobEIP4844TxData,
    opts?: TxOptions
  ): BlobEIP4844Transaction {
    if (txData.blobsData !== undefined) {
      if (txData.blobs !== undefined) {
        throw new Error(
          "cannot have both raw blobs data and encoded blobs in constructor"
        );
      }
      if (txData.kzgCommitments !== undefined) {
        throw new Error(
          "cannot have both raw blobs data and KZG commitments in constructor"
        );
      }
      if (txData.blobVersionedHashes !== undefined) {
        throw new Error(
          "cannot have both raw blobs data and versioned hashes in constructor"
        );
      }
      if (txData.kzgProofs !== undefined) {
        throw new Error(
          "cannot have both raw blobs data and KZG proofs in constructor"
        );
      }
      txData.blobs = getBlobs(txData.blobsData.reduce((acc, cur) => acc + cur));
      txData.kzgCommitments = blobsToCommitments(txData.blobs as Uint8Array[]);
      txData.blobVersionedHashes = commitmentsToVersionedHashes(
        txData.kzgCommitments as Uint8Array[]
      );
      txData.kzgProofs = blobsToProofs(
        txData.blobs as Uint8Array[],
        txData.kzgCommitments as Uint8Array[]
      );
    }

    return new BlobEIP4844Transaction(txData, opts);
  }

  /**
   * Creates the minimal representation of a blob transaction from the network wrapper version.
   * The minimal representation is used when adding transactions to an execution payload/block
   * @param txData a {@link BlobEIP4844Transaction} containing optional blobs/kzg commitments
   * @param opts - dictionary of {@link TxOptions}
   * @returns the "minimal" representation of a BlobEIP4844Transaction (i.e. transaction object minus blobs and kzg commitments)
   */
  public static minimalFromNetworkWrapper(
    txData: BlobEIP4844Transaction,
    opts?: TxOptions
  ): BlobEIP4844Transaction {
    const tx = BlobEIP4844Transaction.fromTxData(
      {
        ...txData,
        ...{
          blobs: undefined,
          kzgCommitments: undefined,
          kzgProofs: undefined,
        },
      },
      opts
    );
    return tx;
  }

  /**
   * Instantiate a transaction from the serialized tx.
   *
   * Format: `0x03 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, to, value, data,
   * access_list, max_fee_per_data_gas, blob_versioned_hashes, y_parity, r, s])`
   */
  public static fromSerializedTx(
    serialized: Uint8Array,
    opts: TxOptions = {}
  ): BlobEIP4844Transaction {
    if (
      !equalsBytes(
        serialized.subarray(0, 1),
        txTypeBytes(TransactionType.BlobEIP4844)
      )
    ) {
      throw new Error(
        `Invalid serialized tx input: not an EIP-4844 transaction (wrong tx type, expected: ${
          TransactionType.BlobEIP4844
        }, received: ${toHex(serialized.subarray(0, 1))}`
      );
    }

    const values = RLP.decode(serialized.subarray(1));

    if (!Array.isArray(values)) {
      throw new Error("Invalid serialized tx input: must be array");
    }

    return BlobEIP4844Transaction.fromValuesArray(
      values as unknown as TxValuesArray,
      opts
    );
  }

  /**
   * Create a transaction from a values array.
   *
   * Format: `[chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
   * accessList, signatureYParity, signatureR, signatureS]`
   */
  public static fromValuesArray(
    values: TxValuesArray,
    opts: TxOptions = {}
  ): BlobEIP4844Transaction {
    if (values.length !== 11 && values.length !== 14) {
      throw new Error(
        "Invalid EIP-4844 transaction. Only expecting 11 values (for unsigned tx) or 14 values (for signed tx)."
      );
    }

    const [
      chainId,
      nonce,
      maxPriorityFeePerGas,
      maxFeePerGas,
      gasLimit,
      to,
      value,
      data,
      accessList,
      maxFeePerBlobGas,
      blobVersionedHashes,
      v,
      r,
      s,
    ] = values;

    this._validateNotArray({ chainId, v });
    validateNoLeadingZeroes({
      // @ts-expect-error
      nonce,
      // @ts-expect-error
      maxPriorityFeePerGas,
      // @ts-expect-error
      maxFeePerGas,
      // @ts-expect-error
      gasLimit,
      // @ts-expect-error
      value,
      // @ts-expect-error
      maxFeePerBlobGas,
      // @ts-expect-error
      v,
      // @ts-expect-error
      r,
      // @ts-expect-error
      s,
    });

    return new BlobEIP4844Transaction(
      {
        chainId: toBigInt(chainId),
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit,
        // @ts-expect-error
        to,
        value,
        data,
        // @ts-expect-error
        accessList: accessList ?? [],
        maxFeePerBlobGas,
        // @ts-expect-error
        blobVersionedHashes,
        v: v !== undefined ? toBigInt(v) : undefined, // EIP2930 supports v's with value 0 (empty Uint8Array)
        r,
        s,
      },
      opts
    );
  }

  /**
   * Creates a transaction from the network encoding of a blob transaction (with blobs/commitments/proof)
   * @param serialized a buffer representing a serialized BlobTransactionNetworkWrapper
   * @param opts any TxOptions defined
   * @returns a BlobEIP4844Transaction
   */

  public static fromSerializedBlobTxNetworkWrapper(
    serialized: Uint8Array,
    opts?: TxOptions
  ): BlobEIP4844Transaction {
    if (!opts || !opts.common) {
      throw new Error("common instance required to validate versioned hashes");
    }

    if (
      !equalsBytes(
        serialized.subarray(0, 1),
        txTypeBytes(TransactionType.BlobEIP4844)
      )
    ) {
      throw new Error(
        `Invalid serialized tx input: not an EIP-4844 transaction (wrong tx type, expected: ${
          TransactionType.BlobEIP4844
        }, received: ${toHex(serialized.subarray(0, 1))}`
      );
    }

    // Validate network wrapper
    const networkTxValues = RLP.decode(serialized.subarray(1));
    if (networkTxValues.length !== 4) {
      throw Error(`Expected 4 values in the deserialized network transaction`);
    }
    const [txValues, blobs, kzgCommitments, kzgProofs] =
      networkTxValues as BlobEIP4844NetworkValuesArray;

    // Construct the tx but don't freeze yet, we will assign blobs etc once validated
    const decodedTx = BlobEIP4844Transaction.fromValuesArray(
      txValues as unknown as Uint8Array,
      {
        ...opts,
        freeze: false,
      }
    );
    if (decodedTx.to === undefined) {
      throw Error(
        "BlobEIP4844Transaction can not be send without a valid `to`"
      );
    }

    const version = Number(
      opts.common.param("sharding", "blobCommitmentVersionKzg")
    );
    validateBlobTransactionNetworkWrapper(
      decodedTx.blobVersionedHashes,
      blobs,
      kzgCommitments,
      kzgProofs,
      version
    );

    // set the network blob data on the tx
    decodedTx.blobs = blobs;
    decodedTx.kzgCommitments = kzgCommitments;
    decodedTx.kzgProofs = kzgProofs;

    // freeze the tx
    const freeze = opts?.freeze ?? true;
    if (freeze) {
      Object.freeze(decodedTx);
    }

    return decodedTx;
  }

  /**
   * The amount of gas paid for the data in this tx
   */
  getDataFee(): bigint {
    const extraCost = BigInt(getDataFeeEIP2930(this.accessList, this.common));
    if (
      this.cache.dataFee &&
      this.cache.dataFee.hardfork === this.common.hardfork()
    ) {
      return this.cache.dataFee.value;
    }

    const cost =
      BaseTransaction.prototype.getDataFee.bind(this)() +
      (extraCost ?? BIGINT_0);

    if (Object.isFrozen(this)) {
      this.cache.dataFee = {
        value: cost,
        hardfork: this.common.hardfork(),
      };
    }

    return cost;
  }

  /**
   * The up front amount that an account must have for this transaction to be valid
   * @param baseFee The base fee of the block (will be set to 0 if not provided)
   */
  getUpfrontCost(baseFee: bigint = BIGINT_0): bigint {
    const prio = this.maxPriorityFeePerGas;
    const maxBase = this.maxFeePerGas - baseFee;
    const inclusionFeePerGas = prio < maxBase ? prio : maxBase;
    const gasPrice = inclusionFeePerGas + baseFee;
    return this.gasLimit * gasPrice + this.value;
  }

  /**
   * Returns a Uint8Array Array of the raw Bytes of the EIP-4844 transaction, in order.
   *
   * Format: [chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, to, value, data,
   * access_list, max_fee_per_data_gas, blob_versioned_hashes, y_parity, r, s]`.
   *
   * Use {@link BlobEIP4844Transaction.serialize} to add a transaction to a block
   * with {@link Block.fromValuesArray}.
   *
   * For an unsigned tx this method uses the empty Bytes values for the
   * signature parameters `v`, `r` and `s` for encoding. For an EIP-155 compliant
   * representation for external signing use {@link BlobEIP4844Transaction.getMessageToSign}.
   */
  // @ts-expect-error
  raw(): TxValuesArray {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return [
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.chainId),
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.nonce),
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.maxPriorityFeePerGas),
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.maxFeePerGas),
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.gasLimit),
      // @ts-expect-error
      this.to !== undefined ? this.to.bytes : new Uint8Array(0),
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.value),
      // @ts-expect-error
      this.data,
      // @ts-expect-error
      this.accessList,
      // @ts-expect-error
      bigIntToUnpaddedBytes(this.maxFeePerBlobGas),
      // @ts-expect-error
      this.blobVersionedHashes,
      // @ts-expect-error
      this.v !== undefined ? bigIntToUnpaddedBytes(this.v) : new Uint8Array(0),
      // @ts-expect-error
      this.r !== undefined ? bigIntToUnpaddedBytes(this.r) : new Uint8Array(0),
      // @ts-expect-error
      this.s !== undefined ? bigIntToUnpaddedBytes(this.s) : new Uint8Array(0),
    ];
  }

  /**
   * Returns the serialized encoding of the EIP-4844 transaction.
   *
   * Format: `0x03 || rlp([chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data,
   * access_list, max_fee_per_data_gas, blob_versioned_hashes, y_parity, r, s])`.
   *
   * Note that in contrast to the legacy tx serialization format this is not
   * valid RLP any more due to the raw tx type preceding and concatenated to
   * the RLP encoding of the values.
   */
  serialize(): Uint8Array {
    return this._serialize();
  }

  private _serialize(base?: Input): Uint8Array {
    return concatBytes(txTypeBytes(this.type), RLP.encode(base ?? this.raw()));
  }

  /**
   * @returns the serialized form of a blob transaction in the network wrapper format (used for gossipping mempool transactions over devp2p)
   */
  serializeNetworkWrapper(): Uint8Array {
    if (
      this.blobs === undefined ||
      this.kzgCommitments === undefined ||
      this.kzgProofs === undefined
    ) {
      throw new Error(
        "cannot serialize network wrapper without blobs, KZG commitments and KZG proofs provided"
      );
    }
    return this._serialize([
      this.raw(),
      this.blobs,
      this.kzgCommitments,
      this.kzgProofs,
    ]);
  }

  /**
   * Returns the raw serialized unsigned tx, which can be used
   * to sign the transaction (e.g. for sending to a hardware wallet).
   *
   * Note: in contrast to the legacy tx the raw message format is already
   * serialized and doesn't need to be RLP encoded any more.
   *
   * ```javascript
   * const serializedMessage = tx.getMessageToSign() // use this for the HW wallet input
   * ```
   */
  getMessageToSign(): Uint8Array {
    return this._serialize(this.raw().slice(0, 11));
  }

  /**
   * Returns the hashed serialized unsigned tx, which can be used
   * to sign the transaction (e.g. for sending to a hardware wallet).
   *
   * Note: in contrast to the legacy tx the raw message format is already
   * serialized and doesn't need to be RLP encoded any more.
   */
  getHashedMessageToSign(): Uint8Array {
    return keccak256(Buffer.from(this.getMessageToSign()));
  }

  /**
   * Computes a sha3-256 hash of the serialized tx.
   *
   * This method can only be used for signed txs (it throws otherwise).
   * Use {@link BlobEIP4844Transaction.getMessageToSign} to get a tx hash for the purpose of signing.
   */
  public hash(): Uint8Array {
    if (!this.isSigned()) {
      const msg = this._errorMsg(
        "Cannot call hash method if transaction is not signed"
      );
      throw new Error(msg);
    }

    if (Object.isFrozen(this)) {
      if (!this.cache.hash) {
        this.cache.hash = keccak256(Buffer.from(this.serialize()));
      }
      return this.cache.hash;
    }

    return keccak256(Buffer.from(this.serialize()));
  }

  getMessageToVerifySignature(): Uint8Array {
    return this.getHashedMessageToSign();
  }

  /**
   * Returns the public key of the sender
   */
  public getSenderPublicKey(): Uint8Array {
    // @ts-expect-error
    if (this.cache.senderPubKey !== undefined) {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return this.cache.senderPubKey;
    }

    const msgHash = this.getMessageToVerifySignature();

    const { v, r, s } = this;

    this.validateHighS();

    try {
      const sender = ecrecover(
        msgHash,
        v!,
        bigIntToUnpaddedBytes(r!),
        bigIntToUnpaddedBytes(s!),
        this.supports(1559) ? this.common.chainId() : undefined
      );
      if (Object.isFrozen(this)) {
        // @ts-expect-error
        this.cache.senderPubKey = sender;
      }
      return sender;
    } catch (e: any) {
      const msg = this._errorMsg("Invalid Signature");
      throw new Error(msg);
    }
  }

  toJSON(): JsonTx {
    const accessListJSON = getAccessListJSON(this.accessList);
    return {
      type: toHex(BigInt(this.type)),
      nonce: toHex(this.nonce),
      gasLimit: toHex(this.gasLimit),
      to: this.to !== undefined ? this.to.toString() : undefined,
      value: toHex(this.value),
      data: toHex(this.data),
      v: this.v !== undefined ? toHex(this.v) : undefined,
      r: this.r !== undefined ? toHex(this.r) : undefined,
      s: this.s !== undefined ? toHex(this.s) : undefined,
      chainId: toHex(this.chainId),
      maxPriorityFeePerGas: toHex(this.maxPriorityFeePerGas),
      maxFeePerGas: toHex(this.maxFeePerGas),
      accessList: accessListJSON,
      maxFeePerDataGas: toHex(this.maxFeePerBlobGas),
      versionedHashes: this.blobVersionedHashes.map((hash) => toHex(hash)),
    };
  }

  // @ts-expect-error
  protected _processSignature(
    v: bigint,
    r: Uint8Array,
    s: Uint8Array
  ): BlobEIP4844Transaction {
    const opts = { ...this.txOptions, common: this.common };

    return BlobEIP4844Transaction.fromTxData(
      {
        chainId: this.chainId,
        nonce: this.nonce,
        maxPriorityFeePerGas: this.maxPriorityFeePerGas,
        maxFeePerGas: this.maxFeePerGas,
        gasLimit: this.gasLimit,
        to: this.to,
        value: this.value,
        data: this.data,
        accessList: this.accessList,
        v: v - BIGINT_27, // This looks extremely hacky: @ethereumjs/util actually adds 27 to the value, the recovery bit is either 0 or 1.
        r: toBigInt(r),
        s: toBigInt(s),
        maxFeePerBlobGas: this.maxFeePerBlobGas,
        blobVersionedHashes: this.blobVersionedHashes,
        blobs: this.blobs,
        kzgCommitments: this.kzgCommitments,
        kzgProofs: this.kzgProofs,
      },
      opts
    );
  }

  /**
   * Return a compact error string representation of the object
   */
  public errorStr(): string {
    let errorStr = this._getSharedErrorPostfix();
    errorStr += ` maxFeePerGas=${this.maxFeePerGas} maxPriorityFeePerGas=${this.maxPriorityFeePerGas}`;
    return errorStr;
  }

  /**
   * Internal helper function to create an annotated error message
   *
   * @param msg Base error message
   * @hidden
   */
  protected _errorMsg(msg: string): string {
    return `${msg} (${this.errorStr()})`;
  }

  /**
   * @returns the number of blobs included with this transaction
   */
  public numBlobs(): number {
    return this.blobVersionedHashes.length;
  }
}
