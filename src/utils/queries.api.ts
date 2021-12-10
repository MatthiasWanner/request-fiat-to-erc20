import {
  IGetRate,
  IGetCurrenciesInfos,
  IGetOneCurrencyInfos
} from '@interfaces/';
import axios from 'axios';

export const cryptoCompare = {
  getRate: async (
    inputCurrency: string,
    outputCurrency: string
  ): Promise<IGetRate> =>
    (
      await axios.get(
        `https://min-api.cryptocompare.com/data/price?fsym=${inputCurrency}&tsyms=${outputCurrency}`
      )
    ).data
};

export const currencies = {
  getAll: async (): Promise<IGetCurrenciesInfos[]> =>
    (await axios.get('/currency')).data,

  /**
   *
   * @param param represent the currency id (eg: FAU - rinkeby) or the contract address (eg: 0x0f8d5b8c8b8b9f8f8c8b8b8b8b8b8b8b8b8b8b8b8b)
   * @returns infos about the currency and contains more infos about the contract like decimals and code to send to crypto compare
   */
  getOne: async (param: string): Promise<IGetOneCurrencyInfos> =>
    (await axios.get(`/currency/${param}`)).data
};
