// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title TrustToken
/// @notice ERC-20 reward token for the TrustChain ecosystem.
/// Minted for check-ins, reviews, and validated recommendations.
/// Burned as a penalty ("slashing") for flagged/malicious contributions.
contract TrustToken is ERC20, Ownable {
    /// @notice Addresses allowed to mint/burn (e.g. UserRegistry, PoR contract).
    /// Kept separate from `owner` so other TrustChain contracts can be
    /// authorized without transferring full ownership of the token.
    mapping(address => bool) public controllers;

    event ControllerUpdated(address indexed controller, bool allowed);

    modifier onlyController() {
        require(controllers[msg.sender], "TrustToken: caller is not a controller");
        _;
    }

    constructor(uint256 initialSupply, address initialOwner)
        ERC20("TrustToken", "TRUST")
        Ownable(initialOwner)
    {
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }

    /// @notice Grant or revoke minting/burning rights to another TrustChain contract.
    function setController(address controller, bool allowed) external onlyOwner {
        controllers[controller] = allowed;
        emit ControllerUpdated(controller, allowed);
    }

    /// @notice Mint tokens as a reward. Only callable by authorized controllers.
    function mint(address to, uint256 amount) external onlyController {
        _mint(to, amount);
    }

    /// @notice Burn tokens as a penalty. Only callable by authorized controllers.
    function burnFrom(address account, uint256 amount) external onlyController {
        _burn(account, amount);
    }
}
