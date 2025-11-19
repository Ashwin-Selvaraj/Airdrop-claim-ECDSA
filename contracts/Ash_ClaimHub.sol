// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Ash_ClaimHub is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    IERC20 public immutable token;
    address public signer;              // backend signer for post-TGE vouchers
    mapping(address => uint256) public claimedSoFar; // cumulative claimed via signed vouchers

    event ClaimedSigned(address indexed who, uint256 cumulativeAmount, uint256 paid);
    event SignerUpdated(address newSigner);
    event Withdrawn(address to, uint256 amount);

    constructor(address tokenAddr, address _signer) Ownable(msg.sender) {
        require(tokenAddr != address(0), "zero token");
        token = IERC20(tokenAddr);
        signer = _signer;
    }

    
    // claim using backend-signed cumulative voucher
    // signed message format: keccak256(abi.encodePacked(user, cumulativeAmount, chainId, address(this)))
    function claimSigned(uint256 cumulativeAmount, bytes calldata signature) external nonReentrant {
        require(cumulativeAmount > 0, "zero cumulative");
        bytes32 hash = keccak256(abi.encodePacked(msg.sender, cumulativeAmount, block.chainid, address(this)));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address recovered = ECDSA.recover(ethSignedHash, signature);
        require(recovered == signer, "invalid signer");

        uint256 already = claimedSoFar[msg.sender];
        require(cumulativeAmount > already, "nothing to claim");
        uint256 toPay = cumulativeAmount - already;
        claimedSoFar[msg.sender] = cumulativeAmount;

        require(token.transfer(msg.sender, toPay), "transfer failed");
        emit ClaimedSigned(msg.sender, cumulativeAmount, toPay);
    }

    // admin: update signer (use multisig in production)
    function setSigner(address newSigner) external onlyOwner {
        signer = newSigner;
        emit SignerUpdated(newSigner);
    }

    function withdrawRemaining(address to) external onlyOwner {
        uint256 bal = token.balanceOf(address(this));
        require(bal > 0, "no balance");
        require(token.transfer(to, bal), "transfer failed");
        emit Withdrawn(to, bal);
    }
}
