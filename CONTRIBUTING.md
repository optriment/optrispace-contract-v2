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
