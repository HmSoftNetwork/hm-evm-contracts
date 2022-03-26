//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interfaces/IMerkleDistributor.sol";

library SafeMath {
    function add(uint256 a, uint256 b) internal pure returns (uint256 c) {
        c = a + b;
        assert(c >= a);
        return c;
    }

    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        assert(b <= a);
        return a - b;
    }
}

contract TEAMerkleDistributor is Ownable, Pausable, IMerkleDistributor {
    using SafeMath for uint256;

    address public immutable override teaToken;
    bytes32 public override merkleRoot;

    // This is a array of claimed Amt.
    mapping(address => AirdropDetail) private nodeMap;

    constructor(address _token, bytes32 _merkleRoot) {
        teaToken = _token;
        merkleRoot = _merkleRoot;
    }

    function airdropDetail(address _custAddr) external view override returns (AirdropDetail memory) {
        return nodeMap[_custAddr];
    }

    /// @dev Anyone can check the status of given address whether the address is an claimer or not.
    function checkAcct(address _custAddr) public view override returns (bool) {
        require(_custAddr != address(0), 'TEAMerkleDistributor: Invalid address');
        return !nodeMap[_custAddr].isBlocked;
    }

    function getClaimableAmt(uint256 _index, address _custAddr, uint256 amountTree, bytes32[] calldata merkleProof) public view override returns (uint256) {
        bytes32 node = keccak256(abi.encodePacked(_index, _custAddr, amountTree));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), 'TEAMerkleDistributor: Invalid proof');

        if(nodeMap[_custAddr].isBlocked) {
            return 0;
        }
        return amountTree.sub(nodeMap[_custAddr].claimedAmt);
    }

    /// @dev Admin should update merkle root when adding/removing account.
    function updateMerkleRoot(bytes32 _merkleRoot) external override onlyOwner returns (bool) {
        merkleRoot = _merkleRoot;

        emit UpdatedMerkleRoot(_merkleRoot);
        return true;
    }

    /// @dev Admin blacklist an existing address with claimable amount
    function blacklist(address _custAddr) external override onlyOwner returns (bool) {
        require(!nodeMap[_custAddr].isBlocked, 'TEAMerkleDistributor: Already blocked');

        nodeMap[_custAddr].isBlocked = true;
        emit Blacklisted(_custAddr);
        return true;
    }

    /// @dev Admin whitelist a blacklisted address with preset claimable amount
    function whitelist(address _custAddr) external override onlyOwner returns (bool) {
        require(nodeMap[_custAddr].isBlocked, 'TEAMerkleDistributor: Not blocked');

        nodeMap[_custAddr].isBlocked = false;
        emit Whitelisted(_custAddr);
        return true;
    }

    /// @dev Set claimed amount on map data
    function _setClaimed(address _custAddr, uint256 amount) private {
        AirdropDetail storage ad = nodeMap[_custAddr];
        require(!ad.isBlocked, 'TEAMerkleDistributor: Blocked customer');

        ad.claimedAmt = ad.claimedAmt.add(amount);
        ad.lastClaimedAt = block.timestamp;
    }

    /// @dev claim the special amount of token
    function claim(uint256 _index, uint256 amount, uint256 amountTree, bytes32[] calldata merkleProof) external override {
        require(checkAcct(msg.sender), 'TEAMerkleDistributor: Blocked account');
        // Check claimable amount
        require(getClaimableAmt(_index, msg.sender, amountTree, merkleProof) >= amount, 'TEAMerkleDistributor: Invalid amount');

        // Mark it claimed and send the teaToken.
        _setClaimed(msg.sender, amount);
        require(IERC20(teaToken).transfer(msg.sender, amount), 'TEAMerkleDistributor: Transfer failed');

        emit Claimed(_index, msg.sender, amount);
    }

    /// @dev claim all amount
    function claimAll(uint256 _index, uint256 amountTree, bytes32[] calldata merkleProof) external override {
        require(checkAcct(msg.sender), 'TEAMerkleDistributor: Blocked account');
        // Check claimable amount
        uint256 claimableAmt = getClaimableAmt(_index, msg.sender, amountTree, merkleProof);
        require(claimableAmt > 0, 'TEAMerkleDistributor: Drop already claimed.');

        // Mark it claimed and send the teaToken.
        _setClaimed(msg.sender, claimableAmt);
        require(IERC20(teaToken).transfer(msg.sender, claimableAmt), 'TEAMerkleDistributor: Transfer failed');

        emit ClaimedAll(_index, msg.sender, claimableAmt);
    }

    /// @dev withdraw token by owner
    function withdrawToken(uint256 _amount) external onlyOwner {
        require(IERC20(teaToken).transfer(msg.sender, _amount), 'TEAMerkleDistributor: Transfer failed');

        emit WithdrewToken(_amount);
    }

    /**
  * ****************************************
  *
  * Implemented from Pausable
  * ****************************************
  */

    /// @notice Pause contract
    function pause() public onlyOwner whenNotPaused {
        _pause();
    }

    /// @notice Unpause contract
    function unpause() public onlyOwner whenPaused {
        _unpause();
    }
}
