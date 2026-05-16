import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";
import TendersList from "./TendersList";
import TimeRemaining from "./TimeRemaining";

const ganacheUrl = "http://127.0.0.1:7545";

function ActiveTenders({ contractAddress, setContractAddress }) {
  const [selectedTender, setSelectedTender] = useState(null);
  const [bidderPrivateKey, setBidderPrivateKey] = useState("");
  const [derivedAddress, setDerivedAddress] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [winnerResult, setWinnerResult] = useState(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);

  // Derive address from private key
  useEffect(() => {
    if (!bidderPrivateKey) {
      setDerivedAddress("");
      return;
    }

    try {
      // Check if it's a valid hex string (64 or 66 characters with 0x prefix)
      const isValidFormat =
        (bidderPrivateKey.length === 64 || bidderPrivateKey.length === 66) &&
        /^(0x)?[0-9a-fA-F]+$/.test(bidderPrivateKey);

      if (isValidFormat) {
        const wallet = new ethers.Wallet(bidderPrivateKey);
        setDerivedAddress(wallet.address);
      } else {
        setDerivedAddress("");
      }
    } catch (err) {
      console.error("Greška pri derivaciji adrese:", err);
      setDerivedAddress("");
    }
  }, [bidderPrivateKey]);

  const handleSelectTender = (tender) => {
    setSelectedTender(tender);
    setBidAmount("");
    setWinnerResult(null);
  };

  const submitBid = async () => {
    if (!selectedTender) return alert("Prvo odaberi tender!");
    if (!bidderPrivateKey) return alert("Unesite privatni ključ vašeg naloga!");
    if (!derivedAddress) return alert("Privatni ključ nije validan!");
    if (!bidAmount) return alert("Unesite cenu!");

    setIsSubmitting(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(bidderPrivateKey, provider);
      const contract = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      // Konvertuj ETH u WEI za blockchain
      const bidAmountInWei = ethers.parseEther(bidAmount);

      console.log(
        `Šaljem ponudu sa naloga: ${signer.address} za iznos: ${bidAmount} ETH`
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

  const revealWinnerResult = async () => {
    if (!selectedTender) return alert("Tender nije odabran!");
    if (!bidderPrivateKey) return alert("Unesite privatni ključ vašeg naloga!");
    if (!derivedAddress) return alert("Privatni ključ nije validan!");

    setIsLoadingResult(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(bidderPrivateKey, provider);
      const contract = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      // Try to call the investor contact function
      const secretContact = await contract.getInvestorContact();
      
      setWinnerResult({
        success: true,
        message: `🎉 Čestitamo! Tajni kontakt investitora je: ${secretContact}`,
      });
    } catch (err) {
      console.error("Greška pri otkrianju rezultata:", err);
      
      // User is not the winner - fetch their bid vs lowest bid
      setWinnerResult({
        success: false,
        lowestBid: ethers.formatEther(selectedTender.lowestBid),
        message: `Najniža ponuda je bila ${ethers.formatEther(
          selectedTender.lowestBid
        )} ETH. Nažalost, niste pobedili na ovom tenderu.`,
      });
    } finally {
      setIsLoadingResult(false);
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
            <label>Privatni ključ vašeg naloga:</label>
            <input
              type="password"
              placeholder="Unesite privatni ključ (64 ili 66 karaktera sa 0x)"
              value={bidderPrivateKey}
              onChange={(e) => setBidderPrivateKey(e.target.value)}
            />
            {derivedAddress && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
                <p style={{ margin: "0" }}>
                  <strong>📍 Vaša adresa:</strong>
                  <br />
                  <code style={{ fontSize: "0.85em", wordBreak: "break-all", color: "#2e7d32" }}>
                    {derivedAddress}
                  </code>
                </p>
              </div>
            )}
          </div>

          {/* AKTIVNI TENDER - Sekcija za slanje ponude */}
          {selectedTender.isActive && (
            <>
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
                <button
                  className="btn-submit"
                  onClick={submitBid}
                  disabled={isSubmitting || !derivedAddress}
                >
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
            </>
          )}

          {/* ZAVRŠENI TENDER - Sekcija za otkriće rezultata */}
          {!selectedTender.isActive && (
            <>
              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "4px",
                }}
              >
                <p style={{ margin: "0 0 10px 0" }}>
                  <strong>ℹ️ Ovaj tender je završen.</strong> Kliknite na dugme ispod da vidite rezultate.
                </p>
              </div>

              <div style={{ marginTop: "15px" }}>
                <button
                  className="btn-submit"
                  onClick={revealWinnerResult}
                  disabled={isLoadingResult || !derivedAddress}
                  style={{ width: "100%" }}
                >
                  {isLoadingResult ? "Učitavanje rezultata..." : "🔑 Otkrij Kontakt Investitora"}
                </button>
              </div>

              {/* Prikaži rezultate */}
              {winnerResult && (
                <div
                  style={{
                    marginTop: "20px",
                    padding: "15px",
                    backgroundColor: winnerResult.success ? "#d4edda" : "#f8d7da",
                    border: `1px solid ${winnerResult.success ? "#28a745" : "#f5c6cb"}`,
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ margin: "0" }}>
                    <strong style={{ color: winnerResult.success ? "#155724" : "#721c24" }}>
                      {winnerResult.message}
                    </strong>
                  </p>
                </div>
              )}

              <div style={{ marginTop: "15px" }}>
                <button
                  className="btn-cancel"
                  onClick={() => setSelectedTender(null)}
                >
                  ✕ Zatvori
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ActiveTenders;