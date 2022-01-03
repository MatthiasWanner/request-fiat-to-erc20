import { utils as ethersUtils, providers, BigNumber } from 'ethers';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { ExtensionTypes, RequestLogicTypes } from '@requestnetwork/types';
import {
  approveErc20ForProxyConversionIfNeeded,
  isSolvent,
  payRequest
} from '@requestnetwork/payment-processor';

import { cryptoCompare, currencies } from './queries.api';
import { checkConnectedNetwork } from './ethereum.utils';
import { IWindowEthereum } from '../../types';

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

  if (paymentNetwork) {
    return request.extensions[paymentNetwork].values.acceptedTokens[0];
  }

  return null;
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

export const anyToErc20Payment = async (
  walletAddress: string,
  feeAmount = 0,
  request: IRequestData,
  currencyInfos: RequestLogicTypes.ICurrency,
  provider: providers.Web3Provider
) => {
  if (!request) throw new Error('No request data provided');

  try {
    const { decimals, meta } = await currencies.getOne(currencyInfos.value);

    const { code: referenceCurrencySymbol } = meta.exchangeInfo.cryptocompare;

    const rate = (
      await cryptoCompare.getRate(request.currency, referenceCurrencySymbol)
    )[referenceCurrencySymbol];

    if (!rate) throw new Error('Error getting rate');

    const maxToSpend = calculateMaxToSpend(
      +request.expectedAmount,
      feeAmount,
      rate,
      decimals,
      3
    );

    if (
      !(await isSolvent(
        walletAddress,
        { ...currencyInfos, value: currencyInfos.value.toLowerCase() },
        maxToSpend,
        { provider }
      ))
    ) {
      throw new Error('You do not have enough funds to pay this request');
    }

    await approveErc20ForProxyConversionIfNeeded(
      request,
      walletAddress,
      currencyInfos.value,
      provider,
      maxToSpend
    );

    const tx = await payRequest(request, provider, undefined, undefined, {
      currency: currencyInfos,
      maxToSpend
    });
    await tx.wait(1);
  } catch (error) {
    throw error;
  }
};

export const requestPayment = async (
  request: IRequestData,
  ethereum: IWindowEthereum
): Promise<void> => {
  try {
    if (!ethereum.selectedAddress || !request) {
      throw new Error('No account or request data provided');
    }

    const paymentCurrencyContractAddress = getPaymentCurrencyContract(request);
    if (!paymentCurrencyContractAddress)
      throw new Error('No payment currency contract address provided');

    const { network, feeAmount = 0 } = request.extensions[
      getPaymentNetwork(request) as string
    ]?.values as ExtensionTypes.PnAnyToErc20.ICreationParameters;

    const currencyInfos: RequestLogicTypes.ICurrency = {
      type: RequestLogicTypes.CURRENCY.ERC20,
      value: paymentCurrencyContractAddress,
      network
    };

    await checkConnectedNetwork(network as string, ethereum);

    const provider = new providers.Web3Provider(ethereum);

    const paymentNetwork = getPaymentNetwork(request);

    if (
      paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY
    ) {
      return anyToErc20Payment(
        ethereum.selectedAddress,
        +feeAmount,
        request,
        currencyInfos,
        provider
      );
    }

    throw new Error('Payment network not supported');
  } catch (error) {
    throw error;
  }
};
