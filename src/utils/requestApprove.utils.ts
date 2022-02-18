import {
  approveErc20,
  approveErc20ForProxyConversion,
  checkErc20Allowance,
  hasErc20Approval,
  utils as paymentUtils
} from '@requestnetwork/payment-processor';
import { AnyToERC20PaymentDetector } from '@requestnetwork/payment-detection';
import { IRequestData } from '@requestnetwork/types/dist/client-types';
import { ExtensionTypes } from '@requestnetwork/types';
import { IWindowEthereum } from '../../types';
import { checkConnectedNetwork, getWalletAddress } from './ethereum.utils';
import { providers } from 'ethers';
import {
  calculateMaxToSpend,
  getCurrencyInfos,
  prepareCalculateMaxToSpendArgs
} from './prepareRequest.utils';
import { getPaymentNetwork, getRequestFees } from '.';

export const hasAllowance = async (
  request: IRequestData,
  ethereum: IWindowEthereum,
  paymentCurrency: string
) => {
  const paymentNetwork = getPaymentNetwork(request);

  if (
    paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ETH_PROXY ||
    paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ETH_INPUT_DATA
  ) {
    return true;
  }

  const paymentCurrencyInfos = await getCurrencyInfos(paymentCurrency);

  const { currencyInfos } = paymentCurrencyInfos;

  if (!currencyInfos.network) throw new Error('Currency network not provided');

  await checkConnectedNetwork(currencyInfos.network, ethereum);

  const provider = new providers.Web3Provider(ethereum);

  const [walletAddress] = await getWalletAddress(ethereum);

  if (paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY) {
    const proxyAddress = paymentUtils.getProxyAddress(
      request,
      AnyToERC20PaymentDetector.getDeploymentInformation
    );

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

    return await checkErc20Allowance(
      walletAddress,
      proxyAddress,
      provider,
      currencyInfos.value.toLowerCase(),
      maxToSpend
    );
  } else {
    return await hasErc20Approval(request, walletAddress, provider);
  }
};

export const approveERC20Transactions = async (
  request: IRequestData,
  ethereum: IWindowEthereum,
  paymentCurrency: string
) => {
  const provider = new providers.Web3Provider(ethereum);

  const paymentNetwork = getPaymentNetwork(request);

  if (paymentNetwork === ExtensionTypes.ID.PAYMENT_NETWORK_ANY_TO_ERC20_PROXY) {
    const { currencyInfos } = await getCurrencyInfos(paymentCurrency);

    if (!currencyInfos.network) throw new Error('No network infos provided');

    await checkConnectedNetwork(currencyInfos.network, ethereum);

    const tx = await approveErc20ForProxyConversion(
      request,
      currencyInfos.value.toLowerCase(),
      provider
    );

    await tx.wait(1);
  } else {
    const approvalTx = await approveErc20(request, provider);

    await approvalTx.wait(1);
  }
};
