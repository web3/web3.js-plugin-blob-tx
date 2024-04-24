import { Web3 } from 'web3';
import { config } from 'dotenv';
import { Web3BlobTxPlugin } from '../src';

jest.setTimeout(50000);
config();

describe('Web3BlobTxPlugin Tests', () => {
	let web3: Web3;

	beforeAll(() => {
		web3 = new Web3(`https://sepolia.infura.io/v3/${String(process.env.INFURA_KEY)}`);
		web3.registerPlugin(new Web3BlobTxPlugin());
	});

	it('test', async () => {
		web3.defaultHardfork = 'cancun';
		web3.defaultChain = 'sepolia';
		const acc = web3.eth.accounts.privateKeyToAccount(String(process.env.PRIVATE_KEY));
		web3.eth.accounts.wallet.add(acc);

		const txData = {
			from: acc.address,
			to: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
			value: '0x0',
			nonce: 2,
			gasLimit: 21000000,
			maxPriorityFeePerGas: 21000000,
			maxFeePerGas: 21000000,
			maxFeePerBlobGas: 3n,
			blobsData: ['any data text'],
		};

		const res = web3.blobTx.sendTransaction(txData);
		res.on('sending', data => {
			console.log('sending', data);
		});
		res.on('sent', hash => {
			console.log('hash', hash);
		});
		const receiptPromise = new Promise(resolve => {
			res.on('receipt', receipt => {
				console.log('receipt', receipt);
				resolve(receipt);
			});
		});

		res.on('transactionHash', hash => {
			console.log('hash', hash);
		});
		res.on('error', error => {
			console.log('error', error);
		});
		res.on('confirmation', confirmation => {
			console.log('confirmation', confirmation);
		});

		const receipt = await receiptPromise;
		expect(receipt).toBeDefined();
		expect(receipt.hash).toBeDefined();
	});
});
