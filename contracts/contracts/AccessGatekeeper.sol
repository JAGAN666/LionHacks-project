// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AcademicAchievementNFT.sol";

contract AccessGatekeeper is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPPORTUNITY_MANAGER_ROLE = keccak256("OPPORTUNITY_MANAGER_ROLE");

    AcademicAchievementNFT public immutable nftContract;

    struct Opportunity {
        string title;
        string description;
        uint256[] requiredAchievementTypes; // Array of AchievementType enum values
        bool isActive;
        uint256 maxParticipants;
        uint256 currentParticipants;
        uint256 startTime;
        uint256 endTime;
        string metadataURI;
    }

    mapping(uint256 => Opportunity) public opportunities;
    mapping(uint256 => mapping(address => bool)) public hasAccess;
    mapping(uint256 => mapping(address => uint256)) public accessGrantedAt;
    
    uint256 private _opportunityCounter;

    event OpportunityCreated(
        uint256 indexed opportunityId,
        string title,
        uint256[] requiredAchievementTypes
    );
    
    event AccessGranted(
        uint256 indexed opportunityId,
        address indexed user,
        uint256 timestamp
    );
    
    event AccessRevoked(
        uint256 indexed opportunityId,
        address indexed user
    );

    constructor(address _nftContract) {
        nftContract = AcademicAchievementNFT(_nftContract);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(OPPORTUNITY_MANAGER_ROLE, msg.sender);
    }

    function createOpportunity(
        string memory title,
        string memory description,
        uint256[] memory requiredAchievementTypes,
        uint256 maxParticipants,
        uint256 startTime,
        uint256 endTime,
        string memory metadataURI
    ) public onlyRole(OPPORTUNITY_MANAGER_ROLE) returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(requiredAchievementTypes.length > 0, "Must require at least one achievement type");
        require(endTime > startTime, "End time must be after start time");
        require(endTime > block.timestamp, "End time must be in the future");

        uint256 opportunityId = _opportunityCounter++;
        
        opportunities[opportunityId] = Opportunity({
            title: title,
            description: description,
            requiredAchievementTypes: requiredAchievementTypes,
            isActive: true,
            maxParticipants: maxParticipants,
            currentParticipants: 0,
            startTime: startTime,
            endTime: endTime,
            metadataURI: metadataURI
        });

        emit OpportunityCreated(opportunityId, title, requiredAchievementTypes);
        return opportunityId;
    }

    function requestAccess(uint256 opportunityId) public nonReentrant {
        require(opportunityId < _opportunityCounter, "Opportunity does not exist");
        require(opportunities[opportunityId].isActive, "Opportunity is not active");
        require(block.timestamp >= opportunities[opportunityId].startTime, "Opportunity not yet started");
        require(block.timestamp <= opportunities[opportunityId].endTime, "Opportunity has ended");
        require(!hasAccess[opportunityId][msg.sender], "Access already granted");
        
        Opportunity storage opportunity = opportunities[opportunityId];
        require(opportunity.currentParticipants < opportunity.maxParticipants, "Opportunity is full");

        // Check if user has any of the required achievement types
        bool hasRequiredAchievement = false;
        for (uint256 i = 0; i < opportunity.requiredAchievementTypes.length; i++) {
            AchievementType achievementType = AchievementType(opportunity.requiredAchievementTypes[i]);
            if (nftContract.hasAchievementType(msg.sender, achievementType)) {
                hasRequiredAchievement = true;
                break;
            }
        }

        require(hasRequiredAchievement, "User does not have required achievement NFTs");

        hasAccess[opportunityId][msg.sender] = true;
        accessGrantedAt[opportunityId][msg.sender] = block.timestamp;
        opportunity.currentParticipants++;

        emit AccessGranted(opportunityId, msg.sender, block.timestamp);
    }

    function revokeAccess(uint256 opportunityId, address user) 
        public onlyRole(ADMIN_ROLE) {
        require(hasAccess[opportunityId][user], "User does not have access");
        
        hasAccess[opportunityId][user] = false;
        opportunities[opportunityId].currentParticipants--;
        
        emit AccessRevoked(opportunityId, user);
    }

    function deactivateOpportunity(uint256 opportunityId) 
        public onlyRole(OPPORTUNITY_MANAGER_ROLE) {
        require(opportunityId < _opportunityCounter, "Opportunity does not exist");
        opportunities[opportunityId].isActive = false;
    }

    function updateOpportunity(
        uint256 opportunityId,
        string memory title,
        string memory description,
        uint256 maxParticipants,
        uint256 endTime,
        string memory metadataURI
    ) public onlyRole(OPPORTUNITY_MANAGER_ROLE) {
        require(opportunityId < _opportunityCounter, "Opportunity does not exist");
        require(endTime > block.timestamp, "End time must be in the future");
        
        Opportunity storage opportunity = opportunities[opportunityId];
        opportunity.title = title;
        opportunity.description = description;
        opportunity.maxParticipants = maxParticipants;
        opportunity.endTime = endTime;
        opportunity.metadataURI = metadataURI;
    }

    function checkAccess(uint256 opportunityId, address user) 
        public view returns (bool) {
        if (!opportunities[opportunityId].isActive) return false;
        if (block.timestamp > opportunities[opportunityId].endTime) return false;
        return hasAccess[opportunityId][user];
    }

    function getOpportunity(uint256 opportunityId) 
        public view returns (Opportunity memory) {
        require(opportunityId < _opportunityCounter, "Opportunity does not exist");
        return opportunities[opportunityId];
    }

    function getActiveOpportunities() 
        public view returns (uint256[] memory) {
        uint256 activeCount = 0;
        
        // Count active opportunities
        for (uint256 i = 0; i < _opportunityCounter; i++) {
            if (opportunities[i].isActive && block.timestamp <= opportunities[i].endTime) {
                activeCount++;
            }
        }
        
        uint256[] memory activeIds = new uint256[](activeCount);
        uint256 index = 0;
        
        // Populate array with active opportunity IDs
        for (uint256 i = 0; i < _opportunityCounter; i++) {
            if (opportunities[i].isActive && block.timestamp <= opportunities[i].endTime) {
                activeIds[index] = i;
                index++;
            }
        }
        
        return activeIds;
    }

    function getUserAccessibleOpportunities(address user) 
        public view returns (uint256[] memory) {
        uint256[] memory activeOpportunities = getActiveOpportunities();
        uint256 accessibleCount = 0;
        
        // Count accessible opportunities
        for (uint256 i = 0; i < activeOpportunities.length; i++) {
            uint256 opportunityId = activeOpportunities[i];
            Opportunity storage opportunity = opportunities[opportunityId];
            
            // Check if user has any required achievement
            for (uint256 j = 0; j < opportunity.requiredAchievementTypes.length; j++) {
                AchievementType achievementType = AchievementType(opportunity.requiredAchievementTypes[j]);
                if (nftContract.hasAchievementType(user, achievementType)) {
                    accessibleCount++;
                    break;
                }
            }
        }
        
        uint256[] memory accessibleIds = new uint256[](accessibleCount);
        uint256 index = 0;
        
        // Populate array with accessible opportunity IDs
        for (uint256 i = 0; i < activeOpportunities.length; i++) {
            uint256 opportunityId = activeOpportunities[i];
            Opportunity storage opportunity = opportunities[opportunityId];
            
            for (uint256 j = 0; j < opportunity.requiredAchievementTypes.length; j++) {
                AchievementType achievementType = AchievementType(opportunity.requiredAchievementTypes[j]);
                if (nftContract.hasAchievementType(user, achievementType)) {
                    accessibleIds[index] = opportunityId;
                    index++;
                    break;
                }
            }
        }
        
        return accessibleIds;
    }

    function totalOpportunities() public view returns (uint256) {
        return _opportunityCounter;
    }
}