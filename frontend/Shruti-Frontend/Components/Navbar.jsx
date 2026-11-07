import React from "react";
import { NavLink } from "react-router-dom";


function Navbar() {
  return (
    <nav className="navbar">

      <div className="navbar-logo">
        <h2>TeamFlow</h2>
      </div>

      <div className="navbar-search">
        <input
          type="text"
          placeholder="Search here..."
        />
      </div>

      <div className="navbar-right">

        <button className="notification-btn">
          🔔
        </button>

        <NavLink to="/profile" className="navbar-profile">

          <img
            src="Shruti.jpg"
            alt="Profile"
          />

          <div>
            <h4>Shruti</h4>
            <span>Team Member</span>
          </div>

        </NavLink>

      </div>

    </nav>
  );
}

export default Navbar;