// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrustToken.sol";

/// @title StakingContract
/// @notice Lets businesses stake TrustToken to gain visibility within the
/// platform instead of paying for advertising. Tokens can be slashed
/// (withdrawn/burned) from bad actors by the owner/PoR mechanism, and
/// businesses can unstake freely otherwise.
contract StakingContract is Ownable, ReentrancyGuard {
    TrustToken public immutable trustToken;

    /// @notice Minimum stake required for a business to be considered "visible".
    uint256 public minimumStake = 100 * 10 ** 18;

    mapping(address => uint256) public stakedBalance;

    event Staked(address indexed business, uint256 amount, uint256 newTotal);
    event Unstaked(address indexed business, uint256 amount, uint256 newTotal);
    event Slashed(address indexed business, uint256 amount, string reason);
    event MinimumStakeUpdated(uint256 newMinimum);

    constructor(address trustTokenAddress, address initialOwner) Ownable(initialOwner) {
        trustToken = TrustToken(trustTokenAddress);
    }

    /// @notice Stake tokens to gain/increase visibility. Caller must have
    /// approved this contract to spend `amount` beforehand.
    function stake(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingContract: amount must be > 0");

        // Effects before interaction to guard against re-entrancy.
        stakedBalance[msg.sender] += amount;

        bool success = trustToken.transferFrom(msg.sender, address(this), amount);
        require(success, "StakingContract: transferFrom failed");

        emit Staked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    /// @notice Withdraw staked tokens.
    function unstake(uint256 amount) external nonReentrant {
        require(amount > 0, "StakingContract: amount must be > 0");
        require(stakedBalance[msg.sender] >= amount, "StakingContract: insufficient stake");

        stakedBalance[msg.sender] -= amount;

        bool success = trustToken.transfer(msg.sender, amount);
        require(success, "StakingContract: transfer failed");

        emit Unstaked(msg.sender, amount, stakedBalance[msg.sender]);
    }

    /// @notice Penalize a business for manipulation/bad behavior by burning
    /// part of its stake. Intended to be called by the owner, or later by
    /// the PoR consensus contract once it exists (add as a controller then).
    function slash(address business, uint256 amount, string calldata reason) external onlyOwner {
        require(stakedBalance[business] >= amount, "StakingContract: insufficient stake to slash");

        stakedBalance[business] -= amount;
        trustToken.burnFrom(address(this), amount);

        emit Slashed(business, amount, reason);
    }

    function isVisible(address business) external view returns (bool) {
        return stakedBalance[business] >= minimumStake;
    }

    function setMinimumStake(uint256 newMinimum) external onlyOwner {
        minimumStake = newMinimum;
        emit MinimumStakeUpdated(newMinimum);
    }
}
