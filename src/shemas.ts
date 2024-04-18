import { transactionSchema } from "web3-eth";
import type { ChainConfig } from "web3-eth-accounts";

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
  },
};

export const EIP4844 = {
  comment: "Shard Blob Transactions",
  url: "https://eips.ethereum.org/EIPS/eip-4844",
  status: "final",
  minimumHardfork: "paris",
  requiredEIPs: [1559, 2718, 2930, 4895],
  gasConfig: {
    blobGasPerBlob: {
      v: 131072,
      d: "The base fee for blob gas per blob",
    },
    targetBlobGasPerBlock: {
      v: 393216,
      d: "The target blob gas consumed per block",
    },
    maxblobGasPerBlock: {
      v: 786432,
      d: "The max blob gas allowable per block",
    },
    blobGasPriceUpdateFraction: {
      v: 3338477,
      d: "The denominator used in the exponential when calculating a blob gas price",
    },
  },
  gasPrices: {
    simpleGasPerBlob: {
      v: 12000,
      d: "The basic gas fee for each blob",
    },
    minBlobGasPrice: {
      v: 1,
      d: "The minimum fee per blob gas",
    },
    kzgPointEvaluationGasPrecompilePrice: {
      v: 50000,
      d: "The fee associated with the point evaluation precompile",
    },
    blobhash: {
      v: 3,
      d: "Base fee of the BLOBHASH opcode",
    },
  },
  sharding: {
    blobCommitmentVersionKzg: {
      v: 1,
      d: "The number indicated a versioned hash is a KZG commitment",
    },
    fieldElementsPerBlob: {
      v: 4096,
      d: "The number of field elements allowed per blob",
    },
  },
};
export const EIP4895 = {
  comment: "Beacon chain push withdrawals as operations",
  url: "https://eips.ethereum.org/EIPS/eip-4895",
  status: "review",
  minimumHardfork: "paris",
  requiredEIPs: [],
};

export const hardforks: { [key: string]: any } = {
  paris: {
    name: "paris",
    comment: "Hardfork to upgrade the consensus mechanism to Proof-of-Stake",
    url: "https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/merge.md",
    status: "final",
    consensus: {
      type: "pos",
      algorithm: "casper",
      casper: {},
    },
    eips: [3675, 4399],
  },
};
type ChainsDict = {
  [key: string]: ChainConfig;
};
export const CHAINS: ChainsDict = {
  holesky: {
    name: "holesky",
    chainId: 17000,
    networkId: 17000,
    defaultHardfork: "paris",
    consensus: {
      type: "pos",
      algorithm: "casper",
    },
    comment: "PoS test network to replace Goerli",
    url: "https://github.com/eth-clients/holesky/",
    genesis: {
      baseFeePerGas: "0x3B9ACA00",
      difficulty: "0x01",
      extraData: "0x",
      gasLimit: "0x17D7840",
      nonce: "0x0000000000001234",
      timestamp: "0x65156994",
    },
    hardforks: [
      {
        name: "chainstart",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "homestead",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "tangerineWhistle",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "spuriousDragon",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "byzantium",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "constantinople",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "petersburg",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "istanbul",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "muirGlacier",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "berlin",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "london",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "paris",
        ttd: "0",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "mergeForkIdTransition",
        block: 0,
        forkHash: "0xc61a6098",
      },
      {
        name: "shanghai",
        block: null,
        timestamp: "1696000704",
        forkHash: "0xfd4f016b",
      },
      {
        name: "cancun",
        block: null,
        timestamp: "1707305664",
        forkHash: "0x9b192ad0",
      },
    ],
    bootstrapNodes: [
      {
        ip: "146.190.13.128",
        port: 30303,
        id: "ac906289e4b7f12df423d654c5a962b6ebe5b3a74cc9e06292a85221f9a64a6f1cfdd6b714ed6dacef51578f92b34c60ee91e9ede9c7f8fadc4d347326d95e2b",
        location: "",
        comment: "bootnode 1",
      },
      {
        ip: "178.128.136.233",
        port: 30303,
        id: "a3435a0155a3e837c02f5e7f5662a2f1fbc25b48e4dc232016e1c51b544cb5b4510ef633ea3278c0e970fa8ad8141e2d4d0f9f95456c537ff05fdf9b31c15072",
        location: "",
        comment: "bootnode 2",
      },
    ],
    dnsNetworks: [
      "enrtree://AKA3AM6LPBYEUDMVNU3BSVQJ5AD45Y7YPOHJLEF6W26QOE4VTUDPE@all.holesky.ethdisco.net",
    ],
  },
  kaustinen5: {
    name: "kaustinen5",
    chainId: 69420,
    networkId: 69420,
    defaultHardfork: "prague",
    consensus: {
      type: "pos",
      algorithm: "casper",
    },
    comment:
      "Verkle kaustinen testnet 3 (likely temporary, do not hard-wire into production code)",
    url: "https://github.com/eth-clients/kaustinen/",
    genesis: {
      difficulty: "0x01",
      extraData: "0x",
      gasLimit: "0x17D7840",
      nonce: "0x0000000000001234",
      timestamp: "0x6606a9bc",
    },
    hardforks: [
      {
        name: "chainstart",
        block: 0,
      },
      {
        name: "homestead",
        block: 0,
      },
      {
        name: "tangerineWhistle",
        block: 0,
      },
      {
        name: "spuriousDragon",
        block: 0,
      },
      {
        name: "byzantium",
        block: 0,
      },
      {
        name: "constantinople",
        block: 0,
      },
      {
        name: "petersburg",
        block: 0,
      },
      {
        name: "istanbul",
        block: 0,
      },
      {
        name: "berlin",
        block: 0,
      },
      {
        name: "london",
        block: 0,
      },
      {
        name: "paris",
        ttd: "0",
        block: 0,
      },
      {
        name: "mergeForkIdTransition",
        block: 0,
      },
      {
        name: "shanghai",
        block: null,
        timestamp: "0",
      },
      {
        name: "prague",
        block: null,
        timestamp: "1711712640",
      },
    ],
    bootstrapNodes: [],
    dnsNetworks: [],
  },
};
