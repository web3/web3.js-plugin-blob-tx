import { BlobEIP4844Transaction, JsonTx } from '@ethereumjs/tx';
import { Common } from '@ethereumjs/common';
import { bytesToHex, Kzg, toBytes } from '@ethereumjs/util';
import { loadKZG } from 'kzg-wasm';
import { validator } from 'web3-validator';
import { Web3Context } from 'web3';
import { ethRpcMethods } from 'web3-rpc-methods';
import {
	Address,
	ETH_DATA_FORMAT,
	Bytes,
	HexString,
	TransactionReceipt,
	FormatType,
	Numbers,
	TransactionWithFromAndToLocalWalletIndex,
	TransactionCall,
	EthExecutionAPI,
	DataFormat,
	DEFAULT_RETURN_FORMAT,
} from 'web3-types';
import { Web3PromiEvent, Web3PluginBase } from 'web3-core';
import {
	// @ts-ignore temporary fix, wait for new web3js release with exported methods
	getTransactionFromOrToAttr,
	// @ts-ignore temporary fix, wait for new web3js release with exported methods
	waitForTransactionReceipt,
	// @ts-ignore temporary fix, wait for new web3js release with exported methods
	trySendTransaction,
	// @ts-ignore temporary fix, wait for new web3js release with exported methods
	SendTxHelper,
	SendTransactionEvents,
	SendTransactionOptions,
} from 'web3-eth';
import { format, isNullish } from 'web3-utils';
import type { BlobTransaction, BlobTransactionReceipt } from './types';
import { blobTransactionReceiptSchema, blobTransactionSchema } from './schemas';

export class Web3BlobTxPlugin extends Web3PluginBase {
	public pluginNamespace = 'blobTx';
	private crypto?: { kzg: Kzg };

	public async prepareTransaction(
		tx: BlobTransaction,
		customCrypto?: { kzg: Kzg },
	): Promise<BlobEIP4844Transaction> {
		const { chain, hardfork, ...txData } = tx;

		if (!customCrypto && !this.crypto) {
			this.crypto = { kzg: await loadKZG() };
		}

		const common = new Common({
			chain: chain ?? this.defaultChain,
			hardfork: hardfork ?? this.defaultHardfork,
			eips: [4844],
			customCrypto: customCrypto ?? this.crypto,
		});
		return BlobEIP4844Transaction.fromTxData(
			{
				type: 5,
				...txData,
			},
			{
				common,
			},
		);
	}

	public validateTransaction(txJson: JsonTx): void {
		validator.validateJSONSchema(txJson, blobTransactionSchema);
	}

	public signTransaction(
		tx: BlobEIP4844Transaction,
		fromAddress?: Address,
	): BlobEIP4844Transaction {
		const acc = this.wallet?.get(String(fromAddress));
		if (!acc) {
			throw new Error(
				'Account not found. Please set account to wallet or provider privateKey param',
			);
		}
		const signWithPk = acc.privateKey;

		this.validateTransaction(tx.toJSON());

		return tx.sign(toBytes(signWithPk));
	}

	public serializeTransaction(tx: BlobEIP4844Transaction): string {
		return bytesToHex(tx.serializeNetworkWrapper());
	}

	public async sendRawTransaction(serializedTx: string): Promise<string> {
		return ethRpcMethods.sendRawTransaction(this.requestManager, serializedTx);
	}

	public async estimateGas<ReturnFormat extends DataFormat>(
		tx: Partial<BlobTransaction>,
		blockNumber: Numbers = 'latest',
		returnFormat?: ReturnFormat,
	) {
		const blobTx = await this.prepareTransaction(tx as BlobTransaction);
		const gas = (await ethRpcMethods.estimateGas<BlobTransaction>(
			this.requestManager,
			blobTx.toJSON() as BlobTransaction,
			blockNumber,
		)) as Numbers;
		return format({ format: 'uint' }, gas as Numbers, returnFormat ?? this.defaultReturnFormat);
	}

