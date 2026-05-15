import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";

const ganacheUrl = "http://127.0.0.1:7545";

function ActiveTenders({ contractAddress, setContractAddress }) {
  const [bidderAccount, setBidderAccount] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [liveDescription, setLiveDescription] = useState("");
  const [lowestBid, setLowestBid] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const getTenderData = useCallback(async () => {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setLiveDescription("");
      setLowestBid("");
      return;
    }

    setIsLoading(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, provider);
      
      const desc = await contract.jobDescription();
      const bid = await contract.lowestBid();
      
      setLiveDescription(desc);
      setLowestBid(bid.toString());
    } catch (err) {
      console.error("Greška pri čitanju ugovora:", err);
      setLiveDescription("Ugovor nije pronađen na ovoj adresi.");
      setLowestBid("");
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress]);

  const submitBid = async () => {
    if (!contractAddress) return alert("Prvo unesite ili kreirajte ugovor!");
    if (!bidderAccount) return alert("Unesite adresu vašeg (majstorskog) naloga!");
    if (!bidAmount) return alert("Unesite cenu!");

    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = await provider.getSigner(bidderAccount); 
      const contract = new ethers.Contract(contractAddress, contractArtifact.abi, signer);

      console.log(`Šaljem ponudu sa naloga: ${bidderAccount} za iznos: ${bidAmount}`);
      const tx = await contract.applyForJob(Number(bidAmount));
      
      await tx.wait(); 
      alert("Ponuda uspešno poslata!");
      setBidAmount(""); 
      getTenderData();
    } catch (err) {
      console.error(err);
      alert("Greška: Ponuda mora biti niža od trenutne i tender mora biti otvoren!");
    }
  };
  
  useEffect(() => {
    getTenderData();
  }, [getTenderData]);

  return (
    <div className="tab-content">
      <h2>Stranica za Majstore: Nadmetanje</h2>

      <div className="form-group address-bar">
        <label>📍 Adresa tendera koji posmatraš:</label>
        <input 
          type="text" 
          placeholder="0x..." 
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
        />
      </div>

      {isLoading && <p className="loading-text">Učitavam podatke sa blockchain-a...</p>}

      {contractAddress && !isLoading && (
        <div className="card live-data">
          <h3>📊 Stanje na tenderu:</h3>
          <p><strong>Posao:</strong> {liveDescription || "Nema opisa"}</p>
          <p><strong>Trenutna najniža cena:</strong> {lowestBid ? `${lowestBid} WEI` : "---"}</p>
        </div>
      )}

      <div className="form-group" style={{ marginTop: "20px" }}>
        <label>Tvoj nalog (Majstor):</label>
        <input 
          type="text" 
          placeholder="Nalepi DRUGU adresu iz Ganache-a" 
          value={bidderAccount}
          onChange={(e) => setBidderAccount(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Tvoja ponuda (u WEI):</label>
        <input 
          type="number" 
          placeholder="Unesite iznos manji od trenutnog" 
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
        />
      </div>

      <button className="btn-submit" onClick={submitBid}>🔨 Pošalji Ponudu</button>
    </div>
  );
}

export default ActiveTenders;