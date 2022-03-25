import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { getWETH9Address } from "../tasks/utils";
import { contractNames } from "../ts/deploy";

const deployCd3d: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment,
) {
  const { deployments, getNamedAccounts } = hre;
  const { deployer } = await getNamedAccounts();
  const { deploy } = deployments;

  const { cd3d } = contractNames;

  await deploy(cd3d, {
    from: deployer,
    gasLimit: 8000000,
    args: [],
    log: true,
    deterministicDeployment: false,
  });
};

export default deployCd3d;