const hre = require("hardhat");

async function main() {
  console.log("Započinjem deploy na Hardhat 2...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Nalog za deploy:", deployer.address);

  const Tender = await hre.ethers.getContractFactory("BuildingTender");
  
  // Konstruktor: vreme, opis, kontakt, cena
  const tender = await Tender.deploy(3600, "Postavljanje parketa", "vlasnik@zgrada.rs", 10000);

  await tender.waitForDeployment();

  console.log("-----------------------------------------");
  console.log("UGOVOR POSTAVLJEN NA:", await tender.getAddress());
  console.log("-----------------------------------------");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});