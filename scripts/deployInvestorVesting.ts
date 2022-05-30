import { ethers } from "hardhat"
import { InvestorsVesting__factory } from "../typechain";

async function main() {
    const tokenAddress = "0xA924A06bC2Ac9Eb3C18E95fD23306ab1e77cf950";

    const Token = await ethers.getContractFactory("InvestorsVesting") as InvestorsVesting__factory;
    const token = await Token.deploy(tokenAddress);
    await token.deployed();
    console.log("Investors vesting deployed to:", token.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });