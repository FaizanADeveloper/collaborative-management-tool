
import React from "react";
import { NavLink } from "react-router-dom";


function Sidebar() {
  return (
    <div className="sidebar">

      <h3 className="sidebar-title">MENU</h3>

      <ul className="sidebar-menu">

        <li>
          <NavLink to="/dashboard">
            <span>🏠</span>
            Dashboard
          </NavLink>
        </li>

        <li>
          <NavLink to="/projects">
            <span>📁</span>
            Projects
          </NavLink>
        </li>

        <li>
          <NavLink to="/tasks">
            <span>📋</span>
            My Tasks
          </NavLink>
        </li>

        <li>
          <NavLink to="/team">
            <span>👥</span>
            Team Members
          </NavLink>
        </li>

        <li>
          <NavLink to="/profile">
            <span>👤</span>
            My Profile
          </NavLink>
        </li>

      </ul>

      <div className="sidebar-bottom">
        <NavLink to="/login">
          <span>🚪</span>
          Logout
        </NavLink>
      </div>

    </div>
  );
}

export default Sidebar;
