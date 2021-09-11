import { useCallback, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers'; 

import './App.css';

import CONTRACT_ABI from './abi.json';
const CONTRACT_ADDRESS = "0xc1a57Ad587289415fdb22F7C5b2E76ccb6119Ff0";
const CHAINID = 69420;

enum State {
    Connecting,
    InjectionNotFound,
    WrongChainId,
    AccountRequestRejected,
    Connected,
    Error,
}

interface Message {
    txhash: string,
    address: string,
    content: string,
}

let provider: ethers.providers.JsonRpcProvider | undefined = undefined;
let signer: ethers.Signer | undefined = undefined;
let contract: ethers.Contract | undefined = undefined;
let messages: Message[] = [];

const App = () => {
    const [state, setState] = useState(State.Connecting);
    // eslint-disable-next-line
    const [stateMessages, setStateMessages] = useState<Message[]>([]);
    const [names, setNames] = useState<Map<string, string | null>>(new Map());

    const [textbox, setTextbox] = useState("");
    const [pending, setPending] = useState(false);
    
    const messageList = useRef(null);

    function scrollDown() {
        if (messageList.current != null) {
            (messageList.current as any).scrollTop = (messageList.current as any).scrollHeight;
        }
    }

    function isScrolledDown(): boolean {
        if (messageList.current === null) return false;
        let scrollTop = (messageList.current as any).scrollTop;
        let offsetHeight = (messageList.current as any).offsetHeight;
        let scrollHeight = (messageList.current as any).scrollHeight;
        return  scrollTop + offsetHeight === scrollHeight;
    }

    useEffect(() => {
        if ((window as any).ethereum === undefined) {
            setState(State.InjectionNotFound);
            return;
        }

        provider = new ethers.providers.Web3Provider((window as any).ethereum)

        provider.send("eth_requestAccounts", []).then(async () => {
            if (provider === undefined) return;
            let network = await provider.getNetwork();
            if (network.chainId !== CHAINID) {
                setState(State.WrongChainId);
                return;
            }

            signer = provider.getSigner();
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            let pastMessages = await contract.queryFilter(contract.filters.Message());
            let messagesCloned = [...messages];
            for (let message of pastMessages) {
                let args = message.args as any;
                messagesCloned.push({
                    txhash: message.transactionHash,
                    address: args[0],
                    content: args[1],
                });
            }

            messages = messagesCloned;
            setStateMessages(messages);
            contract.on("Message", (address, content, event) => {
                let checkingMessages = messages.slice(-16);
                for (let message of checkingMessages) {
                    if (message.txhash === event.transactionHash) return;
                }

                let message: Message = {
                    address, content,
                    txhash: event.transactionHash,
                }
                let scrolledDown = isScrolledDown();
                messages = [...messages, message];
                setStateMessages(messages);
                if (scrolledDown) scrollDown();
            });

            contract.on("NameChanged", async (address) => {
                if (contract === undefined) return;
                let name = await contract.names(address);
                setNames(new Map(names.set(address, name)));
            });
            setState(State.Connected);
            scrollDown();
        }).catch(() => setState(State.AccountRequestRejected));
    }, []);

    const textInput = useCallback((event) => {
        if (pending === true) return;
        setTextbox(event.target.value);
    }, []);

    const sendMessage = useCallback((event) => {
        event.preventDefault();
        if (pending) return;
        if (textbox.length > 512) {
            alert("your message's over 512 characters retard");
            return;
        }

        if (signer === undefined || contract === undefined) {
            setState(State.Error);
            return;
        }

        let content = textbox;
        setTextbox("");
        setPending(true);
        contract.send(content).catch((err: any) => {
            console.error(err);
        }).finally(() => {
            setPending(false);
        });
    }, [pending, textbox]);

    let message: String | undefined = undefined;
    let setup = false;
    switch (state) {
        case State.Connecting:
            message = "connecting";
            break;
        case State.InjectionNotFound:
            message = "wallet not found - make sure youre running metamask or a similar wallet injecting window.ethereum";
            setup = true;
            break;
        case State.WrongChainId:
            message = "why are you not using the superior meth chain retard";
            setup = true;
            break;
        case State.AccountRequestRejected:
            message = "why would you do that";
            break;
        case State.Error:
            message = "how did you manage to break my code so fucking hard?????";
            break;
    }

    if (!message) {
        return (
            <div className="App">
                <div className="Chat-Content" ref={messageList}>
                    <ul>
                        <li key="start"><b><i>welcome to the start of the conversation</i></b></li>
                        {messages.map((message) => (
                            <li key={message.txhash}>
                                <b>{message.address}: </b><span>{message.content}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <br />
                <div className="Input-Box">
                    <form onSubmit={sendMessage}>
                        <input type="text" onChange={textInput} value={textbox} placeholder={pending ? "pending transaction" : ""} style={{ marginLeft: "5px", width: "calc(100% - 75px)", boxSizing: "border-box" }} />
                        <input type="submit" style={{ marginLeft: "5px" }} />
                    </form>
                </div>
            </div>
        );
    } else {
        return (
            <div className="App">
                <h1>{message}</h1>
                { setup && (
                    <h3>Need to prepare your wallet for use with the Methereum network? Follow <a href="https://gist.github.com/fatalerrorcoded/f39487080af5a5b2508a9bb53181d770#setting-up-rpc-in-a-wallet">this gist</a></h3>
                )}
            </div>
        )
    }
}

export default App;
