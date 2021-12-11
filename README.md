# request-fiat-to-erc20-payment

A handler to pay your Request network invoices in cryptos. Only works in this way: FIAT ➡️ ERC20 (for now 😉).

## Installation (not published yet)

Install request-fiat-to-erc20-payment with npm into your project folder

```bash
  npm install request-fiat-to-erc20-payment
```

## Demo

Insert gif or link to demo

## Documentation

You can use it in your front app simply implementing button with payRequest() onClick:

```js
import { requestPayment } from 'request-fiat-to-erc20-payment';
import { useMetaMask } from 'metamask-react';

import { IRequestData } from '@requestnetwork/types/dist/client-types';

interface IProps {
    reqsuest: IRequestData;
}

export default function Payment({request}: IProps) {
    const [isPaying, setIsPaying] = useState(false);
    const [message, setMessage] = useState("");

    const { ethereum } = useMetaMask();

    return (
        <Button
            className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-sapphire hover:bg-indigo-dye focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-900"
            handleClick={async () => {
            try {
                setIsPaying(true);
                await requestPayment(
                request,
                ethereum
                );
                setMessage('Payment done!');
                setIsPaying(false);
            } catch (e) {
                setIsPaying(false);
                setMessage((e as Error).message)
            }
            }}
        >
            {"Pay with Metamask"}
        </Button>
    )
}

```
