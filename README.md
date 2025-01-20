Web3Js Plugin for Blob Transactions (EIP4844)
===========

#### Web3.js libraries are being sunset on March 4th, 2025. For migration guides and more details please refer to [Chainsafe blog](https://blog.chainsafe.io/web3-js-sunset/)


This Web3Js plugin enhances the capabilities of Ethereum transactions by adding support for EIP4844 transactions, also known as "Blob transactions". EIP4844 introduces a new transaction format that allows for more efficient data storage and transmission on the Ethereum blockchain.

## Installation
```bash
npm i web3-plugin-blob-tx
```

## Usage

### Register plugin
```typescript
import {Web3BlobTxPlugin} from 'web3-plugin-blob-tx';
web3 = new Web3(/* provider here */);
web3.registerPlugin(new Web3BlobTxPlugin());
web3.defaultHardfork = 'cancun'; // set hardfork which support blob transactions
web3.defaultChain = 'sepolia'; // set chain which support blob transactions
```

### Methods

#### sendTransaction
```typescript
// add account to sign transaction
const acc = web3.eth.accounts.privateKeyToAccount(String(process.env.PRIVATE_KEY));
web3.eth.accounts.wallet.add(acc);

const txData = {
	from: acc.address,
	nonce: await web3.eth.getTransactionCount(acc.address),
	to: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
	maxFeePerBlobGas: 31458962313,
	gasLimit: 5000000,
	maxFeePerGas: 31458962313,
	maxPriorityFeePerGas: 31458962313,
	blobsData: ['any data text'],
};
// you can get transaction receipt
const transactionReceipt = await web3.blobTx.sendTransaction(txData);

// or supribe to events
const res = web3.blobTx.sendTransaction(txData);
res.on('sending', data => {
	console.log('sending', data);
});

res.on('sent', data => {
	console.log('sent', data);
});

res.on('receipt', receipt => {
	console.log('receipt', receipt);
});

res.on('transactionHash', hash => {
	console.log('hash', hash);
});

res.on('error', error => {
	console.log('error', error);
});

res.on('confirmation', data => {
	console.log('confirmation', data);
});

const receipt = await res; // and get receipt here

```

#### estimateGas
```typescript
import {BlobTransaction} from 'web3-plugin-blob-tx';

const txData:Partial<BlobTransaction> = {
    from: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
    to: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
    value: '0x0',
    gasLimit: 5000000,
    maxPriorityFeePerGas: 22380075395,
    maxFeePerGas: 22380075395,
    maxFeePerBlobGas: 29458962313n,
    blobsData: ['any data text'],
};
const gas = await web3.blobTx.estimateGas(txData);
```

#### getTransactionReceipt
```typescript
const receipt = await web3.blobTx.getTransactionReceipt(/* transaction hash */);
```

#### getTransaction
```typescript
const transaction = await web3.blobTx.getTransaction(/* transaction hash */);
```

#### getTransactionFromBlock
```typescript
const transaction = await web3.blobTx.getTransactionFromBlock(/* block number or tag */, /* transaction index */);
```

Contributing
------------

Pull requests are welcome. For major changes, please open an issue first
to discuss what you would like to change.

Please make sure to update tests as appropriate.

License
-------

[MIT](https://choosealicense.com/licenses/mit/)
