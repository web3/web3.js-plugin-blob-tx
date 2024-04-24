import { transactionSchema, transactionReceiptSchema } from "web3-eth";

export const transactionSchemaEip4844 = {
  type: "object",
  properties: {
    ...transactionSchema.properties,
    blobVersionedHashes: {
      type: "array",
      items: {
        format: "bytes32",
      },
    },
    /**
     * The maximum fee per blob gas paid for the transaction
     */
    maxFeePerBlobGas: {
      type: "number",
    },
    /**
     * The blobs associated with a transaction
     */
    blobs: {
      type: "array",
      items: {
        format: "bytes",
      },
    },
    /**
     * The KZG commitments corresponding to the versioned hashes for each blob
     */
    kzgCommitments: {
      type: "array",
      items: {
        format: "bytes",
      },
    },
    /**
     * The KZG proofs associated with the transaction
     */
    kzgProofs: {
      type: "array",
      items: {
        format: "bytes",
      },
    },
    /**
     * An array of arbitrary strings that blobs are to be constructed from
     */
    blobsData: {
      type: "array",
      items: {
        format: "string",
      },
    },
  },
};

export const transactionReceiptSchemaEip4844 = {
  ...transactionReceiptSchema,
  blobVersionedHashes: {
    type: "array",
    items: {
      format: "bytes32",
    },
  },
  /**
   * The maximum fee per blob gas paid for the transaction
   */
  maxFeePerBlobGas: {
    type: "number",
  },
  /**
   * The blobs associated with a transaction
   */
  blobs: {
    type: "array",
    items: {
      format: "bytes",
    },
  },
  /**
   * The KZG commitments corresponding to the versioned hashes for each blob
   */
  kzgCommitments: {
    type: "array",
    items: {
      format: "bytes",
    },
  },
  /**
   * The KZG proofs associated with the transaction
   */
  kzgProofs: {
    type: "array",
    items: {
      format: "bytes",
    },
  },
  /**
   * An array of arbitrary strings that blobs are to be constructed from
   */
  blobsData: {
    type: "array",
    items: {
      format: "string",
    },
  },
};
