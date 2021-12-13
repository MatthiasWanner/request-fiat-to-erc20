import { providers } from 'ethers';

declare module 'request-fiat-to-erc20-payment';

/* Crypto compare api interfaces */

/**
 * Crypto compare API interface
 * The key depends on the tsyms query params.
 * EX: { DAI: 0.00, BTC: 0.00, ETH: 0.00, LTC: 0.00, ... }
 */
// TODO : Dynamic type response axios.data = {[key: output argument as string]: number}
export interface IGetRate {
  [key: string]: number;
}

/* Request api interfaces */

export interface IGetCurrenciesInfos {
  id: string;
  name: string;
  symbol: string;
  hash: string;
  address: string;
  decimals: number;
  type: string;
  code: string;
  network: string;
}

export interface IExchangeInfos {
  cryptocompare: {
    code: string;
  };
}

export interface ICurrencyInfosMeta {
  peg: string;
  reference?: Omit<IGetCurrenciesInfos, 'name' | 'code'>;
  exchangeInfo: IExchangeInfos;
}

export interface IGetOneCurrencyInfos extends IGetCurrenciesInfos {
  metadata: ICurrencyInfosMeta;
  exchangeInfo: IExchangeInfos;
}

/* window.ethereum manual type */

export interface IWindowEthereum extends providers.ExternalProvider {
  //  ...someOtherProperties;
  selectedAddress: string;
  chainId: string;
  isMetamask: boolean;
  networkVersion: string;
}

/* Ethereum utils */

export enum EthereumNetwork {
  MATIC = 'matic',
  RINKEBY = 'rinkeby'
}
