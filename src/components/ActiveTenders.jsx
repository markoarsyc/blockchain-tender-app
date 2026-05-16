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

  // Stanje za investitora koji rucno zatvara tender
  const [managerPrivateKey, setManagerPrivateKey] = useState("");
  const [derivedManagerAddress, setDerivedManagerAddress] = useState("");
  const [isClosingTender, setIsClosingTender] = useState(false);

  // Trenutno vreme za proveru isteka roka na frontendu
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Tikker koji ažurira vreme svake sekunde kako bi odmah osvežio dugmiće
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Derivacija adrese MAJSTORA na osnovu privatnog kljuca
  useEffect(() => {
    if (!bidderPrivateKey) {
      setDerivedAddress("");
      return;
    }
    try {
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
      console.error("Greška pri derivaciji adrese majstora:", err);
      setDerivedAddress("");
    }
  }, [bidderPrivateKey]);

  // Derivacija adrese INVESTITORA na osnovu privatnog kljuca
  useEffect(() => {
    if (!managerPrivateKey) {
      setDerivedManagerAddress("");
      return;
    }
    try {
      const isValidFormat =
        (managerPrivateKey.length === 64 || managerPrivateKey.length === 66) &&
        /^(0x)?[0-9a-fA-F]+$/.test(managerPrivateKey);

      if (isValidFormat) {
        const wallet = new ethers.Wallet(managerPrivateKey);
        setDerivedManagerAddress(wallet.address);
      } else {
        setDerivedManagerAddress("");
      }
    } catch (err) {
      console.error("Greška pri derivaciji adrese investitora:", err);
      setDerivedManagerAddress("");
    }
  }, [managerPrivateKey]);

  const handleSelectTender = (tender) => {
    setSelectedTender(tender);
    setBidAmount("");
    setWinnerResult(null);
    setManagerPrivateKey("");
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

      const bidAmountInWei = ethers.parseEther(bidAmount);
      console.log(`Šaljem ponudu sa naloga: ${signer.address} za iznos: ${bidAmount} ETH`);

      const tx = await contract.applyForJob(bidAmountInWei);
      await tx.wait();

      alert("Ponuda uspešno poslata!");
      setBidAmount("");
      setSelectedTender(null);
    } catch (err) {
      console.error(err);
      alert("Greška: Ponuda mora biti niža od trenutne i tender mora biti otvoren!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rucno zatvaranje tendera od strane investitora
  const closeTenderManually = async () => {
    if (!selectedTender) return alert("Tender nije odabran!");
    if (!managerPrivateKey) return alert("Unesite privatni ključ investitora!");
    if (!derivedManagerAddress) return alert("Privatni ključ investitora nije validan!");

    setIsClosingTender(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(managerPrivateKey, provider);
      
      // Definišemo instancu ugovora tačno unutar ovog skoupa
      const myContractInstance = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      console.log(`Pokušaj zatvaranja tendera od strane menadžera: ${signer.address}`);
      
      // POPRAVLJENO: Koristimo kreiranu instancu i dodajemo gasLimit da zaobiđemo estimateGas grešku
      const tx = await myContractInstance.tenderEnd({ gasLimit: 100000 });
      await tx.wait();

      alert("🎉 Tender je uspešno zatvoren! Majstori sada mogu bezbedno proveriti rezultate.");
      setSelectedTender(null); 
    } catch (err) {
      console.error("Greška pri ručnom zatvaranju tendera:", err);
      
      if (err.message.includes("NotManager")) {
        alert("❌ Greška: Ovaj privatni ključ ne pripada investitoru koji je kreirao ovaj tender!");
      } else if (err.message.includes("TenderEndAlreadyCalled")) {
        alert("❌ Greška: Ovaj tender je već zatvoren!");
      } else {
        alert("❌ Došlo je do greške prilikom izvršavanja na blockchain-u. Proverite konzolu za tačan revert.");
      }
    } finally {
      setIsClosingTender(false);
    }
  };

  const revealWinnerResult = async () => {
    if (!selectedTender) return alert("Tender nije odabran!");
    if (!bidderPrivateKey) return alert("Unesite privatni ključ vašeg naloga!");
    if (!derivedAddress) return alert("Privatni ključ nije validan!");

    setIsLoadingResult(true);
    setWinnerResult(null);

    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(bidderPrivateKey, provider);
      const contract = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      const isEnded = await contract.ended();
      if (!isEnded) {
        setWinnerResult({
          success: false,
          message: "⚠️ Investitor još uvek nije zvanično zatvorio ovaj tender. Sačekajte zatvaranje.",
        });
        setIsLoadingResult(false);
        return;
      }

      const secretContact = await contract.getInvestorContact();

      setWinnerResult({
        success: true,
        message: `🎉 Čestitamo! Pobedili ste! Tajni kontakt investitora je: ${secretContact}`,
      });
    } catch (err) {
      console.error("Greška pri otkrivanju rezultata:", err);

      setWinnerResult({
        success: false,
        message: `Najniža ponuda je bila ${ethers.formatEther(selectedTender.lowestBid)} ETH. Nažalost, vaša adresa (${derivedAddress}) nije pobedila na ovom tenderu.`,
      });
    } finally {
      setIsLoadingResult(false);
    }
  };

  // Izračunavanje da li je vreme isteklo na osnovu trenutnog timestamp-a
  const isTimeExpired = selectedTender ? currentTime >= Number(selectedTender.tenderEndTime) : false;

  return (
    <div className="tab-content">
      <h2>🔨 Stranica za Majstore: Aktivni Tenderi i Nadmetanje</h2>

      <TendersList onSelectTender={handleSelectTender} />

      {selectedTender && (
        <div className="card selected-tender-form" style={{ marginTop: "30px" }}>
          <h3>📝 Detalji Odabranog Tendera</h3>

          <div className="tender-details-expanded">
            <p><strong>Posao:</strong> {selectedTender.jobDescription}</p>
            <p><strong>Trenutna najniža ponuda:</strong> {ethers.formatEther(selectedTender.lowestBid)} ETH</p>
            <p><strong>Vrijeme preostalo:</strong> <br /><TimeRemaining tenderEndTime={selectedTender.tenderEndTime} /></p>
            <p><strong>Adresa tendera:</strong> <br /><code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>{selectedTender.address}</code></p>
          </div>

          {/* ========================================================== */}
          {/* 🔐 POPRAVLJENO: KONTROLNI PANEL ZA INVESTITORA (UVEK VIDLJIV) */}
          {/* ========================================================== */}
          <div className="admin-zone" style={{ marginTop: "20px", padding: "15px", border: "2px dashed #b1dfbb", backgroundColor: "#f8fff9", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#1e7e34" }}>🔐 Kontrolni panel za Investitora (Vlasnika)</h4>

            {!isTimeExpired ? (
              // Ako vreme još NIJE isteklo, blokiramo ga porukom
              <p style={{ margin: "0", color: "#856404", fontSize: "0.9em", backgroundColor: "#fff3cd", padding: "8px", borderRadius: "4px" }}>
                ⏳ Tender je još uvek u toku. Investitor ne može zatvoriti tender pre nego što vreme za slanje ponuda potpuno istekne.
              </p>
            ) : (
              // Ako je vreme ISTEKLO, otključavamo formu za unose i dugme za prekid
              <>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.9em", color: "#155724" }}>
                  ⏰ <strong>Vreme za ponude je isteklo!</strong> Unesite Vaš privatni ključ kako biste ručno zatvorili tender i proglasili pobednika.
                </p>

                <div className="form-group">
                  <input
                    type="password"
                    placeholder="Unesite PRIVATNI KLJUČ INVESTITORA za zatvaranje"
                    value={managerPrivateKey}
                    onChange={(e) => setManagerPrivateKey(e.target.value)}
                  />
                  {derivedManagerAddress && (
                    <small style={{ color: "#28a745", display: "block", marginTop: "5px" }}>
                      📍 Prepoznata adresa investitora: <code>{derivedManagerAddress}</code>
                    </small>
                  )}
                </div>

                <button
                  className="btn-submit"
                  onClick={closeTenderManually}
                  disabled={isClosingTender || !derivedManagerAddress}
                  style={{ backgroundColor: "#28a745", width: "100%", marginTop: "5px" }}
                >
                  {isClosingTender ? "Zatvaranje tendera..." : "🔒 Ručno Zatvori Tender Zauvek"}
                </button>
              </>
            )}
          </div>
          {/* ========================================================== */}

          <div className="form-group" style={{ marginTop: "25px" }}>
            <label style={{ fontWeight: "bold" }}>🔑 Panel za Majstore (Unos ključa za ponude / rezultate):</label>
            <input
              type="password"
              placeholder="Unesite vaš privatni ključ (64 ili 66 karaktera sa 0x)"
              value={bidderPrivateKey}
              onChange={(e) => setBidderPrivateKey(e.target.value)}
            />
            {derivedAddress && (
              <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
                <p style={{ margin: "0" }}>
                  <strong>📍 Vaša adresa majstora:</strong> <br />
                  <code style={{ fontSize: "0.85em", wordBreak: "break-all", color: "#2e7d32" }}>{derivedAddress}</code>
                </p>
              </div>
            )}
          </div>

          {/* SEKCIJA ZA MAJSTORE: Ako vreme još teče, dozvoli slanje novih ponuda */}
          {!isTimeExpired && (
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
                  Trenutna ponuda: <strong>{ethers.formatEther(selectedTender.lowestBid)} ETH</strong> - Tvoja ponuda mora biti niža!
                </small>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                <button
                  className="btn-submit"
                  onClick={submitBid}
                  disabled={isSubmitting || !derivedAddress}
                >
                  {isSubmitting ? "Slanje ponude..." : "🔨 Pošalji Ponudu"}
                </button>
                <button className="btn-cancel" onClick={() => setSelectedTender(null)} disabled={isSubmitting}>
                  ✕ Otkaži
                </button>
              </div>
            </>
          )}

          {/* SEKCIJA ZA MAJSTORE: Ako je vreme isteklo, skloni unos ponuda i prikaži dugme za rezultate */}
          {isTimeExpired && (
            <>
              <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "4px" }}>
                <p style={{ margin: "0" }}><strong>ℹ️ Vreme za ovaj tender je završeno. Čeka se zvanična potvrda investitora.</strong></p>
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

              {winnerResult && (
                <div style={{ marginTop: "20px", padding: "15px", backgroundColor: winnerResult.success ? "#d4edda" : "#f8d7da", border: `1px solid ${winnerResult.success ? "#28a745" : "#f5c6cb"}`, borderRadius: "4px" }}>
                  <p style={{ margin: "0" }}><strong style={{ color: winnerResult.success ? "#155724" : "#721c24" }}>{winnerResult.message}</strong></p>
                </div>
              )}

              <div style={{ marginTop: "15px" }}>
                <button className="btn-cancel" onClick={() => setSelectedTender(null)}>✕ Zatvori</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default ActiveTenders;