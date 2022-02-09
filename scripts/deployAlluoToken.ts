import { ethers } from "hardhat"

async function main() {
  const adminAddress = "0x0B74fFf7D99E524319D59f4dC399413c1E4E1A93";

  const Token = await ethers.getContractFactory("AlluoToken");
  const token = await Token.deploy(adminAddress);
  await token.deployed();
  console.log("Alluo Token deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });