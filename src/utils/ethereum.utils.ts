import { EthereumNetwork } from '../../types';

const networks = {
  matic: {
    chainId: '0x89',
    rpcUrl: 'https://polygon-rpc.com/'
  },
  rinkeby: {
    chainId: '0x4',
    rpcUrl: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'
  }
};

/**
 * @param network represent the network name (e.g. 'rinkeby')
 * @param ethereum represent the window.ethereum object
 * @returns void ethereum method to switch network
 */
export const checkConnectedNetwork = async (network: string, ethereum: any) => {
  if (!Object.keys(networks).includes(network.toLowerCase()))
    throw new Error(`Network ${network} not supported`);

  const { chainId, rpcUrl } = networks[network as EthereumNetwork];

  if (ethereum.chainId === chainId) return;

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
