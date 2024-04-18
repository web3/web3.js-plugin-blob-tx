import { Web3 } from "web3";
import { randomBytes } from "@ethereumjs/util";
import { Web3TxEIP4844Plugin } from "../src";
import { concatBytes } from "./testData/util";

describe("Web3TxEIP4844Plugin Tests", () => {
  // it("should register TokensPlugin plugin on Web3Context instance", () => {
  //   const web3Context = new core.Web3Context("http://127.0.0.1:8545");
  //   web3Context.registerPlugin(new Web3TxEIP4844Plugin());
  //   expect(web3Context.txTypeEIP4844Plugin).toBeDefined();
  // });

  describe("method tests", () => {
    let web3: Web3;

    beforeAll(async () => {
      web3 = new Web3("http://127.0.0.1:8545");
      web3.registerPlugin(new Web3TxEIP4844Plugin());
      await web3.txTypeEIP4844Plugin.initCrypto(web3);
      console.log(web3.customCrypto);
      console.log(web3.transactionSchema);
    });

    it("make tx with plugin", async () => {
      const acc = web3.eth.accounts.privateKeyToAccount(
        "0x1f953dc9b6437fb94fcafa5dabe3faa0c34315b954dd66f41bf53273339c6d26"
      );
      web3.eth.accounts.wallet.add(acc);
      web3.defaultHardfork = "paris";
      web3.defaultChain = "holesky";
      // @ts-ignore
      // web3.transactionBuilder = async (options) => {
      //   const populatedTransaction = format(
      //     transactionSchema,
      //     options.transaction,
      //     // @ts-ignore
      //     options.web3Context.defaultReturnFormat
      //   ) as InternalTransaction;
      //
      //   // TODO: Debug why need to typecase getTransactionNonce
      //   if (isNullish(populatedTransaction.nonce)) {
      //     populatedTransaction.nonce = await getTransactionNonce(
      //       options.web3Context,
      //       populatedTransaction.from,
      //       ETH_DATA_FORMAT
      //     );
      //   }
      //
      //   if (isNullish(populatedTransaction.value)) {
      //     populatedTransaction.value = "0x0";
      //   }
      //
      //   if (!isNullish(populatedTransaction.data)) {
      //     if (!populatedTransaction.data.startsWith("0x"))
      //       populatedTransaction.data = `0x${populatedTransaction.data}`;
      //   } else if (!isNullish(populatedTransaction.input)) {
      //     if (!populatedTransaction.input.startsWith("0x"))
      //       populatedTransaction.input = `0x${populatedTransaction.input}`;
      //   } else {
      //     populatedTransaction.input = "0x";
      //   }
      //
      //   if (isNullish(populatedTransaction.common)) {
      //     if (options.web3Context.defaultCommon) {
      //       const common = options.web3Context
      //         .defaultCommon as unknown as Common;
      //       // @ts-ignore
      //       options.web3Context.defaultCommon.customCrypto = { kzg };
      //       // @ts-ignore
      //       options.web3Context.defaultCommon.chainId = () =>
      //         // @ts-ignore
      //         BigInt(common.customChain.chainId);
      //       // @ts-ignore
      //       options.web3Context.defaultCommon.copy = () =>
      //         // @ts-ignore
      //         options.web3Context.defaultCommon;
      //       // @ts-ignore
      //       options.web3Context.defaultCommon.isActivatedEIP = () => true;
      //       // @ts-ignore
      //       // const chainId = common.customChain.chainId as string;
      //       // // @ts-ignore
      //       // const networkId = common.customChain.networkId as string;
      //       // // @ts-ignore
      //       // const name = common.customChain.name as string;
      //       // populatedTransaction.chainId = chainId;
      //       // populatedTransaction.common = {
      //       //   ...common,
      //       //   customChain: { chainId, networkId, name },
      //       // };
      //     }
      //   }
      //
      //   if (
      //     isNullish(populatedTransaction.chainId) &&
      //     isNullish(populatedTransaction.common?.customChain.chainId)
      //   ) {
      //     populatedTransaction.chainId = await getChainId(
      //       options.web3Context,
      //       ETH_DATA_FORMAT
      //     );
      //   }
      //
      //   if (isNullish(populatedTransaction.networkId)) {
      //     populatedTransaction.networkId =
      //       (options.web3Context.defaultNetworkId as string) ??
      //       (await getId(options.web3Context, ETH_DATA_FORMAT));
      //   }
      //
      //   if (
      //     isNullish(populatedTransaction.gasLimit) &&
      //     !isNullish(populatedTransaction.gas)
      //   ) {
      //     populatedTransaction.gasLimit = populatedTransaction.gas;
      //   }
      //
      //   populatedTransaction.type = getTransactionType(
      //     populatedTransaction,
      //     options.web3Context
      //   );
      //   if (
      //     isNullish(populatedTransaction.accessList) &&
      //     (populatedTransaction.type === "0x1" ||
      //       populatedTransaction.type === "0x2")
      //   ) {
      //     populatedTransaction.accessList = [];
      //   }
      //   // @ts-ignore
      //   // populatedTransaction.common = {
      //   //   @ts-ignore
      //   // customCrypto: { kzg },
      //   // };
      //
      //   populatedTransaction.blobVersionedHashes = [
      //     // @ts-ignore
      //     concatBytes(new Uint8Array([1]), randomBytes(31)),
      //   ];
      //   return populatedTransaction;
      // };

      // const customChainParams = {
      //   hardforks: [{ name: web3.defaultHardfork, block: 0 }],
      // };
      //
      // const common = Common.custom(customChainParams, {
      //   // baseChain: Chain.Goerli,
      //   // hardfork: web3.defaultHardfork,
      //   // @ts-ignore
      //   // chainId: 1337,
      //   // networkId: web3.defaultNetworkId,
      //   // name: web3.defaultHardfork,
      //   customCrypto: { kzg },
      // });
      // // @ts-ignore
      // common.hardfork = web3.defaultHardfork;
      // // @ts-ignore
      // common.customChain = {};
      // // @ts-ignore
      // common.customChain.chainId = 1337;
      // // @ts-ignore
      // web3.defaultCommon = common;
      const res = await web3.eth.sendTransaction({
        type: "0x3",
        from: acc.address,
        to: "0x7ed0e85b8e1e925600b4373e6d108f34ab38a401",
        value: "0x0",
        nonce: 0,
        gas: 21000000,
        maxPriorityFeePerGas: 69891347,
        maxFeePerGas: 69891347,
        // @ts-ignore
        blobVersionedHashes: [
          // @ts-ignore
          concatBytes(new Uint8Array([1]), randomBytes(31)),
        ],
        maxFeePerBlobGas: 1n,
      });
      console.log("res", res);
    });
  });
});
