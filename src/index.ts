import { TransactionFactory } from "web3-eth-accounts";
import { Web3PluginBase } from "web3";
import { BlobEIP4844Transaction, TransactionType } from "./eip4844";

export class Web3TxEIP4844Plugin extends Web3PluginBase {
  public pluginNamespace = "txTypeEIP4844Plugin";

  public constructor() {
    super();
    // @ts-ignore
    TransactionFactory.registerTransactionType(
      // @ts-ignore
      Number(TransactionType.BlobEIP4844),
      // @ts-ignore
      BlobEIP4844Transaction
    );
  }
}

declare module "web3" {
  interface Web3Context {
    txTypeEIP4844Plugin: Web3TxEIP4844Plugin;
  }
}
