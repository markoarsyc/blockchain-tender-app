import { NavLink } from "react-router-dom";

function Navigation() {
  return (
    <nav className="navigation-tabs">
      <NavLink 
        to="/create" 
        className={({ isActive }) => isActive ? "active" : ""}
      >
        ➕ Kreiraj Novi Tender
      </NavLink>
      <NavLink 
        to="/bidding" 
        className={({ isActive }) => isActive ? "active" : ""}
      >
        🔨 Aktivni Tenderi i Ponude
      </NavLink>
    </nav>
  );
}

export default Navigation;