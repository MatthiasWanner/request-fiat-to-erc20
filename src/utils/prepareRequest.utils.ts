import { RequestLogicTypes, ExtensionTypes } from '@requestnetwork/types';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { utils as ethersUtils, BigNumber } from 'ethers';
import { IGetCurencyInfosHandlerReturn, PaymentSettingsArgs } from 'types';
import { cryptoCompare, currencies } from './queries.api';

/**
 *
 * @param currencyInfos infos about payment Currency as ICurrency request Network type
 * @param invoiceCurrency represent the currency of the invoice (e.g. EUR)
 * @param requestAmount represent the amount of the request. It is just passed to the function and returned to have all args in object if needed
 * @param feeAmount It is just passed to the function and returned to have all args in object if needed
 * @returns an object that provided all necessary args must be passed to the calculateMaxToSpend function
 */
export const prepareCalculateMaxToSpendArgs = async (
  currencyInfos: IGetCurencyInfosHandlerReturn,
  invoiceCurrency: string,
  requestAmount?: number,
  feeAmount?: number
) => {
  const slippage = 3;

  const { decimals, meta } = currencyInfos;

  const { code: referenceCurrencySymbol } = meta.exchangeInfo.cryptocompare;

  const currency = invoiceCurrency === 'jEUR-matic' ? 'EUR' : invoiceCurrency; // Request API send jEUR-matic as invoice currency if is equal to paymentCurrency
  const rate = (await cryptoCompare.getRate(currency, referenceCurrencySymbol))[
    referenceCurrencySymbol
  ];

  if (!rate) throw new Error('Error getting rate');

  return { requestAmount, feeAmount, rate, decimals, slippage };
};

/**
 *
 * @param requestAmount the amount of the request in fiat currency
 * @param feeAmount
 * @param conversionRate
 * @param decimals number of decimals of the output crypto you want to pay
 * @param slippage rate to anticipate conversion variations
 * @returns BigNumber representing the max amount of the crypto you can pay
 */
export const calculateMaxToSpend = (
  requestAmount: number,
  feeAmount: number,
  conversionRate: number,
  decimals: number,
  slippage: number
): BigNumber => {
  const cryptoAmount = ((requestAmount + feeAmount) * conversionRate) / 100; // 👈 100 only with Fiat currency as requestAmount

  const maxCryptoAmount = cryptoAmount + (slippage * cryptoAmount) / 100;

  const roundedMaxCryptoAmount = Math.round(maxCryptoAmount * 100) / 100;

  return ethersUtils.parseUnits(roundedMaxCryptoAmount.toString(), decimals);
};

export const getPaymentNetwork = (
  request: IRequestData
): ExtensionTypes.ID | undefined => {
  return Object.values(request.extensions).find(
    (x) => x.type === 'payment-network'
  )?.id;
};

/**
 *
 * @param request represent the request to pay as IRequestData format provided by Request API
 * @returns  number to recover fee amount
 */
export const getRequestFees = (request: IRequestData): number => {
  return +request.extensions[getPaymentNetwork(request) as string]?.values
    .feeAmount;
};

/**
 *
 * @param request represent the request to pay as IRequestData format provided by Request API
 * @returns  an object containing currencyInfos key as ICurrency type used by hasAllowance(), approveERC20Transactions(),  and requestPayment() handlers
 * @returns  an object containing decimals key as number used by calculateMaxToSpend()
 */
export const getCurrencyInfos = async (
  paymentCurrency: string
): Promise<IGetCurencyInfosHandlerReturn> => {
  const {
    type,
    decimals,
    hash: contractAddress,
    network,
    meta
  } = await currencies.getOne(paymentCurrency);

  const currencyInfos: RequestLogicTypes.ICurrency = {
    type,
    value: contractAddress,
    network
  };

  return { currencyInfos, decimals, meta };
};

export const getPaymentSettings = async (
  request: IRequestData,
  paymentCurrency: string
): Promise<PaymentSettingsArgs> => {
  const paymentCurrencyInfos = await getCurrencyInfos(paymentCurrency);

  const { currencyInfos } = paymentCurrencyInfos;

  const feeAmount = getRequestFees(request);

  const maxToSpendArgs = await prepareCalculateMaxToSpendArgs(
    paymentCurrencyInfos,
    request.currency
  );

  const maxToSpend = calculateMaxToSpend(
    +request.expectedAmount,
    +feeAmount,
    maxToSpendArgs.rate,
    maxToSpendArgs.decimals,
    3
  );
  return { currency: currencyInfos, maxToSpend };
};
