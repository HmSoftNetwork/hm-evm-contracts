//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Allows anyone to claim a token if they exist in a merkle root.
interface IMerkleDistributor {
    struct AirdropDetail {
        uint256 claimedAmt;
        bool isBlocked;
        uint256 lastClaimedAt;
    }

    // Returns the address of the token distributed by this contract.
    function teaToken() external view returns (address);
    // Returns the merkle root of the merkle tree containing account balances available to claim.
    function merkleRoot() external view returns (bytes32);
    // Return customer`s Airdrop Details
    function airdropDetail(address _custAddr) external view returns (AirdropDetail memory);
    // Returns true if the index has been marked claimed.
    function checkAcct(address _custAddr) external view returns (bool);
    // Returns claimable amount of customer
    function getClaimableAmt(uint256 _index, address _custAddr, uint256 amountTree, bytes32[] calldata merkleProof) external view returns(uint256);
    // Decrease claimable amount
    function updateMerkleRoot(bytes32 _merkleRoot) external returns (bool);
    // Block customer
    function blacklist(address _custAddr) external returns (bool);
    // Unblock customer
    function whitelist(address _custAddr) external returns (bool);
    // Claim the given amount of the token to the given address. Reverts if the inputs are invalid.
    function claim(uint256 _index, uint256 amount, uint256 treeAmt, bytes32[] calldata merkleProof) external;
    // Claim the all claimable amount of the token to the given address
    function claimAll(uint256 _index, uint256 amountTree, bytes32[] calldata merkleProof) external;

    // This event is triggered whenever a call to #updateMerkleRoot succeeds.
    event UpdatedMerkleRoot(bytes32 _merkleRoot);
    // This event is triggered whenever a call to #whitelist succeeds.
    event Whitelisted(address account);
    // This event is triggered whenever a call to #blacklist succeeds.
    event Blacklisted(address account);
    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(uint256 index, address account, uint256 amount);
    // This event is triggered whenever a call to #claimAll succeeds.
    event ClaimedAll(uint256 index, address account, uint256 amount);
    // This event is triggered whenever a call to #withdrawToken succeeds.
    event WithdrewToken(uint256 amount);
}