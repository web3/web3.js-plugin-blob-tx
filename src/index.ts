import { BlobEIP4844Transaction, TransactionType } from "@ethereumjs/tx";
import { Web3PluginBase } from "web3";
import {
  BaseTransaction,
  TransactionFactory,
  addEIP,
  addHardfork,
  addChain,
} from "web3-eth-accounts";
import { loadKZG } from "kzg-wasm";
import type { ValidationSchemaInput } from "web3-validator";
import { Kzg } from "@ethereumjs/util";
import { Web3Context } from "../../web3.js/packages/web3-core";
import {
  EIP4844,
  hardforks,
  CHAINS,
  transactionSchemaEip4844,
  EIP4895,
} from "./shemas";

export class Web3TxEIP4844Plugin extends Web3PluginBase {
  public pluginNamespace = "txTypeEIP4844Plugin";

  public constructor() {
    super();
    TransactionFactory.registerTransactionType(
      TransactionType.BlobEIP4844,
      BlobEIP4844Transaction as unknown as typeof BaseTransaction<unknown>
    );
    addEIP(4844, EIP4844);
    addEIP(4895, EIP4895);

    for (const hardforkName of Object.keys(hardforks)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      addHardfork(hardforkName, hardforks[hardforkName]);
    }

    for (const chainName of Object.keys(CHAINS)) {
      addChain(CHAINS[chainName]);
    }
  }
  async initCrypto(web3Context: Web3Context, kzg?: Kzg): Promise<void> {
    web3Context.customCrypto = { kzg: kzg ?? (await loadKZG()) };
    web3Context.transactionSchema =
      transactionSchemaEip4844 as unknown as ValidationSchemaInput;
  }
}

declare module "web3" {
  interface Web3Context {
    txTypeEIP4844Plugin: Web3TxEIP4844Plugin;
  }
}
