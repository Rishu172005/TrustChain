// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TrustToken.sol";

/// @title UserRegistry
/// @notice Registers users and records check-ins as hashes (not raw location
/// data), so a check-in can be proven and rewarded without exposing where
/// a user actually was. Rewards a fixed amount of TrustToken per check-in.
contract UserRegistry is Ownable {
    TrustToken public immutable trustToken;

    /// @notice Reward paid out per valid check-in.
    uint256 public checkInReward = 10 * 10 ** 18;

    struct CheckIn {
        bytes32 checkInHash; // hash of (userId, poiId, timestamp, salt) — computed off-chain
        uint256 timestamp;
    }

    mapping(address => bool) public isRegistered;
    mapping(address => CheckIn[]) private userCheckIns;
    mapping(bytes32 => bool) public usedHashes; // prevents replaying the same check-in

    event UserRegistered(address indexed user);
    event CheckedIn(address indexed user, bytes32 indexed checkInHash, uint256 timestamp);
    event CheckInRewardUpdated(uint256 newReward);

    modifier onlyRegistered() {
        require(isRegistered[msg.sender], "UserRegistry: not registered");
        _;
    }

    constructor(address trustTokenAddress, address initialOwner) Ownable(initialOwner) {
        trustToken = TrustToken(trustTokenAddress);
    }

    /// @notice Register the caller as a TrustChain user.
    function registerUser() external {
        require(!isRegistered[msg.sender], "UserRegistry: already registered");
        isRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender);
    }

    /// @notice Record a check-in via its hash and mint the reward.
    /// @param checkInHash keccak256 hash of the check-in details, computed off-chain
    /// so raw location/POI data never touches the chain.
    function checkIn(bytes32 checkInHash) external onlyRegistered {
        require(checkInHash != bytes32(0), "UserRegistry: invalid hash");
        require(!usedHashes[checkInHash], "UserRegistry: check-in already recorded");

        usedHashes[checkInHash] = true;
        userCheckIns[msg.sender].push(CheckIn(checkInHash, block.timestamp));

        trustToken.mint(msg.sender, checkInReward);

        emit CheckedIn(msg.sender, checkInHash, block.timestamp);
    }

    function getCheckInCount(address user) external view returns (uint256) {
        return userCheckIns[user].length;
    }

    function getCheckIn(address user, uint256 index) external view returns (bytes32, uint256) {
        CheckIn storage c = userCheckIns[user][index];
        return (c.checkInHash, c.timestamp);
    }

    function setCheckInReward(uint256 newReward) external onlyOwner {
        checkInReward = newReward;
        emit CheckInRewardUpdated(newReward);
    }
}
