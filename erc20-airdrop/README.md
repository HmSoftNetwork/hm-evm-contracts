# Fungible Token Merkle Airdrop SC
Merkle Airdrop smart contract for Fungible token

## About
* It's a ERC20 token airdrop contract based on merkle tree algorithm.
* For more, refer [Wiki](./docs/wiki).

## Installation
```shell
yarn install
```

## Usage

### Build
```shell
yarn compile
```

### Test
```shell
yarn test
```

### Construct Merkle Tree

#### Generate Merkle Tree
```shell
yarn generate-merkle-tree
```
#### Verify Merkle Tree
```shell
yarn verify-merkle-tree
```

### Deploying contracts to Testnet (Public)

#### Testnet
* Environment variables
    - Create a `.env` file with its values:
```
INFURA_API_KEY=[YOUR_INFURA_API_KEY_HERE]
DEPLOYER_PRIVATE_KEY=[YOUR_DEPLOYER_PRIVATE_KEY_without_0x]
REPORT_GAS=<true_or_false>
```

* Deploy the contract
```shell
yarn hardhat deployMA --network <NETWORK_NAME> --tokenaddr <TOKEN_ADDRESS> --merkleroot <MERKLE_ROOT>
```

### Deploying contracts to Mainnet
#### Mainnet
* Environment variables
    - Create a `.env` file with its values:
```
INFURA_API_KEY=[YOUR_INFURA_API_KEY_HERE]
DEPLOYER_PRIVATE_KEY=[YOUR_DEPLOYER_PRIVATE_KEY_without_0x]
REPORT_GAS=<true_or_false>
```

* Deploy the contract
```shell
yarn hardhat deployMA --network <NETWORK_NAME> --tokenaddr <TOKEN_ADDRESS> --merkleroot <MERKLE_ROOT>
```

# Etherscan verification
* Environment variables
    - Set etherscan api key in `.env` file:
```
ETHERSCAN_API_KEY=[YOUR_ETHERSCAN_API_KEY]
```

```shell
yarn hardhat verify --network <NETWORK_NAME> <DEPLOYED_CONTRACT_ADDRESS> <TOKEN_ADDRESS> <MERKLE_ROOT>
```
