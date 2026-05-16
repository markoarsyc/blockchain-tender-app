import { useState } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";
import TendersList from "./TendersList";
import TimeRemaining from "./TimeRemaining";

const ganacheUrl = "http://127.0.0.1:7545";

function ActiveTenders({ contractAddress, setContractAddress }) {
  const [selectedTender, setSelectedTender] = useState(null);
  const [bidderAccount, setBidderAccount] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectTender = (tender) => {
    setSelectedTender(tender);
    setBidAmount("");
  };

  const submitBid = async () => {
    if (!selectedTender) return alert("Prvo odaberi tender!");
    if (!bidderAccount) return alert("Unesite adresu vašeg (majstorskog) naloga!");
    if (!bidAmount) return alert("Unesite cenu!");

    setIsSubmitting(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = await provider.getSigner(bidderAccount);
      const contract = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      // Konvertuj ETH u WEI za blockchain
      const bidAmountInWei = ethers.parseEther(bidAmount);

      console.log(
        `Šaljem ponudu sa naloga: ${bidderAccount} za iznos: ${bidAmount} ETH`
      );
      const tx = await contract.applyForJob(bidAmountInWei);

      await tx.wait();
      alert("Ponuda uspešno poslata!");
      setBidAmount("");
      setSelectedTender(null);
    } catch (err) {
      console.error(err);
      alert(
        "Greška: Ponuda mora biti niža od trenutne i tender mora biti otvoren!"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tab-content">
      <h2>🔨 Stranica za Majstore: Aktivni Tenderi i Nadmetanje</h2>

      {/* Lista sa svim aktivnim tenderima */}
      <TendersList onSelectTender={handleSelectTender} />

      {/* Sekcija za slanje ponude */}
      {selectedTender && (
        <div className="card selected-tender-form" style={{ marginTop: "30px" }}>
          <h3>📝 Detalji Odabranog Tendera</h3>

          <div className="tender-details-expanded">
            <p>
              <strong>Posao:</strong> {selectedTender.jobDescription}
            </p>
            <p>
              <strong>Trenutna najniža ponuda:</strong>{" "}
              {ethers.formatEther(selectedTender.lowestBid)} ETH
            </p>
            <p>
              <strong>Vrijeme preostalo:</strong>
              <br />
              <TimeRemaining tenderEndTime={selectedTender.tenderEndTime} />
            </p>
            <p>
              <strong>Adresa tendera:</strong>
              <br />
              <code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
                {selectedTender.address}
              </code>
            </p>
          </div>

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
            <label>Tvoja ponuda (u ETH):</label>
            <input
              type="number"
              step="0.01"
              placeholder="npr. 0.5"
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
            />
            <small>
              Trenutna ponuda:{" "}
              <strong>{ethers.formatEther(selectedTender.lowestBid)} ETH</strong>
              {" "}
              - Tvoja ponuda mora biti niža!
            </small>
          </div>

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "15px",
            }}
          >
            <button className="btn-submit" onClick={submitBid} disabled={isSubmitting}>
              {isSubmitting ? "Slanje ponude..." : "🔨 Pošalji Ponudu"}
            </button>
            <button
              className="btn-cancel"
              onClick={() => setSelectedTender(null)}
              disabled={isSubmitting}
            >
              ✕ Otkaži
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveTenders;