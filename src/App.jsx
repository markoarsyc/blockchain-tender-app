import { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navigation from "./components/Navigation";
import CreateTender from "./components/CreateTender";
import ActiveTenders from "./components/ActiveTenders";
import "./App.css";

function App() {
  // Globalno stanje za adresu ugovora kako bi stranice mogle da komuniciraju
  const [contractAddress, setContractAddress] = useState("");

  return (
    <Router>
      <div className="container">
        <h1>🏗️ Platforma za Tendere Zgrada</h1>
        
        {/* Navigacioni meni koji će uvek biti vidljiv na vrhu */}
        <Navigation />
        
        <hr />

        {/* Definicija ruta između stranica */}
        <Routes>
          {/* Podrazumevana ruta nas vodi na kreiranje tendera */}
          <Route path="/" element={<Navigate to="/create" />} />
          
          <Route 
            path="/create" 
            element={
              <CreateTender 
                setContractAddress={setContractAddress} 
              />
            } 
          />
          
          <Route 
            path="/bidding" 
            element={
              <ActiveTenders 
                contractAddress={contractAddress} 
                setContractAddress={setContractAddress} 
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;