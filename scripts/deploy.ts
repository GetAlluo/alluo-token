import { ethers } from "hardhat";
import {AlluoToken__factory} from "../typechain"

async function deploy() {

   // We get the contract to deploy
  const factory = await ethers.getContractFactory('AlluoToken') as AlluoToken__factory
  
  console.log("deploying on live chain")
  const alluoToken = await factory.deploy("0xfb7A51c6f6A5116Ac748C1aDF4D4682c3D50889E");
  console.log("AlluoToken deploying to:", alluoToken.address);
  await alluoToken.deployed();
  console.log("! deployed !");
}

deploy()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
