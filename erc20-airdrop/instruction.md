# Instruction

## Objective
* Create a `ownable`, `pausable` __Merkle Airdrop__ smart contract.

## Features
* The Merkle root calculation is done externally using the airdrop addresses (publicly available) by forming a Merkle tree.
* Any user who wants to check or claim shall have to provide the proof array (can be calculated externally). Here, `msg.sender` & `proof` array shall be used to get "calculated Merkle root" (say M'). The calculated MR (M') is then checked with the stored one (M).
> NOTE: Here we use the advantage of Merkle tree, where we don't need the other addresses, but just "proof array" to check whether an address is claimer or not. <br/>
> "Proof array" is going to change for every address which is added into the Merkle tree. So, on the website, the _proof calculation_ feature is provided for user to calculate externally.

### Coding
* Data structure should include
	- merkle root
	- struct with Airdrop details for a claimer & its mapping
```c
struct AirdropDetails {
	tokenAmt
	is_whitelisted
	last_claim_timestamp
};

mapping(acct_address => AirdropDetails) claimers;
```
* The merkle root is changed only in these 2 scenarios:
	- if a new account (as whitelisted/blacklisted) is added into the Merkle Tree
	- if an existing is removed from the Merkle Tree
* The merkle root doesn't change when an existing account is blacklisted or whitelisted.
> The merkle root is always calculated externally using publicly available addresses on website & set during MA SC deployment.
* `addAcct()`: Admin add any account/address with qty into the Merkle Tree with following params:
	- input:
		+ _addr_: `address`
		+ _tokenAmt_: `uint256`
		+ _merkleRoot_: `bytes32`  This is to be calculated externally & fed here.
	- output:
		+ execution status: `true`/`false`
> Here, if the address is added first time, then the _tokenAmt_ is the set value, else if the address is already added, then _tokenAmt_ is the amount to be added to the claimable amount. E.g. if the address already has `20 TEA` tokens, & the _tokenAmt_ is `5 TEA`, then the total claimable amount should be `25 TEA` after the function execution.
* `remAcct()`: Admin remove an existing account/address from the Merkle Tree with following params:
	- input:
		+ _addr_ `address`
		+ _merkleRoot_: `bytes32`  This is to be calculated externally & fed here.
	- output:
		+ execution status: `true`/`false`
> NOTE: Here, if there is any claimable amount for the address (to be removed), it should be added back into the Token Owner's supply so that the amount doesn't go into waste.
* `decAmt()`: Admin reduce the amount by given qty & update the info in the Merkle Tree with following params:
	- input:
		+ _addr_ `address`
		+ _tokenAmt_ `uint256`
	- output:
		+ execution status: `true`/`false`
> In this, _tokenAmt_ is the amount by which the claimable amount is to be subtracted from. E.g. If the claimable amount for the address is `20 TEA`, in that case if _tokenAmt_ is `5 TEA`, then the final claimable amount after the function execution should be `15 TEA`.
* `blacklist()`: Admin blacklist an  existing address with claimable amount
	- input:
		+ _addr_ `address`
	- output:
		+ execution status: `true`/`false`
> Here, the address is not removed but revoked from claim activity, unlike in case of `remove()` function where the address is completely removed from the Merkle Tree & the claimable amount is transferred back to Token owner. In simple words, this is a temporary deactivation of an account.
* `whitelist()`: Admin whitelist a blacklisted address with preset claimable amount. Only the `is_whitelisted` set to true
	- input:
		+ _addr_ `address`
	- output:
		+ execution status: `true`/`false`
> Here, the address is added back into the Merkle tree unlike in case of `add()` function, where either the address with claimable qty is added or the claimable qty is updated into the Mekle Tree. In simple words, the given address gains the claimable access.
* `claim()`: Anyone can claim the amount. Here, `msg.sender` is used to fetch/verify the claimer address & check whether the address is a part of Merkle Tree & has given token amount to be claimed.
	- input:
		+ _proof: `bytes32[]` This can be calculated externally using latest merkle root (stored in SC) & publicly available addresses.
		+ _tokenAmt_ `uint256`
	- output:
		+ execution status: `true`/`false`
> Here, the claimer is not enforced to claim the entire amount, but preferred amount.
* `claimAll()`: Anyone can claim the amount. Here, `msg.sender` is used to fetch/verify the claimer address & check whether the address is a part of Merkle Tree & has token amount to be claimed.
> Here, the claimer is enforced to claim the entire amount.

#### Utility
##### Inside SC
* `checkAcct()`: Anyone can check the status of given address whether the address is an claimer or not. This is read only function.
	- input:
		+ _addr_ `address`
	- output:
		+ execution status: `true`/`false`

