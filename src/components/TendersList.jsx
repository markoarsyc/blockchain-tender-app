import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractArtifact from "../contractArtifact.json";
import TimeRemaining from "./TimeRemaining";

// Lokalni RPC čvor (Ganache) na kojem se nalaze instance pametnih ugovora
const ganacheUrl = "http://127.0.0.1:7545";

function TendersList({ onSelectTender }) {
  const [tenders, setTenders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTenders();
  }, []);

  // Asinhrono preuzimanje stanja svih registrovanih ugovora sa blockchain mreže
  const loadTenders = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Čitanje nizova adresa ugovora koji su sačuvani u perzistentnoj memoriji pretraživača
      const storedAddresses = JSON.parse(
        localStorage.getItem("tender_addresses") || "[]"
      );

      if (storedAddresses.length === 0) {
        setTenders([]);
        setIsLoading(false);
        return;
      }

      const provider = new ethers.JsonRpcProvider(ganacheUrl);

      // Paralelno mapiranje i upit za svaku adresu ugovora radi optimizacije performansi (Promise.all)
      const tendersData = await Promise.all(
        storedAddresses.map(async (address) => {
          try {
            const contract = new ethers.Contract(
              address,
              contractArtifact.abi,
              provider
            );

            // Istovremeno čitanje javnih stanja (getters) iz skladišta pametnog ugovora
            const [desc, lowestBid, tenderEndTime, ended, lowestBidder] = await Promise.all([
              contract.jobDescription(),
              contract.lowestBid(),
              contract.tenderEndTime(),
              contract.ended(),
              contract.lowestBidder(),
            ]);

            return {
              address,
              jobDescription: desc,
              lowestBid: lowestBid.toString(),
              tenderEndTime: tenderEndTime.toString(),
              ended,
              lowestBidder,
              isValid: true,
            };
          } catch (err) {
            console.error(`Greška pri čitanju ugovora na adresi ${address}:`, err);
            return {
              address,
              isValid: false,
              error: "Nije moguće pročitati podatke sa ugovora",
            };
          }
        })
      );

      const currentTime = Math.floor(Date.now() / 1000);
      const validTenders = tendersData.filter((t) => t.isValid);
      
      // Filtriranje ugovora na osnovu preostalog vremena i stanja varijable 'ended' na blockchain-u
      const activeTenders = validTenders.filter((tender) => {
        const tenderEndTime = Number(tender.tenderEndTime);
        return currentTime <= tenderEndTime && !tender.ended;
      });

      const completedTenders = validTenders.filter((tender) => {
        const tenderEndTime = Number(tender.tenderEndTime);
        return currentTime > tenderEndTime || tender.ended;
      });

      // Spajanje kategorisanih podataka u jedinstven niz sa flagom aktivnog statusa
      const allTenders = [
        ...activeTenders.map((t) => ({ ...t, isActive: true })),
        ...completedTenders.map((t) => ({ ...t, isActive: false })),
      ];

      setTenders(allTenders);
    } catch (err) {
      console.error("Sistemska greška pri komunikaciji sa čvorom:", err);
      setError(
        "Greška pri učitavanju tendera. Proverite da li je lokalna blockchain mreža pokrenuta."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTenderExpired = () => {
    loadTenders();
  };

  // Pomoćna metoda za konverziju Wei vrednosti u čitljiv ETH format
  const formatWei = (weiValue) => {
    try {
      const ethValue = ethers.formatEther(weiValue);
      return `${ethValue} ETH`;
    } catch {
      return `${weiValue}`;
    }
  };

  if (isLoading) {
    return <div className="tenders-container"><p className="loading-text">Učitavam tendere sa blockchain mreže...</p></div>;
  }

  if (error) {
    return <div className="tenders-container"><p className="error-text">{error}</p></div>;
  }

  if (tenders.length === 0) {
    return (
      <div className="tenders-container">
        <p className="info-text">📭 Trenutno nema registrovanih tendera. Kreirajte novi tender na odgovarajućem panelu.</p>
      </div>
    );
  }

  const activeTenders = tenders.filter((t) => t.isActive);
  const completedTenders = tenders.filter((t) => !t.isActive);

  return (
    <div className="tenders-container">
      {/* Prikaz tendera koji su u fazi aktivnog nadmetanja */}
      {activeTenders.length > 0 && (
        <div className="tenders-section">
          <h3>📋 Aktivni Tenderi ({activeTenders.length})</h3>
          <div className="tenders-list">
            {activeTenders.map((tender) => (
              <div key={tender.address} className="tender-card tender-active">
                <div className="tender-header">
                  <h4>{tender.jobDescription}</h4>
                  <TimeRemaining
                    tenderEndTime={tender.tenderEndTime}
                    onExpired={handleTenderExpired}
                  />
                </div>
                <div className="tender-details">
                  <p>
                    <strong>Trenutna najniža ponuda:</strong>{" "}
                    {formatWei(tender.lowestBid)}
                  </p>
                  <p>
                    <strong>Adresa tendera:</strong>
                    <br />
                    <code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
                      {tender.address}
                    </code>
                  </p>
                </div>
                <button
                  className="btn-select-tender"
                  onClick={() => onSelectTender(tender)}
                >
                  🔨 Pošalji Ponudu
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prikaz istorijskih tendera čiji je rok istekao ili su zatvoreni */}
      {completedTenders.length > 0 && (
        <div className="tenders-section">
          <h3>✅ Završeni Tenderi ({completedTenders.length})</h3>
          <div className="tenders-list">
            {completedTenders.map((tender) => (
              <div key={tender.address} className="tender-card tender-completed">
                <div className="tender-header">
                  <h4>{tender.jobDescription}</h4>
                  <span className="badge-completed">❌ Istekao</span>
                </div>
                <div className="tender-details">
                  <p>
                    <strong>Pobednička ponuda:</strong>{" "}
                    {formatWei(tender.lowestBid)}
                  </p>
                  <p>
                    <strong>Pobednička adresa:</strong>
                    <br />
                    <code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
                      {tender.lowestBidder && tender.lowestBidder !== "0x0000000000000000000000000000000000000000"
                        ? tender.lowestBidder
                        : "Nema podnetih ponuda"}
                    </code>
                  </p>
                  <p>
                    <strong>Adresa tendera:</strong>
                    <br />
                    <code style={{ fontSize: "0.85em", wordBreak: "break-all" }}>
                      {tender.address}
                    </code>
                  </p>
                </div>
                <button
                  className="btn-select-tender"
                  onClick={() => onSelectTender(tender)}
                  title="Pogledaj ishode i kontakt podatke"
                >
                  🔑 Pogledaj Rezultat / Kontakt
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TendersList;