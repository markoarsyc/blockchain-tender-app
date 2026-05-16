import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";
import TendersList from "./TendersList";
import TimeRemaining from "./TimeRemaining";

// Lokalni RPC čvor (Ganache) na kojem se nalazi pametni ugovor
const ganacheUrl = "http://127.0.0.1:7545";

function ActiveTenders({ contractAddress, setContractAddress }) {
  // Stanja za upravljanje odabranim tenderom i interakciju izvođača (majstora)
  const [selectedTender, setSelectedTender] = useState(null);
  const [bidderPrivateKey, setBidderPrivateKey] = useState("");
  const [derivedAddress, setDerivedAddress] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [winnerResult, setWinnerResult] = useState(null);
  const [isLoadingResult, setIsLoadingResult] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Stanja za autentifikaciju i autorizaciju investitora (kreatora tendera)
  const [managerPrivateKey, setManagerPrivateKey] = useState("");
  const [derivedManagerAddress, setDerivedManagerAddress] = useState("");
  const [isClosingTender, setIsClosingTender] = useState(false);

  // Interni tajmer za praćenje isteka roka tendera u realnom vremenu na klijentu
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determinističko generisanje javne adrese izvođača na osnovu unetog privatnog ključa
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
      console.error("Greška pri verifikaciji ključa izvođača:", err);
      setDerivedAddress("");
    }
  }, [bidderPrivateKey]);

  // Determinističko generisanje javne adrese investitora na osnovu unetog privatnog ključa
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
      console.error("Greška pri verifikaciji ključa investitora:", err);
      setDerivedManagerAddress("");
    }
  }, [managerPrivateKey]);

  const handleSelectTender = (tender) => {
    setSelectedTender(tender);
    setBidAmount("");
    setWinnerResult(null);
    setManagerPrivateKey(""); 
  };

  // Slanje ponude za posao (izvršava izvođač/majstor)
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

      // Konverzija unete vrednosti iz ETH u Wei jedinice radi preciznosti na ugovoru
      const bidAmountInWei = ethers.parseEther(bidAmount);
      console.log(`Slanje transakcije sa adrese: ${signer.address} | Iznos: ${bidAmount} ETH`);
      
      const tx = await contract.applyForJob(bidAmountInWei, {
        value: ethers.parseEther("0.05") 
      });
      await tx.wait(); // Čekanje da transakcija bude upisana u blok
      
      alert("Ponuda uspešno poslata! Garantni depozit od 0.05 ETH je privremeno zaključan u ugovoru.");
      setBidAmount("");
      setSelectedTender(null);
      window.location.reload(); // Osvežavanje stanja aplikacije povlačenjem novih podataka
    } catch (err) {
      console.error(err);
      alert("Greška: Ponuda mora biti niža od trenutne i tender mora biti otvoren!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalizacija tendera i proglašenje pobednika (izvršava isključivo vlasnik/investitor)
  const closeTenderManually = async () => {
    if (!selectedTender) return alert("Tender nije odabran!");
    if (!managerPrivateKey) return alert("Unesite privatni ključ investitora!");
    if (!derivedManagerAddress) return alert("Privatni ključ investitora nije validan!");

    setIsClosingTender(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(managerPrivateKey, provider);
      
      const myContractInstance = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      console.log(`Zahtev za zatvaranje tendera od strane kreatora: ${signer.address}`);
      
      //amp; Eksplicitno definisan gasLimit kako bi se izbegla CALL_EXCEPTION greška pri simulaciji gasa
      const tx = await myContractInstance.tenderEnd({ gasLimit: 100000 });
      await tx.wait();

      alert("🎉 Tender je uspešno zatvoren! Rezultati su generisani na blockchain-u.");
      setSelectedTender(null); 
      window.location.reload();
    } catch (err) {
      console.error("Greška pri izvršavanju tenderEnd funkcije:", err);
      
      if (err.message.includes("NotManager")) {
        alert("❌ Odbijeno: Ovaj nalog nema administratorska prava nad ovim tenderom!");
      } else if (err.message.includes("TenderEndAlreadyCalled")) {
        alert("❌ Odbijeno: Funkcija za zatvaranje je već izvršena za ovaj ugovor!");
      } else {
        alert("❌ Došlo je do greške prilikom izvršavanja na blockchain-u. Proverite stanje na mreži.");
      }
    } finally {
      setIsClosingTender(false);
    }
  };

  // Provera ishoda tendera i asinhrono preuzimanje zaštićenih kontakt informacija investitora
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

      // Uslovni korak: Provera da li je ugovor u stanju mirovanja (ended)
      const isEnded = await contract.ended();
      if (!isEnded) {
        setWinnerResult({
          success: false,
          message: "⚠️ Investitor još uvek nije zvanično zatvorio ovaj tender. Sačekajte finalizaciju.",
        });
        setIsLoadingResult(false);
        return;
      }

      // Ako je pozivalac pobednik, ugovor uspešno vraća podatak, u suprotnom baca revert
      const secretContact = await contract.getInvestorContact();
      
      setWinnerResult({
        success: true,
        message: `🎉 Čestitamo! Vaša ponuda je odabrana kao najpovoljnija. Kontakt investitora: ${secretContact}`,
      });
    } catch (err) {
      console.error("Kriptografska provera pobednika nije prošla:", err);
      
      setWinnerResult({
        success: false,
        message: `Najniža zabeležena ponuda iznosi ${ethers.formatEther(selectedTender.lowestBid)} ETH. Vaša adresa (${derivedAddress}) nije proglašena za pobednika.`,
      });
    } finally {
      setIsLoadingResult(false);
    }
  };

  // Povlačenje garantnog depozita sa pametnog ugovora (izvršava izvođač koji je izgubio)
  const withdrawMyDeposit = async () => {
    if (!selectedTender) return alert("Tender nije odabran!");
    if (!bidderPrivateKey) return alert("Unesite privatni ključ vašeg naloga!");
    if (!derivedAddress) return alert("Privatni ključ nije validan!");

    setIsWithdrawing(true);
    try {
      const provider = new ethers.JsonRpcProvider(ganacheUrl);
      const signer = new ethers.Wallet(bidderPrivateKey, provider);
      const contract = new ethers.Contract(
        selectedTender.address,
        contractArtifact.abi,
        signer
      );

      console.log(`Zahtev za povraćaj depozita šalje: ${signer.address}`);
      
      const tx = await contract.withdrawDeposit();
      await tx.wait();

      alert("💸 Vaš depozit od 0.05 ETH je uspešno povučen i vraćen na vaš nalog u Ganache-u!");
      setSelectedTender(null);
      window.location.reload();
    } catch (err) {
      console.error("Greška pri povlačenju depozita:", err);
      alert("Nemate sredstava za podizanje ili je transakcija odbijena.");
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Evaluacija vremenskog roka na klijentskoj strani radi uslovnog prikazivanja komponenti
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
            <p><strong>Preostalo vreme:</strong> <br /><TimeRemaining tenderEndTime={selectedTender.tenderEndTime} /></p>
            <p><strong>Adresa tendera:</strong> <br /><code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>{selectedTender.address}</code></p>
          </div>

          {/* Administrativni panel za investitora - dostupan nezavisno od stanja ugovora */}
          <div className="admin-zone" style={{ marginTop: "20px", padding: "15px", border: "2px dashed #b1dfbb", backgroundColor: "#f8fff9", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#1e7e34" }}>🔐 Kontrolni panel za Investitora (Vlasnika)</h4>
            
            {!isTimeExpired ? (
              <p style={{ margin: "0", color: "#856404", fontSize: "0.9em", backgroundColor: "#fff3cd", padding: "8px", borderRadius: "4px" }}>
                ⏳ Tender je u toku. Funkcija za zatvaranje ugovora i proglašenje pobednika biće dostupna nakon isteka roka.
              </p>
            ) : (
              <>
                <p style={{ margin: "0 0 10px 0", fontSize: "0.9em", color: "#155724" }}>
                  ⏰ <strong>Vreme za slanje ponuda je isteklo.</strong> Unesite privatni ključ investitora radi finalizacije ugovora.
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
                      📍 Verifikovana javna adresa: <code>{derivedManagerAddress}</code>
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

          {/* Korisnički panel za izvođače (Majstore) */}
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
                  <strong>📍 Dekodirana adresa ponuđača:</strong> <br />
                  <code style={{ fontSize: "0.85em", wordBreak: "break-all", color: "#2e7d32" }}>{derivedAddress}</code>
                </p>
              </div>
            )}
          </div>

          {/* Faza otvorenog tendera: Omogućeno slanje novih kompetitivnih ponuda */}
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
                  Vrednost mora biti striktno manja od trenutne najniže ponude (<strong>{ethers.formatEther(selectedTender.lowestBid)} ETH</strong>).
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

          {/* Faza zatvorenog tendera: Onemogućeno slanje, dozvoljena evaluacija ishoda */}
          {isTimeExpired && (
            <>
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
                <>
                  <div style={{ marginTop: "20px", padding: "15px", backgroundColor: winnerResult.success ? "#d4edda" : "#f8d7da", border: `1px solid ${winnerResult.success ? "#28a745" : "#f5c6cb"}`, borderRadius: "4px" }}>
                    <p style={{ margin: "0" }}><strong style={{ color: winnerResult.success ? "#155724" : "#721c24" }}>{winnerResult.message}</strong></p>
                  </div>

                  {/* Dugme za povraćaj depozita se prikazuje ispod poruke isključivo ako majstor nije pobednik i tender je stvarno zatvoren */}
                  {!winnerResult.success && !winnerResult.message.includes("još uvek nije zvanično zatvorio") && (
                    <div style={{ marginTop: "12px" }}>
                      <button
                        className="btn-submit"
                        onClick={withdrawMyDeposit}
                        disabled={isWithdrawing}
                        style={{ backgroundColor: "#007bff", width: "100%", padding: "10px", fontWeight: "bold" }}
                      >
                        {isWithdrawing ? "Povlačenje depozita sa ugovora..." : "💰 Povrati moj depozit (0.05 ETH)"}
                      </button>
                    </div>
                  )}
                </>
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