* `getClaimableAmt()`: If the given address is an claimer by checking whether it is a part of Merkle Tree, then show the claimable amount. This is read only function. Anyone can check for another address
	- input:
		+ _addr_: `address`
	- output:
		+ _claimableAmt_: `uint256`

##### Outside SC
* Here, the addresses list is always maintained on the website (fetched from cloud DB)
* `calculateMR()`: Anyone can calculate the MR for given set of addresses
    - input:
		+ _addrs_: `address[]`
    - output:
		+ _merkleRoot_: `bytes32`
* `extractProof()`: Anyone can get their proofs using which they shall be able to get their claimable token.
    - input:
		+ _addr_: `address` the address for which the proofs has to be extracted
		+ _addrs_: `address[]` publicly available on the website (fetched from cloud DB)
    - output:
		+ _proofs_: `bytes32[]`

## Unit Testing
* "FT Merkle Airdrop SC"
	1. "Add account"
		- [ ] "Succeeds when admin add valid address and non-zero claimable amount"
  			+ [ ] "Verify that the token owner balance is decreased by the non-zero claimable amount"
  			+ [ ] "Verify that the root hash is changed"
  			+ [ ] "Verify that the account is whitelisted"
		- [ ] "Fails when non-admin add valid address and non-zero claimable amount"
		- [ ] "Fails when admin add a valid address with zero claimable amount"
		- [ ] "Fails when admin add a zero address with non-zero claimable amount"
		
	1. "Remove account"
		- [ ] "Succeeds when admin remove an existing address with zero claimable amount"
			+ [ ] "Verify that the root hash is changed"
		- [ ] "Succeeds when admin remove an existing address with non-zero claimable amount"
			+ [ ] "Verify that the token owner balance is increased by the non-zero claimable amount"
			+ [ ] "Verify that the root hash is changed"
		- [ ] "Fail when non-admin remove an existing address with zero claimable amount"
		- [ ] "Fails when non-admin remove an existing address with non-zero claimable amount"
		- [ ] "Fails when admin remove a non-existing address"
		- [ ] "Fails when admin remove a zero address"
	
	1. "Decrease amount"
		- [ ] "Succeeds when admin decrease claimable amount of an existing address by a quantity less than the claimable"
			+ [ ] "Verify that the subtractable amount must be less than or equal to claimable amount"
		- [ ] "Fails when non-admin decrease claimable amount of an existing address by a quantity less than the claimable"
		- [ ] "Fails when admin decrease claimable amount by zero qty for an existing address"
		- [ ] "Fails when admin decrease of a non-existing address"
		- [ ] "Fails when admin decrease of a zero address"
	
	1. "Blacklist"
		- [ ] "Succeeds when admin blacklist an existing whitelisted address"
			+ [ ] "Verify that the root hash is not changed"
			+ [ ] "Verify that the account is blacklisted"
		- [ ] "Fails when non-admin blacklist an existing whitelisted address"
		- [ ] "Fails when admin blacklist an existing blacklisted address"
		- [ ] "Fails when admin blacklist a non-existing address"

	1. "Whitelist"
		- [ ] "Succeeds when admin whitelist an existing blacklisted address"
			+ [ ] "Verify that the root hash is not changed"
			+ [ ] "Verify that the account is whitelisted"
		- [ ] "Fails when non-admin whitelist an existing blacklisted address"
		- [ ] "Fails when admin whitelist an existing whitelisted address"
		- [ ] "Fails when admin whitelist a non-existing address"

	1. "Claim"
		- [ ] "Succeeds when the claimer is whitelisted & requests less than or equal to claimable amount"
		- [ ] "Fails when the claimer is whitelisted & requests more than claimable amount"
		- [ ] "Fails when the claimer account is blacklisted"
		- [ ] "Fails when token amount is zero"

	1. "ClaimAll"
		- [ ] "Succeeds when the claimer is whitelisted & requests less than or equal to claimable amount"
		- [ ] "Fails when the claimer is whitelisted & requests more than claimable amount"
		- [ ] "Fails when the claimer account is blacklisted"
	
	1. "Check Claimer"
		- [ ] "Should return true/false when valid address is parsed"
		- [ ] "Should revert when zero address is parsed"
	
	1. "Get claimable amount"
		- [ ] "Should return amount when an existing whitelisted address is parsed"
		- [ ] "Should return zero when an existing blacklisted address is parsed"
		- [ ] "Should revert when a non-existing address is parsed"


## Dependencies
* OpenZeppelin

## Testing framework
* Hardhat using Typescript language.

## Networks
* localhost
* Testnet
		- Rinkeby
		- Kovan
		- Avalanche
* Mainnet
		- Ethereum
		- Avalanche


## Glossary
* SC: Smart Contract
* FT: Fungible Token
* MA: Merkle Airdrop
