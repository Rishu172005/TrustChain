// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal stand-in for the real TrustToken contract (Task 2, S1), used only
///         so ProofOfRecommendation can be built and tested in isolation, per the
///         "each core component individually testable" goal. Mirrors the real
///         contract's controller-gated mint/burn pattern.
contract MockTrustToken is ERC20, Ownable {
    mapping(address => bool) public controllers;

    modifier onlyController() {
        require(controllers[msg.sender], "MockTrustToken: caller is not a controller");
        _;
    }

    constructor() ERC20("TrustToken", "TRUST") Ownable(msg.sender) {}

    function addController(address controller) external onlyOwner {
        controllers[controller] = true;
    }

    function removeController(address controller) external onlyOwner {
        controllers[controller] = false;
    }

    function mint(address to, uint256 amount) external onlyController {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyController {
        _burn(from, amount);
    }
}
