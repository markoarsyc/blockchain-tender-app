import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";

const ganacheUrl = "http://127.0.0.1:7545";

function CreateTender({ setContractAddress }) {
  const navigate = useNavigate();
  const [creatorAccount, setCreatorAccount] = useState("");
  const [biddingTime, setBiddingTime] = useState(0);
  const [jobDescription, setJobDescription] = useState("");
  const [vlasnikSecret, setVlasnikSecret] = useState("");
  const [initialPrice, setInitialPrice] = useState(""); // u ETH
  const [isDeploying, setIsDeploying] = useState(false);

  const deployContract = async () => {
    if (!creatorAccount) return alert("Unesite adresu naloga koji kreira tender!");
    setIsDeploying(true);

    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = await provider.getSigner(creatorAccount);

      const factory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        signer
      );

      console.log("Pokrećem kreiranje ugovora na Ganache-u...");
      
      // Konvertuj ETH u WEI za blockchain
      const initialPriceInWei = ethers.parseEther(initialPrice || "0");
      
      const contract = await factory.deploy(
        Number(biddingTime),
        jobDescription,
        vlasnikSecret,
        initialPriceInWei
      );

      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      setContractAddress(deployedAddress);
      
      // Spremi adresu tendera u localStorage
      const existingAddresses = JSON.parse(localStorage.getItem("tender_addresses") || "[]");
      if (!existingAddresses.includes(deployedAddress)) {
        existingAddresses.push(deployedAddress);
        localStorage.setItem("tender_addresses", JSON.stringify(existingAddresses));
      }
      
      alert(`Ugovor uspešno kreiran na adresi: ${deployedAddress}`);
      
      navigate("/bidding");
    } catch (err) {
      console.error(err);
      alert("Greška pri kreiranju ugovora. Proverite adresu u Ganache-u.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="tab-content">
      <h2>Stranica za Investitore: Pokretanje Tendera</h2>
      
      <div className="form-group">
        <label>Nalog koji plaća kreiranje (Investitor):</label>
        <input 
          type="text" 
          placeholder="Nalepi Ganache adresu (npr. Account #0)" 
          value={creatorAccount}
          onChange={(e) => setCreatorAccount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Opis posla:</label>
        <input 
          type="text" 
          value={jobDescription} 
          onChange={(e) => setJobDescription(e.target.value)} 
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Trajanje (u sekundama):</label>
          <input 
            type="number" 
            value={biddingTime} 
            onChange={(e) => setBiddingTime(e.target.value)} 
          />
        </div>
        <div className="form-group">
          <label>Početna maksimalna cena (ETH):</label>
          <input 
            type="number" 
            step="0.01"
            placeholder="npr. 1.5"
            value={initialPrice} 
            onChange={(e) => setInitialPrice(e.target.value)} 
          />
        </div>
      </div>

      <div className="form-group">
        <label>Tajna e-mail adresa vlasnika:</label>
        <input 
          type="text" 
          value={vlasnikSecret} 
          onChange={(e) => setVlasnikSecret(e.target.value)} 
        />
      </div>

      <button className="btn-main" onClick={deployContract} disabled={isDeploying}>
        {isDeploying ? "Kreiranje ugovora na blockchain-u..." : "🚀 Pokreni Tender na Mreži"}
      </button>
    </div>
  );
}

export default CreateTender;