	public sendTransaction<
		ReturnFormat extends DataFormat,
		ResolveType = FormatType<TransactionReceipt, ReturnFormat>,
	>(
		transaction: BlobTransaction,
		returnFormat: ReturnFormat = this.defaultReturnFormat as ReturnFormat,
		options: SendTransactionOptions<ResolveType> = {
			checkRevertBeforeSending: true,
		},
	): Web3PromiEvent<ResolveType, SendTransactionEvents<ReturnFormat>> {
		const promiEvent = new Web3PromiEvent<ResolveType, SendTransactionEvents<ReturnFormat>>(
			(resolve, reject) => {
				setImmediate(async () => {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-call
					const sendTxHelper = new SendTxHelper<ReturnFormat, ResolveType, BlobTransaction>({
						web3Context: this as Web3Context<EthExecutionAPI, any>,
						promiEvent,
						options,
						returnFormat,
					});
					let transactionFormatted: BlobTransaction = format(
						blobTransactionSchema,
						{
							...transaction,
							from: getTransactionFromOrToAttr(
								'from',
								this,
								transaction as TransactionWithFromAndToLocalWalletIndex,
							),
							to: getTransactionFromOrToAttr(
								'to',
								this,
								transaction as TransactionWithFromAndToLocalWalletIndex,
							),
						},
						ETH_DATA_FORMAT,
					) as BlobTransaction;

					try {
						transactionFormatted = (await sendTxHelper.populateGasPrice({
							transaction: transaction,
							transactionFormatted: transactionFormatted,
						})) as BlobTransaction;

						await sendTxHelper.checkRevertBeforeSending(transactionFormatted);

						sendTxHelper.emitSending(transactionFormatted);

						const blobTx = await this.prepareTransaction(transactionFormatted);
						const signedTx = this.signTransaction(blobTx, transactionFormatted.from);
						const serializedTx = this.serializeTransaction(signedTx);
						transactionFormatted = signedTx.toJSON() as BlobTransaction;
						const transactionHash: HexString = await trySendTransaction(
							this,
							async (): Promise<string> => this.sendRawTransaction(serializedTx),
							serializedTx,
						);

						const transactionHashFormatted = format(
							{ format: 'bytes32' },
							transactionHash as Bytes,
							returnFormat ?? this.defaultReturnFormat,
						);
						sendTxHelper.emitSent(transactionFormatted);
						sendTxHelper.emitTransactionHash(transactionHashFormatted as string & Uint8Array);

						const transactionReceipt = await waitForTransactionReceipt(
							this,
							transactionHash,
							returnFormat ?? this.defaultReturnFormat,
							(_: Web3Context, transactionHash: Bytes, returnFormat: ReturnFormat) =>
								this.getTransactionReceipt(transactionHash, returnFormat),
						);

						const transactionReceiptFormatted = sendTxHelper.getReceiptWithEvents(
							format(
								blobTransactionReceiptSchema,
								transactionReceipt,
								returnFormat ?? this.defaultReturnFormat,
							),
						);

						sendTxHelper.emitReceipt(transactionReceiptFormatted as TransactionReceipt);

						resolve(
							await sendTxHelper.handleResolve({
								receipt: transactionReceiptFormatted,
								tx: transactionFormatted as TransactionCall,
							}),
						);

						sendTxHelper.emitConfirmation({
							receipt: transactionReceiptFormatted,
							transactionHash,
							customTransactionReceiptSchema: blobTransactionReceiptSchema,
						});
					} catch (error) {
						reject(
							await sendTxHelper.handleError({
								error,
								tx: transactionFormatted as TransactionCall,
							}),
						);
					}
				});
			},
		);
		return promiEvent;
	}
	async getTransactionReceipt<ReturnFormat extends DataFormat>(
		transactionHash: Bytes,
		returnFormat: ReturnFormat = this.defaultReturnFormat as ReturnFormat,
	) {
		const transactionHashFormatted = format(
			{ format: 'bytes32' },
			transactionHash,
			DEFAULT_RETURN_FORMAT,
		);
		const response = await ethRpcMethods.getTransactionReceipt(
			this.requestManager,
			transactionHashFormatted,
		);

		return isNullish(response)
			? response
			: (format(
					blobTransactionReceiptSchema,
					response as unknown as BlobTransactionReceipt,
					returnFormat ?? this.defaultReturnFormat,
				) as BlobTransactionReceipt);
	}
}

declare module 'web3' {
	interface Web3Context {
		blobTx: Web3BlobTxPlugin;
	}
}
