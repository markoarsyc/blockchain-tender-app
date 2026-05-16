import { useState, useEffect } from "react";

function TimeRemaining({ tenderEndTime, onExpired }) {
  const [timeRemaining, setTimeRemaining] = useState("");

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const currentTime = Math.floor(Date.now() / 1000); // Trenutno vreme u sekundama
      const secondsLeft = Math.max(0, Number(tenderEndTime) - currentTime);

      if (secondsLeft === 0) {
        setTimeRemaining("Tender istekao");
        if (onExpired) onExpired();
        return;
      }

      // Konvertuj u HH:MM:SS
      const hours = Math.floor(secondsLeft / 3600);
      const minutes = Math.floor((secondsLeft % 3600) / 60);
      const seconds = secondsLeft % 60;

      const formatted = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(seconds).padStart(2, "0")}`;

      setTimeRemaining(formatted);
    };

    // Izračunaj odmah
    calculateTimeRemaining();

    // Ažuriraj svaku sekundu
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [tenderEndTime, onExpired]);

  const isExpired = timeRemaining === "Tender istekao";

  return (
    <span className={isExpired ? "time-expired" : "time-remaining"}>
      ⏱️ {timeRemaining}
    </span>
  );
}

export default TimeRemaining;
