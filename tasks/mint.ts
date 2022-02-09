import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"

task("mint", "creates new tokens")
    .addParam("to", "tokens receiver")
    .addParam("amount", "amount to mint")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;
        console.log(network);
        
        const [...addr] = await hre.ethers.getSigners();

        const token = await hre.ethers.getContractAt("AlluoToken", "0x23149a65A1CAc71c36BEC9Ac656399d0B1FE0c80");
        
        await token.connect(addr[0]).mint(taskArgs.to, parseEther(taskArgs.amount));

        console.log('mint of %s to %s done on %s network',taskArgs.amount, taskArgs.to, network);
    });
