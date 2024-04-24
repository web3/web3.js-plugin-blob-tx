import type { BlobEIP4844TxData } from '@ethereumjs/tx';
import type { Address, Numbers, TransactionReceipt } from 'web3-types';

export type BlobTransaction = BlobEIP4844TxData & {
	from?: Address;
	to: Address;
	chain?: string;
	hardfork?: string;
};

export type BlobTransactionReceipt = TransactionReceipt & {
	blobGasPrice: Numbers;
	blobGasUsed: Numbers;
};
