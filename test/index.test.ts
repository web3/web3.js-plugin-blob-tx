import { Web3 } from 'web3';
import { config } from 'dotenv';
import { Numbers, TransactionHash } from 'web3-types';
import { Web3BlobTxPlugin, BlobTransaction } from '../src';
import { BlobTransactionReceipt } from '../lib';

jest.setTimeout(100000);
config();

describe('Web3BlobTxPlugin Tests', () => {
	let web3: Web3;

	beforeAll(() => {
		web3 = new Web3(`https://sepolia.infura.io/v3/${String(process.env.INFURA_KEY)}`);
		web3.registerPlugin(new Web3BlobTxPlugin());
		web3.defaultHardfork = 'cancun';
		web3.defaultChain = 'sepolia';
	});

	it('estimateGas', async () => {
		const txData = {
			from: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
			to: '0x7ed0e85b8e1e925600b4373e6d108f34ab38a401',
			value: '0x0',
			gasLimit: 5000000,
			maxPriorityFeePerGas: 22380075395,
			maxFeePerGas: 22380075395,
			maxFeePerBlobGas: 29458962313n,
			blobsData: ['any data text'],
		};
		expect(Number(await web3.blobTx.estimateGas(txData as BlobTransaction))).toBeGreaterThan(0);
	});
	it('getTransactionReceipt', async () => {
		const receipt = await web3.blobTx.getTransactionReceipt(
			'0xccd8a71976c4c40150ef69cb3a551227d06e3227be54bccd4e2abb52b66ac520',
		);
		expect(receipt).toBeDefined();
		expect(Number(receipt?.blobGasPrice)).toBeGreaterThan(0);
		expect(Number(receipt?.blobGasUsed)).toBeGreaterThan(0);
	});
	it('sendTransaction', async () => {
		web3.defaultHardfork = 'cancun';
		web3.defaultChain = 'sepolia';
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

		// @ts-ignore
		const res = web3.blobTx.sendTransaction(txData);
		res.on('sending', data => {
			console.log('sending', data);
		});
		res.on('sent', data => {
			console.log('sent', data);
		});
		const receiptPromise = new Promise((resolve: (receipt: BlobTransactionReceipt) => void) => {
			res.on('receipt', receipt => {
				console.log('receipt', receipt);
				resolve(receipt as BlobTransactionReceipt);
			});
		});

		const hashPromise = new Promise((resolve: (hash: TransactionHash) => void) => {
			res.on('transactionHash', hash => {
				console.log('hash', hash);
				resolve(hash as TransactionHash);
			});
		});
		res.on('error', error => {
			console.log('error', error);
		});
		let confirmationFn;
		const confirmationPromise = new Promise(
			(resolve: (receipt: BlobTransactionReceipt) => void) => {
				confirmationFn = (data: any) => {
					console.log('confirmation', data);
					if (Number((data as { confirmations: Numbers }).confirmations) > 1) {
						resolve((data as unknown as { receipt: BlobTransactionReceipt }).receipt);
					}
				};

				res.on('confirmation', confirmationFn);
			},
		);

		const hash = await hashPromise;
		const receipt = await receiptPromise;
		const confirmationReceipt = await confirmationPromise;
		expect(hash).toBeDefined();
		expect(receipt).toBeDefined();
		expect(confirmationReceipt).toBeDefined();

		expect(Number(receipt.blobGasPrice)).toBeGreaterThan(0);
		expect(Number(receipt.blobGasUsed)).toBeGreaterThan(0);

		expect(Number(confirmationReceipt.blobGasPrice)).toBeGreaterThan(0);
		expect(Number(confirmationReceipt.blobGasUsed)).toBeGreaterThan(0);
		if (confirmationFn) {
			res.off('confirmation', confirmationFn);
		}
	});
});
