// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract AcademicAchievementNFT is ERC721, ERC721URIStorage, AccessControl, ReentrancyGuard {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    Counters.Counter private _tokenIdCounter;

    enum AchievementType { GPA_GUARDIAN, RESEARCH_ROCKSTAR, LEADERSHIP_LEGEND }
    
    struct Achievement {
        AchievementType achievementType;
        string university;
        uint256 timestamp;
        string metadataHash;
        bool verified;
    }

    mapping(uint256 => Achievement) public achievements;
    mapping(address => mapping(AchievementType => uint256[])) public userAchievements;
    mapping(string => bool) public universityApproved;
    
    event AchievementMinted(
        address indexed recipient,
        uint256 indexed tokenId,
        AchievementType achievementType,
        string university
    );
    
    event AchievementVerified(uint256 indexed tokenId, address indexed verifier);
    event UniversityApproved(string university, bool approved);

    constructor() ERC721("Academic Achievement NFT", "AANFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        
        // Pre-approve partner universities
        universityApproved["Eastern Michigan University"] = true;
        universityApproved["Eastern University"] = true;
        universityApproved["Thomas Edison State University"] = true;
        universityApproved["Oakland University"] = true;
        universityApproved["Virginia Tech"] = true;
    }

    function mintAchievement(
        address to,
        AchievementType achievementType,
        string memory university,
        string memory tokenURI,
        string memory metadataHash
    ) public onlyRole(MINTER_ROLE) nonReentrant returns (uint256) {
        require(universityApproved[university], "University not approved");
        require(to != address(0), "Cannot mint to zero address");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        achievements[tokenId] = Achievement({
            achievementType: achievementType,
            university: university,
            timestamp: block.timestamp,
            metadataHash: metadataHash,
            verified: false
        });

        userAchievements[to][achievementType].push(tokenId);
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        emit AchievementMinted(to, tokenId, achievementType, university);
        
        return tokenId;
    }

    function verifyAchievement(uint256 tokenId) public onlyRole(VERIFIER_ROLE) {
        require(_exists(tokenId), "Token does not exist");
        require(!achievements[tokenId].verified, "Achievement already verified");
        
        achievements[tokenId].verified = true;
        emit AchievementVerified(tokenId, msg.sender);
    }

    function getUserAchievements(address user, AchievementType achievementType) 
        public view returns (uint256[] memory) {
        return userAchievements[user][achievementType];
    }

    function getAllUserAchievements(address user) 
        public view returns (uint256[][] memory) {
        uint256[][] memory allAchievements = new uint256[][](3);
        allAchievements[0] = userAchievements[user][AchievementType.GPA_GUARDIAN];
        allAchievements[1] = userAchievements[user][AchievementType.RESEARCH_ROCKSTAR];
        allAchievements[2] = userAchievements[user][AchievementType.LEADERSHIP_LEGEND];
        return allAchievements;
    }

    function hasAchievementType(address user, AchievementType achievementType) 
        public view returns (bool) {
        return userAchievements[user][achievementType].length > 0;
    }

    function approveUniversity(string memory university, bool approved) 
        public onlyRole(DEFAULT_ADMIN_ROLE) {
        universityApproved[university] = approved;
        emit UniversityApproved(university, approved);
    }

    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // Override functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // Soul-bound functionality - prevent transfers after initial mint
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        require(from == address(0) || to == address(0), 
            "Academic achievement NFTs are soul-bound and cannot be transferred");
            
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }
}