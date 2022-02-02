# request-fiat-to-erc20-payment

A handler to pay your Request network invoices in cryptos. Only works in this way: FIAT ➡️ ERC20 (for now 😉).

## Installation

Install request-fiat-to-erc20-payment with npm into your project folder

```bash
  npm i request-fiat-to-erc20-payment
```

## Demo

<div style="text-align:center;">

![Usage demo](https://i.imgur.com/jME5F3s.gif)

</div>

## Documentation

You can use it in your front app simply implementing button with requestPayment() onClick.  
Here is an example of use in a React component (+ Tailwind CSS)

```js
import { requestPayment, hasAllowance, approveERC20Transactions } from 'request-fiat-to-erc20-payment';
import { useMetaMask } from 'metamask-react';

import { IRequestData } from '@requestnetwork/types/dist/client-types';

 /*
 ⚠️ The request object as IRequestData type come from https://api.request.network/invoices/{requestId}?withRequest=true

 Retrieve the response.request.request key
 */

interface IProps {
    request: IRequestData;
}

export default function Payment({ request }: IProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isContractApproved, setIsContractApproved] = useState(false);
    const [message, setMessage] = useState("");

    /*
    ⚠️ethereum variable represent window.ethereum when the metamask browser extension is installed
    See cool metamask-react library @ https://www.npmjs.com/package/metamask-react
    */
    const { ethereum } = useMetaMask();

    const checkIfContractIsApproved = async () => {
        try {
            setIsLoading(true);
            setIsContractApproved(await hasAllowance(request, ethereum));
            setMessage('Success checking allowance');
        } catch (error) {
            setMessage((error as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        checkIfContractIsApproved();
    }, [])

    if (isLoading) return <p>...Is Loading</p>

    if (!isContractApproved) return (
        <Button
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-sapphire hover:bg-indigo-dye focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            handleClick={async () => {
            try {
                setIsLoading(true);
                await approveERC20Transactions(
                request,
                ethereum
                );
                setMessage('Contract approved!');
            } catch (e) {
                setMessage((e as Error).message);
            } finally {
                setIsLoading(false);
                checkIfContractIsApproved();
            }
            }}
        >
            {"Approve contract"}
        </Button>
    );

    return (
        <Button
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-sapphire hover:bg-indigo-dye focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            handleClick={async () => {
            try {
                setIsLoading(true);
                await requestPayment(
                request,
                ethereum
                );
                setMessage('Payment done!');
            } catch (e) {
                setMessage((e as Error).message);
            } finally {
                setIsLoading(false);
            }
            }}
        >
            {"Pay with Metamask"}
        </Button>
    );
}

```
