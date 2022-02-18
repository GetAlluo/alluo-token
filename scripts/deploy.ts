
import { ethers } from "hardhat";

async function main() {

  const admin = "admin"

  const Token = await ethers.getContractFactory("AlluoToken");
  const token = await Token.deploy(admin);

  await token.deployed();

  console.log("Alluo Token deployed to:", token.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
