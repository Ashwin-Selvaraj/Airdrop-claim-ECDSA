// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract AshToken is ERC20, Ownable {
    constructor() ERC20("Ash Token", "ASH") Ownable(msg.sender) {
        uint256 initialSupply = 100_000_000_000; // 100 billion
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // keep mint function commented unless you want minting
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
