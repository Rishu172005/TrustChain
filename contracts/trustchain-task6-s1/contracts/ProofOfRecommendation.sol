// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TrustToken.sol";
import "./UserRegistry.sol";

/// @title ProofOfRecommendation (PoR)
/// @notice Community consensus mechanism: a registered user submits a
/// recommendation (as a content hash, so raw content lives off-chain);
/// other registered users act as validators and vote to approve or flag it.
/// Enough approvals -> submitter is rewarded. Enough flags -> submitter is
/// penalized (slashed). This replaces a corporation's editorial judgment
/// with the collective judgment of the community, per the project brief.
contract ProofOfRecommendation is Ownable, ReentrancyGuard {
    TrustToken public immutable trustToken;
    UserRegistry public immutable userRegistry;

    /// @notice Reward minted to the submitter once consensus confirms the recommendation.
    uint256 public recommendationReward = 20 * 10 ** 18;

    /// @notice Number of approve votes required to confirm a recommendation.
    uint256 public consensusThreshold = 3;

    /// @notice Number of flag votes required to penalize the submitter (per the brief: "3+ validators").
    uint256 public flagThreshold = 3;

    /// @notice Tokens burned from the submitter when a recommendation is flagged.
    uint256 public slashAmount = 5 * 10 ** 18;

    enum Status {
        Pending,
        Confirmed,
        Flagged
    }

    struct Recommendation {
        address submitter;
        bytes32 contentHash; // hash of the off-chain recommendation content (POI + review text, etc.)
        uint256 approveVotes;
        uint256 flagVotes;
        Status status;
    }

    Recommendation[] public recommendations;

    // recommendationId => validator => voted?
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event RecommendationSubmitted(uint256 indexed id, address indexed submitter, bytes32 contentHash);
    event Voted(uint256 indexed id, address indexed validator, bool approve);
    event RecommendationConfirmed(uint256 indexed id, address indexed submitter, uint256 reward);
    event RecommendationFlagged(uint256 indexed id, address indexed submitter, uint256 penalty);
    event ParametersUpdated(
        uint256 recommendationReward,
        uint256 consensusThreshold,
        uint256 flagThreshold,
        uint256 slashAmount
    );

    modifier onlyRegistered() {
        require(userRegistry.isRegistered(msg.sender), "PoR: caller is not a registered user");
        _;
    }

    constructor(
        address trustTokenAddress,
        address userRegistryAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        trustToken = TrustToken(trustTokenAddress);
        userRegistry = UserRegistry(userRegistryAddress);
    }

    /// @notice Submit a recommendation for community validation.
    /// @param contentHash keccak256 hash of the off-chain recommendation content.
    function submitRecommendation(bytes32 contentHash) external onlyRegistered returns (uint256 id) {
        require(contentHash != bytes32(0), "PoR: invalid content hash");

        recommendations.push(
            Recommendation({
                submitter: msg.sender,
                contentHash: contentHash,
                approveVotes: 0,
                flagVotes: 0,
                status: Status.Pending
            })
        );
        id = recommendations.length - 1;

        emit RecommendationSubmitted(id, msg.sender, contentHash);
    }

    /// @notice Cast a validator vote on a pending recommendation.
    /// @param id the recommendation's index.
    /// @param approve true = approve (quality/authentic), false = flag (bad/fake).
    function vote(uint256 id, bool approve) external onlyRegistered nonReentrant {
        require(id < recommendations.length, "PoR: recommendation does not exist");
        Recommendation storage rec = recommendations[id];

        require(rec.status == Status.Pending, "PoR: recommendation already resolved");
        require(msg.sender != rec.submitter, "PoR: submitter cannot validate their own recommendation");
        require(!hasVoted[id][msg.sender], "PoR: already voted");

        hasVoted[id][msg.sender] = true;

        if (approve) {
            rec.approveVotes += 1;
        } else {
            rec.flagVotes += 1;
        }

        emit Voted(id, msg.sender, approve);

        // Resolve as soon as either threshold is crossed. Consensus is
        // checked before flagging so a recommendation that reaches approval
        // consensus first is protected, even if flag votes trickle in later
        // (flags can only land while status is still Pending).
        if (rec.approveVotes >= consensusThreshold) {
            _confirm(id, rec);
        } else if (rec.flagVotes >= flagThreshold) {
            _flag(id, rec);
        }
    }

    function _confirm(uint256 id, Recommendation storage rec) private {
        rec.status = Status.Confirmed;
        trustToken.mint(rec.submitter, recommendationReward);
        emit RecommendationConfirmed(id, rec.submitter, recommendationReward);
    }

    function _flag(uint256 id, Recommendation storage rec) private {
        rec.status = Status.Flagged;

        // Only burn as much as the submitter actually holds, so a
        // low-balance bad actor can't revert the whole flagging flow.
        uint256 submitterBalance = trustToken.balanceOf(rec.submitter);
        uint256 penalty = submitterBalance < slashAmount ? submitterBalance : slashAmount;

        if (penalty > 0) {
            trustToken.burnFrom(rec.submitter, penalty);
        }

        emit RecommendationFlagged(id, rec.submitter, penalty);
    }

    function getRecommendation(uint256 id)
        external
        view
        returns (
            address submitter,
            bytes32 contentHash,
            uint256 approveVotes,
            uint256 flagVotes,
            Status status
        )
    {
        Recommendation storage rec = recommendations[id];
        return (rec.submitter, rec.contentHash, rec.approveVotes, rec.flagVotes, rec.status);
    }

    function recommendationCount() external view returns (uint256) {
        return recommendations.length;
    }

    function setParameters(
        uint256 newReward,
        uint256 newConsensusThreshold,
        uint256 newFlagThreshold,
        uint256 newSlashAmount
    ) external onlyOwner {
        require(newConsensusThreshold > 0, "PoR: consensus threshold must be > 0");
        require(newFlagThreshold > 0, "PoR: flag threshold must be > 0");

        recommendationReward = newReward;
        consensusThreshold = newConsensusThreshold;
        flagThreshold = newFlagThreshold;
        slashAmount = newSlashAmount;

        emit ParametersUpdated(newReward, newConsensusThreshold, newFlagThreshold, newSlashAmount);
    }
}
