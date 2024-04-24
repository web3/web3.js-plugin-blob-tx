import type { BlobEIP4844TxData } from "@ethereumjs/tx";
import type { Address } from "web3-types";

export type Transaction = BlobEIP4844TxData & {
  from?: Address;
  to: Address;
  chain?: string;
  hardfork?: string;
};
