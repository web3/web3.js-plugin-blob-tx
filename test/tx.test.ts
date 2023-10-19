import { randomBytes } from "crypto";
import { Common } from "web3-eth-accounts";
import { BlobEIP4844Transaction } from "../src/eip4844";
import { Hardfork } from "../src/eip4844/hardfork";
import gethGenesis from "./testData/4844-hardfork.json";
import { concatBytes } from "./testData/util";

const common = Common.fromGethGenesis(gethGenesis, {
  chain: "customChain",
  hardfork: Hardfork.Berlin,
});

const pk = randomBytes(32);
describe("EIP4844 constructor tests - valid scenarios", () => {
  it("should work", () => {
    const txData = {
      type: 0x03,
      blobVersionedHashes: [concatBytes(new Uint8Array([1]), randomBytes(31))],
      maxFeePerBlobGas: BigInt(20),
    };
    const tx = BlobEIP4844Transaction.fromTxData(txData, { common });
    expect(tx.type).toBe(3);

    const serializedTx = tx.serialize();
    expect(serializedTx[0]).toBe(3);
    const deserializedTx = BlobEIP4844Transaction.fromSerializedTx(
      serializedTx,
      { common }
    );
    expect(deserializedTx.type).toBe(3);

    const signedTx = tx.sign(pk);
    console.log("signedTx", signedTx);
    // @ts-ignore
    const sender = signedTx.getSenderAddress().toString();
    const decodedTx = BlobEIP4844Transaction.fromSerializedTx(
      // @ts-ignore
      signedTx.serialize(),
      { common }
    );
    expect(decodedTx.getSenderAddress().toString()).toBe(sender);
  });
});
