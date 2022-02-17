import { EthereumNetwork, IWindowEthereum } from '../../types';

const networks = {
  matic: {
    chainId: '0x89',
    rpcUrl: 'https://polygon-rpc.com/'
  },
  rinkeby: {
    chainId: '0x4',
    rpcUrl: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  mainnet: {
    chainId: '0x1',
    rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  },
  fantom: {
    chainId: '0xfa',
    rpcUrl: 'https://rpc.ftm.tools'
  },
  bsc: {
    chainId: '0x38',
    rpcUrl: 'https://bsc-dataseed.binance.org'
  },
  xdai: {
    chainId: '0x64',
    rpcUrl: 'https://rpc.xdaichain.com'
  }
};

/**
 * @param network represent the network name (e.g. 'rinkeby')
 * @param ethereum represent the window.ethereum object
 * @returns void ethereum method to switch network
 */
export const checkConnectedNetwork = async (
  network: string,
  ethereum: IWindowEthereum
) => {
  if (!Object.keys(networks).includes(network.toLowerCase()))
    throw new Error(`Network ${network} not supported`);

  if (!ethereum.request)
    throw new Error('No window.ethereum.request method provided');

  const { chainId, rpcUrl } = networks[network as EthereumNetwork];

  const currentChainId = await ethereum.request({ method: 'eth_chainId' });

  if (currentChainId === chainId) return;

  try {
    // check if the chain to connect to is installed
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId }] // chainId must be in hexadecimal numbers
    });
  } catch (error) {
    // This error code indicates that the chain has not been added to MetaMask
    // if it is not, then install it into the user MetaMask
    if ((error as any).code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId,
              rpcUrl
            }
          ]
        });
      } catch (addError) {
        throw new Error(
          `Please manually install the ${network} network into MetaMask`
        );
      }
    }
    throw new Error(`Error connecting to ${network} network`);
  }
};

export const getWalletAddress = async (
  ethereum: IWindowEthereum
): Promise<string[]> => {
  if (!ethereum.request)
    throw new Error('No window.ethereum.request method provided');

  return await ethereum.request({ method: 'eth_accounts' });
};
