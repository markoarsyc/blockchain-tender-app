import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";

// Lokalni RPC čvor (Ganache) na kojem se izvršava deployment pametnog ugovora
const ganacheUrl = "http://127.0.0.1:7545";

function CreateTender({ setContractAddress }) {
  const navigate = useNavigate();
  const [creatorAccount, setCreatorAccount] = useState("");
  const [biddingTime, setBiddingTime] = useState(0);
  const [jobDescription, setJobDescription] = useState("");
  const [vlasnikSecret, setVlasnikSecret] = useState("");
  const [initialPrice, setInitialPrice] = useState(""); 
  const [isDeploying, setIsDeploying] = useState(false);

  // Inicijalizacija i postavljanje (deployment) nove instance pametnog ugovora na mrežu
  const deployContract = async () => {
    if (!creatorAccount) return alert("Unesite adresu naloga koji kreira tender!");
    setIsDeploying(true);

    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      
      // Preuzimanje potpisnika transakcije na osnovu javne adrese iz lokalnog čvora
      const signer = await provider.getSigner(creatorAccount);

      // Instanciranje fabrike ugovora na osnovu kompajliranog ABI-ja i bajtkoda
      const factory = new ethers.ContractFactory(
        contractArtifact.abi,
        contractArtifact.bytecode,
        signer
      );

      console.log("Slanje transakcije za kreiranje pametnog ugovora...");
      
      // Konverzija unete vrednosti iz ETH u Wei jedinice radi usklađivanja sa tipom podataka u Solidity-ju
      const initialPriceInWei = ethers.parseEther(initialPrice || "0");
      
      // Prosleđivanje parametara u konstruktor pametnog ugovora prilikom inicijalizacije
      const contract = await factory.deploy(
        Number(biddingTime),
        jobDescription,
        vlasnikSecret,
        initialPriceInWei
      );

      // Asinhrono čekanje da rudari (Ganache) potvrde transakciju i generišu adresu ugovora
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();
      
      setContractAddress(deployedAddress);
      
      // Perzistentno čuvanje adrese novokreiranog tendera u lokalnom skladištu pretraživača
      const existingAddresses = JSON.parse(localStorage.getItem("tender_addresses") || "[]");
      if (!existingAddresses.includes(deployedAddress)) {
        existingAddresses.push(deployedAddress);
        localStorage.setItem("tender_addresses", JSON.stringify(existingAddresses));
      }
      
      alert(`Ugovor je uspešno kreiran i postavljen na adresu: ${deployedAddress}`);
      
      // Preusmeravanje korisnika na panel za nadmetanje nakon uspešnog kreiranja
      navigate("/bidding");
    } catch (err) {
      console.error("Greška prilikom izvršavanja deployment transakcije:", err);
      alert("Greška pri kreiranju ugovora. Proverite status i dostupnost naloga na mreži.");
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="tab-content">
      <h2>Stranica za Investitore: Pokretanje Novog Tendera</h2>
      
      <div className="form-group">
        <label>Nalog koji finansira kreiranje (Investitor):</label>
        <input 
          type="text" 
          placeholder="Unesite javnu adresu investitora sa Ganache mreže" 
          value={creatorAccount}
          onChange={(e) => setCreatorAccount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Opis i specifikacija posla:</label>
        <input 
          type="text" 
          placeholder="npr. Krečenje i gletovanje trosobnog stana"
          value={jobDescription} 
          onChange={(e) => setJobDescription(e.target.value)} 
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Trajanje tendera (u sekundama):</label>
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
        <label>Zaštićeni kontakt podaci investitora (e-mail / telefon):</label>
        <input 
          type="text" 
          placeholder="Ovaj podatak biće dostupan isključivo pobedniku tendera"
          value={vlasnikSecret} 
          onChange={(e) => setVlasnikSecret(e.target.value)} 
        />
      </div>

      <button className="btn-main" onClick={deployContract} disabled={isDeploying}>
        {isDeploying ? "U poretku: Postavljanje pametnog ugovora..." : "🚀 Pokreni Tender na Mreži"}
      </button>
    </div>
  );
}

export default CreateTender;