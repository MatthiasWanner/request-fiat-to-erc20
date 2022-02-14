import { RequestLogicTypes, ExtensionTypes } from '@requestnetwork/types';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { utils as ethersUtils, providers, BigNumber } from 'ethers';
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
  currencyInfos: RequestLogicTypes.ICurrency,
  invoiceCurrency: string,
  requestAmount?: number,
  feeAmount?: number
) => {
  const slippage = 3;

  const { decimals, meta } = await currencies.getOne(currencyInfos.value);

  const { code: referenceCurrencySymbol } = meta.exchangeInfo.cryptocompare;

  const rate = (
    await cryptoCompare.getRate(invoiceCurrency, referenceCurrencySymbol)
  )[referenceCurrencySymbol];

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

export const getPaymentCurrencyContract = (
  request: IRequestData
): string | null => {
  const paymentNetwork = getPaymentNetwork(request);

  if (
    paymentNetwork &&
    paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY
  ) {
    return request.extensions[paymentNetwork].values.acceptedTokens[0];
  } else if (
    paymentNetwork &&
    paymentNetwork ===
      ExtensionTypes.ID.PAYMENT_NETWORK_ERC20_FEE_PROXY_CONTRACT
  ) {
    return '0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c'; // 👈 FIXME: hardcoded only jEURO contract for the moment
  }

  return null;
};

/**
 *
 * @param request represent the request to pay as IRequestData format provided by Request API
 * @returns  an object containing currencyInfos key asICurrency type used by hasAllowance(), approveERC20Transactions(),  and requestPayment() handlers
 * @returns  an object containing feeAmount key as number used by hasAllowance(), and requestPayment() handlers
 */
export const getCurrencyInfos = (
  request: IRequestData
): {
  feeAmount: number | string;
  currencyInfos: RequestLogicTypes.ICurrency;
} => {
  const paymentCurrencyContractAddress = getPaymentCurrencyContract(request);
  if (!paymentCurrencyContractAddress)
    throw new Error('No payment currency contract address provided');

  //TODO: manage all network formats
  const { network = 'matic', feeAmount = 0 } = request.extensions[
    getPaymentNetwork(request) as string
  ]?.values as ExtensionTypes.PnAnyToErc20.ICreationParameters;

  const currencyInfos: RequestLogicTypes.ICurrency = {
    type: RequestLogicTypes.CURRENCY.ERC20,
    value: paymentCurrencyContractAddress,
    network
  };

  return { feeAmount, currencyInfos };
};
