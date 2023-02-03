# Contributing to OptriSpace Smart Contracts

[![Tests](https://github.com/optriment/optrispace-contract-v2/actions/workflows/tests.yml/badge.svg)](https://github.com/optriment/optrispace-contract-v2/actions/workflows/tests.yml)
[![Lint](https://github.com/optriment/optrispace-contract-v2/actions/workflows/lint.yml/badge.svg)](https://github.com/optriment/optrispace-contract-v2/actions/workflows/lint.yml)
[![Slither](https://github.com/optriment/optrispace-contract-v2/actions/workflows/slither.yml/badge.svg)](https://github.com/optriment/optrispace-contract-v2/actions/workflows/slither.yml)
[![Spell](https://github.com/optriment/optrispace-contract-v2/actions/workflows/spell.yml/badge.svg)](https://github.com/optriment/optrispace-contract-v2/actions/workflows/spell.yml)

The development branch is `master`.\
This is the default branch that all Pull Requests (PR) should be made against.

Requirements:

- [Node.js](https://nodejs.org/en/) version 16 or 17
- [Foundry](https://getfoundry.sh)
- [Slither](https://github.com/crytic/slither)

## Developing locally

Please follow instructions below to install Smart Contracts locally.

1. [Fork](https://help.github.com/articles/fork-a-repo/)
   this repository to your own GitHub account

2. [Clone](https://help.github.com/articles/cloning-a-repository/)
   it to your local device

3. Update submodules:

   ```sh
   git submodule update --init --recursive
   ```

4. Create a new branch:

   ```sh
   git checkout -b YOUR_BRANCH_NAME
   ```

5. Install the dependencies with:

   ```sh
   make setup
   ```

6. Copy the environment variables:

   ```sh
   cp .env.example .env
   ```

## Running tests

```sh
make test
```

## Linting

To check the formatting of your code:

```sh
make lint
```

If you get errors, you can fix them with:

```sh
make fix
```

## 1. Connecting Metamask with a Local Hardhat Network

**1 Install Hardhdat**

```
mkdir Metamask
cd Metamask
npm install --save-dev hardhat
```

**1.1 Select Create a JavaScript project and continuously select enter for the upcoming questions**

**2 Run Hardhat network with `npx hardhat node` . You will get the RPC endpoint as well as a list of locally generated accounts.**

**3 Add Local Network to Metamask. With our local Hardhat network running, we can then configure our MetaMask to connect to it.**

**3.1 In the browser with MetaMask, select the network dropdown**

**3.2 The fastest way is to select Localhost 8545. If you don't have it, you'll need to configure it manually.**

**3.3 Manual configuration:**

**Network name:** Hardhat

**New RPC URL:** http://127.0.0.1:8545/

**Chain ID:** 31337

**Currency Symbol:** HardhatETH

**3.4 Click Save**

# 2.Import Test Accounts

When you started your local node with `npx hardhat node`, it generated some testing accounts with private keys, right?
Now you will have to import one of the private keys from generated accounts to your MetaMask Hardhat Network.

**1. On your browser with MetaMask, select the accounts tab (colourful circle on the top right corner)**

**2. Click on _Import Account_ and paste the private key from one of the accounts**

**3. Click Import**

# 3. Almost there...

On your localhost running Optrispace frontend repo, you may experience an error "Invalid Settings Detected! Error description: Unable to get contract version."
This means that the contracts are not deployed yet.

**1. Inside the .env.local file, fill in the MNEMONIC variable. You can generate a 12 random words https://randomwordgenerator.com/ and paste one by one, separed by a space.**

**2. Inside this repository create a "tmp" folder with `mkdir tmp`**

**3. Run `make run_node`**

**4. Open a new terminal**

**5. Run `./scripts/deploy-all.sh localhost`**

**6. Copy the last two lines from the output **OPTRISPACE_CONTRACT_ADDRESS** and **FRONTEND_NODE_ADDRESS\*\*\*\*

**7. Paste them in .env.local file inside the front end repository (optrispace-frontend-v2)**

**8. Re-run the frontend application with ```make run_node````**

# 4. You are good to go!

Open the http://localhost:3000 app and if any troubles occur, do hard refresh and try cleaning the cache.
