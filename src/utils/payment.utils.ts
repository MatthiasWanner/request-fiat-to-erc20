import { providers } from 'ethers';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { ExtensionTypes, RequestLogicTypes } from '@requestnetwork/types';
import { isSolvent, payRequest } from '@requestnetwork/payment-processor';

import { checkConnectedNetwork, getWalletAddress } from './ethereum.utils';
import { IWindowEthereum } from '../../types';
import {
  calculateMaxToSpend,
  getCurrencyInfos,
  getPaymentNetwork,
  prepareCalculateMaxToSpendArgs
} from './prepareRequest.utils';

export const anyToErc20Payment = async (
  walletAddress: string,
  feeAmount = 0,
  request: IRequestData,
  currencyInfos: RequestLogicTypes.ICurrency,
  provider: providers.Web3Provider
) => {
  if (!request) throw new Error('No request data provided');

  try {
    const maxToSpendArgs = await prepareCalculateMaxToSpendArgs(
      currencyInfos,
      request.currency
    );

    const maxToSpend = calculateMaxToSpend(
      +request.expectedAmount,
      feeAmount,
      maxToSpendArgs.rate,
      maxToSpendArgs.decimals,
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
  const [payerWalletAddress] = await getWalletAddress(ethereum);
  try {
    if (!payerWalletAddress || !request) {
      throw new Error('No account or request data provided');
    }

    const { currencyInfos, feeAmount } = getCurrencyInfos(request);

    if (!currencyInfos.network) throw new Error('No network infos provided');

    await checkConnectedNetwork(currencyInfos.network, ethereum);

    const provider = new providers.Web3Provider(ethereum);

    const paymentNetwork = getPaymentNetwork(request);

    if (
      paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY
    ) {
      return await anyToErc20Payment(
        payerWalletAddress,
        +feeAmount,
        request,
        currencyInfos,
        provider
      );
    }

    const tx = await payRequest(request, provider);
    await tx.wait(1);
  } catch (error) {
    throw error;
  }
};
