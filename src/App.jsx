import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import abi from "./abi.json";

const contractAddress = "0x15697c05aCCB2768703637770a7a6De4C533ceb0";
// RPC URL tvog lokalnog Ganache-a
const ganacheUrl = "http://127.0.0.1:7545"; 

function App() {
  const [lowestBid, setLowestBid] = useState("");
  const [description, setDescription] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  
  // Ovde čuvamo adresu koju ručno uneseš
  const [account, setAccount] = useState(""); 

  // Funkcija za čitanje podataka iz ugovora (ne zahteva nalog)
  const getTenderData = async () => {
    try {
      // Povezujemo se direktno na Ganache, bez MetaMaska
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const desc = await contract.jobDescription();
      const bid = await contract.lowestBid();
      
      setDescription(desc);
      setLowestBid(bid.toString());
    } catch (err) {
      console.error("Greška pri čitanju podataka sa ugovora:", err);
    }
  };

  // Funkcija za slanje ponude
  const submitBid = async () => {
    if (!account) return alert("Molimo unesite adresu naloga!");
    if (!bidAmount) return alert("Unesite cenu!");

    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      
      // Ganache dopušta da uzmemo signer za bilo koju adresu koja postoji u njemu
      const signer = await provider.getSigner(account); 
      const contract = new ethers.Contract(contractAddress, abi, signer);

      console.log(`Šaljem ponudu sa naloga: ${account} za iznos: ${bidAmount}`);
      
      const tx = await contract.applyForJob(bidAmount);
      console.log("Transakcija poslata...", tx.hash);
      
      await tx.wait(); 
      
      alert("Ponuda uspešno poslata!");
      setBidAmount(""); 
      getTenderData(); 
    } catch (err) {
      console.error(err);
      alert("Greška: Proveri da li je ponuda niža od trenutne i da li adresa pripada Ganache-u!");
    }
  };

  useEffect(() => {
    getTenderData();
  }, []);

  return (
    <div className="container">
      <h1>🏗️ Tender za zgradu </h1>
      
      <div className="card">
        <p><strong>Posao:</strong> {description || "Učitavam..."}</p>
        <p><strong>Trenutno najniža cena (plafon):</strong> {lowestBid ? `${lowestBid} WEI` : "Učitavam..."}</p>
      </div>

      {/* Sekcija za ručni unos adrese */}
      <div className="account-section">
        <h3>🔑 Aktivni nalog (Majstor)</h3>
        <input 
          type="text" 
          placeholder="Nalepi Ganache adresu ovde (0x...)" 
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          className="input-address"
        />
        {account && <p className="status-ok">🟢 Koristi se nalog za slanje transakcija.</p>}
      </div>

      <div className="bid-section">
        <h3>💰 Slanje ponude</h3>
        <input 
          type="number" 
          placeholder="Unesite vašu cenu u WEI..." 
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
        />
        <button className="btn-submit" onClick={submitBid}>Pošalji Ponudu</button>
      </div>
    </div>
  );
}

export default App;