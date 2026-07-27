// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @dev Minimal interface into TrustToken. Assumes TrustToken restricts mint/burn
///      to authorized "controller" contracts (per the Task 2 S1 design) and that
///      this PoR contract will be added as a controller after deployment.
interface ITrustToken {
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
}

/// @title ProofOfRecommendation (PoR)
/// @notice Implements the novel PoR consensus mechanism described in the project brief:
///         a recommendation is submitted -> registered validators vote -> once enough
///         approvals are reached the submitter is rewarded in TrustToken and the
///         recommendation is logged on-chain as accepted. If a recommendation is
///         flagged by 3+ validators, the submitter is penalized (slashed).
contract ProofOfRecommendation is Ownable, ReentrancyGuard {
    ITrustToken public immutable trustToken;

    /// @notice Number of validator approvals required for a recommendation to be accepted.
    uint256 public requiredApprovals = 3;

    /// @notice Number of validator flags required for a recommendation to be penalized.
    uint256 public flagThreshold = 3;

    /// @notice TRUST tokens minted to the submitter of an accepted recommendation.
    uint256 public rewardAmount = 10 ether; // 10 TRUST (18 decimals)

    /// @notice TRUST tokens burned from the submitter of a flagged recommendation.
    uint256 public penaltyAmount = 5 ether; // 5 TRUST (18 decimals)

    enum Status { Pending, Approved, Flagged }

    struct Recommendation {
        address submitter;
        bytes32 contentHash; // keccak256 hash of the off-chain recommendation content
        Status status;
        uint256 approvals;
        uint256 flags;
        uint256 submittedAt;
    }

    mapping(uint256 => Recommendation) public recommendations;
    uint256 public nextRecommendationId;

    mapping(address => bool) public isValidator;
    address[] public validators;

    // recommendationId => validator => already voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ValidatorAdded(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event RecommendationSubmitted(uint256 indexed id, address indexed submitter, bytes32 contentHash, uint256 timestamp);
    event VoteCast(uint256 indexed id, address indexed validator, bool approve, bool flag);
    event RecommendationApproved(uint256 indexed id, address indexed submitter, uint256 reward);
    event RecommendationFlagged(uint256 indexed id, address indexed submitter, uint256 penaltyAttempted, bool penaltyApplied);

    modifier onlyValidator() {
        require(isValidator[msg.sender], "PoR: caller is not a validator");
        _;
    }

    constructor(address _trustToken) Ownable(msg.sender) {
        require(_trustToken != address(0), "PoR: zero token address");
        trustToken = ITrustToken(_trustToken);
    }

    // ---------------------------------------------------------------------
    // Validator management (owner-managed for the MVP / internship scope;
    // a production version could make this permissionless with staking).
    // ---------------------------------------------------------------------

    function addValidator(address validator) external onlyOwner {
        require(validator != address(0), "PoR: zero address");
        require(!isValidator[validator], "PoR: already a validator");
        isValidator[validator] = true;
        validators.push(validator);
        emit ValidatorAdded(validator);
    }

    function removeValidator(address validator) external onlyOwner {
        require(isValidator[validator], "PoR: not a validator");
        isValidator[validator] = false;
        uint256 len = validators.length;
        for (uint256 i = 0; i < len; i++) {
            if (validators[i] == validator) {
                validators[i] = validators[len - 1];
                validators.pop();
                break;
            }
        }
        emit ValidatorRemoved(validator);
    }

    function validatorCount() external view returns (uint256) {
        return validators.length;
    }

    // ---------------------------------------------------------------------
    // Recommendation lifecycle
    // ---------------------------------------------------------------------

    /// @notice Submit a recommendation for community validation.
    /// @param contentHash keccak256 hash of the off-chain recommendation payload
    ///        (POI id, review text, etc.) — raw content never touches the chain.
    function submitRecommendation(bytes32 contentHash) external returns (uint256 id) {
        require(contentHash != bytes32(0), "PoR: empty content hash");
        id = nextRecommendationId++;
        recommendations[id] = Recommendation({
            submitter: msg.sender,
            contentHash: contentHash,
            status: Status.Pending,
            approvals: 0,
            flags: 0,
            submittedAt: block.timestamp
        });
        emit RecommendationSubmitted(id, msg.sender, contentHash, block.timestamp);
    }

    /// @notice Validators vote on a pending recommendation.
    /// @param approve true = validator judges the recommendation to be genuine/quality
    /// @param flag true = validator judges the recommendation to be fake/abusive.
    ///        approve and flag are independent so a validator can (rarely) do neither,
    ///        e.g. an explicit "abstain" style vote that still consumes their one vote.
    function vote(uint256 id, bool approve, bool flag) external onlyValidator nonReentrant {
        Recommendation storage rec = recommendations[id];
        require(rec.submitter != address(0), "PoR: recommendation does not exist");
        require(rec.status == Status.Pending, "PoR: recommendation already finalized");
        require(!hasVoted[id][msg.sender], "PoR: validator already voted");

        hasVoted[id][msg.sender] = true;

        if (approve) rec.approvals += 1;
        if (flag) rec.flags += 1;

        emit VoteCast(id, msg.sender, approve, flag);

        // Flags are checked first: a recommendation that racks up abuse flags should
        // not also be eligible for a reward in the same voting round.
        if (rec.flags >= flagThreshold) {
            rec.status = Status.Flagged;
            _applyPenalty(id);
        } else if (rec.approvals >= requiredApprovals) {
            rec.status = Status.Approved;
            _payReward(id);
        }
    }

    function _payReward(uint256 id) internal {
        Recommendation storage rec = recommendations[id];
        trustToken.mint(rec.submitter, rewardAmount);
        emit RecommendationApproved(id, rec.submitter, rewardAmount);
    }

    function _applyPenalty(uint256 id) internal {
        Recommendation storage rec = recommendations[id];
        // Best-effort slash: if the submitter's balance is lower than the penalty,
        // TrustToken.burn will revert. We catch that so the flag itself still lands
        // on-chain instead of the whole vote() transaction failing.
        try trustToken.burn(rec.submitter, penaltyAmount) {
            emit RecommendationFlagged(id, rec.submitter, penaltyAmount, true);
        } catch {
            emit RecommendationFlagged(id, rec.submitter, penaltyAmount, false);
        }
    }

    // ---------------------------------------------------------------------
    // Admin / tuning
    // ---------------------------------------------------------------------

    function setRequiredApprovals(uint256 count) external onlyOwner {
        require(count > 0, "PoR: must require at least 1 approval");
        requiredApprovals = count;
    }

    function setFlagThreshold(uint256 count) external onlyOwner {
        require(count > 0, "PoR: must require at least 1 flag");
        flagThreshold = count;
    }

    function setRewardAmount(uint256 amount) external onlyOwner {
        rewardAmount = amount;
    }

    function setPenaltyAmount(uint256 amount) external onlyOwner {
        penaltyAmount = amount;
    }

    // ---------------------------------------------------------------------
    // Views
    // ---------------------------------------------------------------------

    function getRecommendation(uint256 id)
        external
        view
        returns (
            address submitter,
            bytes32 contentHash,
            Status status,
            uint256 approvals,
            uint256 flags,
            uint256 submittedAt
        )
    {
        Recommendation storage rec = recommendations[id];
        return (rec.submitter, rec.contentHash, rec.status, rec.approvals, rec.flags, rec.submittedAt);
    }
}
