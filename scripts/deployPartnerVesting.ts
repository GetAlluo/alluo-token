import { ethers } from "hardhat"
import { PartnerVesting__factory } from "../typechain/factories/PartnerVesting__factory";

async function main() {
    const tokenAddress = "0x1e5193ccc53f25638aa22a940af899b692e10b09";

    const Token = await ethers.getContractFactory("PartnerVesting") as PartnerVesting__factory;
    const token = await Token.deploy(tokenAddress);
    await token.deployed();
    console.log("Partner Vesting deployed to:", token.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });