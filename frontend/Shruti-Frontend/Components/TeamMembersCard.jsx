import React from "react";

function TeamMembersCard({ member }) {

  if (!member) {
    return <p>Team member data not found</p>;
  }

  return (
    <div className="team-member-card">

      <div className="member-image">
        <img
          src={member.image || "/default-avatar.png"}
          alt={member.name || "Team Member"}
        />
      </div>

      <div className="member-details">
        <h3>{member.name || "No Name"}</h3>

        <p className="member-role">
          {member.role || "No Role"}
        </p>

        <p className="member-email">
          {member.email || "No Email"}
        </p>

        <span className={`member-status ${(member.status || "unknown").toLowerCase()}`}>
          {member.status || "Unknown"}
        </span>

        <button className="view-profile-btn">
          View Profile
        </button>
      </div>

    </div>
  );
}

export default TeamMembersCard;