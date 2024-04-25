import { Common } from '@ethereumjs/common';
import type { JsonTx } from '@ethereumjs/tx';
import { BlobEIP4844Transaction } from '@ethereumjs/tx';
import type { Kzg } from '@ethereumjs/util';
import { bytesToHex, toBytes } from '@ethereumjs/util';
import { loadKZG } from 'kzg-wasm';
import type { Web3Context } from 'web3';
import { Web3PromiEvent, Web3PluginBase } from 'web3-core';
import { TransactionNotFound } from 'web3-errors';
import type { SendTransactionEvents, SendTransactionOptions } from 'web3-eth';
import {
	getTransactionFromOrToAttr,
	waitForTransactionReceipt,
	trySendTransaction,
	SendTxHelper,
	formatTransaction,
} from 'web3-eth';
import { ethRpcMethods } from 'web3-rpc-methods';
import type {
	Address,
	Bytes,
	HexString,
	FormatType,
	Numbers,
	TransactionWithFromAndToLocalWalletIndex,
	TransactionCall,
	EthExecutionAPI,
	DataFormat,
	BlockNumberOrTag,
	BlockTag,
} from 'web3-types';
import { ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT, FMT_BYTES, FMT_NUMBER } from 'web3-types';
import { format, isNullish } from 'web3-utils';
import { isBlockTag, isBytes, validator } from 'web3-validator';

import { blobTransactionReceiptSchema, blobTransactionSchema } from './schemas';
import type { BlobTransaction, BlobTransactionReceipt } from './types';

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
		const f = { number: FMT_NUMBER.BIGINT, bytes: FMT_BYTES.UINT8ARRAY };

		return BlobEIP4844Transaction.fromTxData(
			// @ts-ignore
			format(
				blobTransactionSchema,
				{
					type: 3,
					...txData,
				} as BlobTransaction,
				f,
			),
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
		return format({ format: 'uint' }, gas, returnFormat ?? this.defaultReturnFormat);
	}

	public sendTransaction<
		ReturnFormat extends DataFormat,
		ResolveType = FormatType<BlobTransactionReceipt, ReturnFormat>,
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

						await sendTxHelper.checkRevertBeforeSending(transactionFormatted as TransactionCall);

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

						const transactionReceipt = await waitForTransactionReceipt<ReturnFormat>(
							this,
							transactionHash,
							returnFormat ?? this.defaultReturnFormat,
							async (_: Web3Context, transactionHash: Bytes, returnFormat: ReturnFormat) =>
								(await this.getTransactionReceipt<ReturnFormat>(
									transactionHash,
									returnFormat,
								)) as BlobTransactionReceipt,
						);

						const transactionReceiptFormatted = sendTxHelper.getReceiptWithEvents(
							format(
								blobTransactionReceiptSchema,
								transactionReceipt,
								returnFormat ?? this.defaultReturnFormat,
							),
						);

						sendTxHelper.emitReceipt(transactionReceiptFormatted);

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

	public async getTransaction<ReturnFormat extends DataFormat = typeof DEFAULT_RETURN_FORMAT>(
		transactionHash: Bytes,
		returnFormat: ReturnFormat = this.defaultReturnFormat as ReturnFormat,
	): Promise<FormatType<BlobTransaction, ReturnFormat> | undefined> {
		const transactionHashFormatted = format(
			{ format: 'bytes32' },
			transactionHash,
			DEFAULT_RETURN_FORMAT,
		);
		const response = await ethRpcMethods.getTransactionByHash(
			this.requestManager,
			transactionHashFormatted,
		);

		if (!response) throw new TransactionNotFound();

		return isNullish(response)
			? response
			: (formatTransaction<ReturnFormat>(response, returnFormat, {
					fillInputAndData: true,
					transactionSchema: blobTransactionSchema,
				}) as FormatType<BlobTransaction, ReturnFormat>);
	}
	public async getTransactionFromBlock<ReturnFormat extends DataFormat>(
		block: Bytes | BlockNumberOrTag = this.defaultBlock,
		transactionIndex: Numbers,
		returnFormat: ReturnFormat = this.defaultReturnFormat as ReturnFormat,
	): Promise<FormatType<BlobTransaction, ReturnFormat> | undefined> {
		const transactionIndexFormatted = format({ format: 'uint' }, transactionIndex, ETH_DATA_FORMAT);

		let response;
		if (isBytes(block)) {
			const blockHashFormatted = format({ format: 'bytes32' }, block, ETH_DATA_FORMAT);
			response = await ethRpcMethods.getTransactionByBlockHashAndIndex(
				this.requestManager,
				blockHashFormatted as HexString,
				transactionIndexFormatted,
			);
		} else {
			const blockNumberFormatted = isBlockTag(block as string)
				? (block as BlockTag)
				: format({ format: 'uint' }, block as Numbers, ETH_DATA_FORMAT);
			response = await ethRpcMethods.getTransactionByBlockNumberAndIndex(
				this.requestManager,
				blockNumberFormatted,
				transactionIndexFormatted,
			);
		}
		return isNullish(response)
			? response
			: (formatTransaction<ReturnFormat>(response, returnFormat, {
					fillInputAndData: true,
					transactionSchema: blobTransactionSchema,
				}) as FormatType<BlobTransaction, ReturnFormat>);
	}
	async getTransactionReceipt<ReturnFormat extends DataFormat>(
		transactionHash: Bytes,
		returnFormat: ReturnFormat = this.defaultReturnFormat as ReturnFormat,
	): Promise<FormatType<BlobTransactionReceipt, ReturnFormat> | undefined> {
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
			: format(
					blobTransactionReceiptSchema,
					response as unknown as BlobTransactionReceipt,
					returnFormat ?? this.defaultReturnFormat,
				);
	}
}

declare module 'web3' {
	interface Web3Context {
		blobTx: Web3BlobTxPlugin;
	}
}
