import type {
  TxValuesArray as AllTypesTxValuesArray,
  FeeMarketEIP1559TxData,
} from "web3-eth-accounts";
import { TransactionType } from "./utils";

export type ToBytesInputTypes = string | number | bigint;

type AccessListBytesItem = [Uint8Array, Uint8Array[]];
export type AccessListBytes = AccessListBytesItem[];
/**
 * Bytes values array for a {@link BlobEIP4844Transaction}
 */
export type BlobEIP4844TxValuesArray = [
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  Uint8Array,
  AccessListBytes,
  Uint8Array,
  Uint8Array[],
  Uint8Array?,
  Uint8Array?,
  Uint8Array?
];
export type BlobEIP4844NetworkValuesArray = [
  BlobEIP4844TxValuesArray,
  Uint8Array[],
  Uint8Array[],
  Uint8Array[]
];
/**
 * @param kzgLib a KZG implementation (defaults to c-kzg)
 * @param trustedSetupPath the full path (e.g. "/home/linux/devnet4.txt") to a kzg trusted setup text file
 */
// function initKZG(kzgLib: Kzg, trustedSetupPath: string) {
// 	kzg = kzgLib;
// 	kzg.loadTrustedSetup(trustedSetupPath);
// }
export type TxValuesArray = AllTypesTxValuesArray[TransactionType.BlobEIP4844];

export interface TransformabletoBytes {
  toBytes?(): Uint8Array;
}

export type BigIntLike = bigint | string | number | Uint8Array;
export type BytesLike =
  | Uint8Array
  | number[]
  | number
  | bigint
  | TransformabletoBytes
  | string;

export interface BlobEIP4844TxData extends FeeMarketEIP1559TxData {
  /**
   * The versioned hashes used to validate the blobs attached to a transaction
   */
  blobVersionedHashes?: BytesLike[];
  /**
   * The maximum fee per blob gas paid for the transaction
   */
  maxFeePerBlobGas?: BigIntLike;
  /**
   * The blobs associated with a transaction
   */
  blobs?: BytesLike[];
  /**
   * The KZG commitments corresponding to the versioned hashes for each blob
   */
  kzgCommitments?: BytesLike[];
  /**
   * The KZG proofs associated with the transaction
   */
  kzgProofs?: BytesLike[];
  /**
   * An array of arbitrary strings that blobs are to be constructed from
   */
  blobsData?: string[];
}

export interface ChainName {
  [chainId: string]: string;
}
export interface ChainsConfig {
  [key: string]: ChainConfig | ChainName;
}

export type CliqueConfig = {
  period: number;
  epoch: number;
};

export type EthashConfig = {};

export type CasperConfig = {};

type ConsensusConfig = {
  type: ConsensusType | string;
  algorithm: ConsensusAlgorithm | string;
  clique?: CliqueConfig;
  ethash?: EthashConfig;
  casper?: CasperConfig;
};

export interface ChainConfig {
  name: string;
  chainId: number | bigint;
  networkId: number | bigint;
  defaultHardfork?: string;
  comment?: string;
  url?: string;
  genesis: GenesisBlockConfig;
  hardforks: HardforkTransitionConfig[];
  bootstrapNodes: BootstrapNodeConfig[];
  dnsNetworks?: string[];
  consensus: ConsensusConfig;
}

export interface GenesisBlockConfig {
  timestamp?: string;
  gasLimit: number | string;
  difficulty: number | string;
  nonce: string;
  extraData: string;
  baseFeePerGas?: string;
  excessBlobGas?: string;
}

export interface HardforkTransitionConfig {
  name: Hardfork | string;
  block: number | null; // null is used for hardforks that should not be applied -- since `undefined` isn't a valid value in JSON
  ttd?: bigint | string;
  timestamp?: number | string;
  forkHash?: string | null;
}

export interface BootstrapNodeConfig {
  ip: string;
  port: number | string;
  network?: string;
  chainId?: number;
  id: string;
  location: string;
  comment: string;
}

interface BaseOpts {
  /**
   * String identifier ('byzantium') for hardfork or {@link Hardfork} enum.
   *
   * Default: Hardfork.London
   */
  hardfork?: string | Hardfork;
  /**
   * Selected EIPs which can be activated, please use an array for instantiation
   * (e.g. `eips: [ 1559, 3860 ]`)
   */
  eips?: number[];
}

/**
 * Options for instantiating a {@link Common} instance.
 */
export interface CommonOpts extends BaseOpts {
  /**
   * Chain name ('mainnet'), id (1), or {@link Chain} enum,
   * either from a chain directly supported or a custom chain
   * passed in via {@link CommonOpts.customChains}.
   */
  chain: string | number | Chain | bigint | object;
  /**
   * Initialize (in addition to the supported chains) with the selected
   * custom chains. Custom genesis state should be passed to the Blockchain class if used.
   *
   * Usage (directly with the respective chain initialization via the {@link CommonOpts.chain} option):
   *
   * ```javascript
   * import myCustomChain1 from '[PATH_TO_MY_CHAINS]/myCustomChain1.json'
   * const common = new Common({ chain: 'myCustomChain1', customChains: [ myCustomChain1 ]})
   * ```
   */
  customChains?: ChainConfig[];
}

/**
 * Options to be used with the {@link Common.custom} static constructor.
 */
export interface CustomCommonOpts extends BaseOpts {
  /**
   * The name (`mainnet`), id (`1`), or {@link Chain} enum of
   * a standard chain used to base the custom chain params on.
   */
  baseChain?: string | number | Chain | bigint;
}

export interface GethConfigOpts extends BaseOpts {
  chain?: string;
  genesisHash?: Uint8Array;
  mergeForkIdPostMerge?: boolean;
}

export interface HardforkByOpts {
  blockNumber?: BigIntLike;
  timestamp?: BigIntLike;
  td?: BigIntLike;
}

type ParamDict = {
  v: number | bigint | null;
  d: string;
};

export type EIPOrHFConfig = {
  comment: string;
  url: string;
  status: string;
  gasConfig?: {
    [key: string]: ParamDict;
  };
  gasPrices?: {
    [key: string]: ParamDict;
  };
  pow?: {
    [key: string]: ParamDict;
  };
  sharding?: {
    [key: string]: ParamDict;
  };
  vm?: {
    [key: string]: ParamDict;
  };
};

export type EIPConfig = {
  minimumHardfork: Hardfork;
  requiredEIPs: number[];
} & EIPOrHFConfig;

export type HardforkConfig = {
  name: string;
  eips?: number[];
  consensus?: ConsensusConfig;
} & EIPOrHFConfig;
