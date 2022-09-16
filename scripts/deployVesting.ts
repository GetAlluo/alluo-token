import { ethers } from "hardhat"

async function main() {

  const [...addr] = await ethers.getSigners();

  const Vesting = await ethers.getContractFactory("N3onixVesting");

  const vesting = await Vesting.deploy("0x1e5193ccc53f25638aa22a940af899b692e10b09");

  await vesting.deployed();

  console.log("Vesting deployed to:", vesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });