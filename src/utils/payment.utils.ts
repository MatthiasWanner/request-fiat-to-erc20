import { providers } from 'ethers';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { ExtensionTypes } from '@requestnetwork/types';
import {
  hasSufficientFunds,
  isSolvent,
  payRequest
} from '@requestnetwork/payment-processor';

import { checkConnectedNetwork, getWalletAddress } from './ethereum.utils';
import { IWindowEthereum, PaymentSettingsArgs } from '../../types';
import { getPaymentNetwork } from './prepareRequest.utils';
import { getPaymentSettings, getRequestFees } from '.';

export const anyToErc20Payment = async (
  walletAddress: string,
  request: IRequestData,
  provider: providers.Web3Provider,
  paymentSettings: PaymentSettingsArgs
) => {
  if (!request) throw new Error('No request data provided');
  const { currency, maxToSpend } = paymentSettings;

  try {
    if (
      !(await isSolvent(
        walletAddress,
        { ...currency, value: currency.value.toLowerCase() },
        maxToSpend,
        { provider }
      ))
    ) {
      throw new Error('You do not have enough funds to pay this request');
    }

    const tx = await payRequest(request, provider, undefined, undefined, {
      currency,
      maxToSpend
    });

    return (await tx.wait(1)).transactionHash;
  } catch (error) {
    throw error;
  }
};

export const requestPayment = async (
  request: IRequestData,
  ethereum: IWindowEthereum,
  paymentCurrency: string
): Promise<string> => {
  const [payerWalletAddress] = await getWalletAddress(ethereum);
  try {
    if (!payerWalletAddress || !request) {
      throw new Error('No account or request data provided');
    }

    const provider = new providers.Web3Provider(ethereum);

    const paymentNetwork = getPaymentNetwork(request);

    if (
      paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY
    ) {
      const paymentSettings = await getPaymentSettings(
        request,
        paymentCurrency
      );

      const { currency: currencyInfos } = paymentSettings;

      if (!currencyInfos.network)
        throw new Error('Currency network not provided');

      await checkConnectedNetwork(currencyInfos.network, ethereum);

      return await anyToErc20Payment(
        payerWalletAddress,
        request,
        provider,
        paymentSettings
      );
    } else {
      if (
        !(await hasSufficientFunds(request, payerWalletAddress, { provider }))
      ) {
        throw new Error('You do not have enough funds to pay this request');
      }

      const tx = await payRequest(request, provider);

      return (await tx.wait(1)).transactionHash;
    }
  } catch (error) {
    throw error;
  }
};
