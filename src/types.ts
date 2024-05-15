import type { FeeMarketEIP1559TxData } from 'web3-eth-accounts';
import type { Address, Bytes, Numbers, TransactionReceipt } from 'web3-types';

export type BlobTransaction = FeeMarketEIP1559TxData & {
	blobVersionedHashes?: Bytes[];
	maxFeePerBlobGas?: Numbers;
	blobs?: Bytes[];
	kzgCommitments?: Bytes[];
	kzgProofs?: Bytes[];
	blobsData?: string[];
	from?: Address;
	to: Address;
	chain?: string;
	hash?: Bytes;
	blockHash?: Bytes;
	blockNumber?: Numbers;
	hardfork?: string;
};

export type BlobTransactionReceipt = TransactionReceipt & {
	blobGasPrice: Numbers;
	blobGasUsed: Numbers;
};
