
import React, { useState } from "react";
import TeamMembersCard from "../Components/TeamMembersCard";


function TeamMembers() {

  const [selectedMember, setSelectedMember] = useState(null);

  const members = [
    {
      id: 1,
      name: "Rahul Sharma",
      role: "Frontend Developer",
      email: "rahul@gmail.com",
      phone: "9876543210",
      image: "https://i.pravatar.cc/150?img=12",
      status: "Active"
    },
    {
      id: 2,
      name: "Priya Patil",
      role: "UI/UX Designer",
      email: "priya@gmail.com",
      phone: "9876543211",
      image: "https://i.pravatar.cc/150?img=47",
      status: "Offline"
    },
    {
      id: 3,
      name: "Amit Verma",
      role: "Backend Developer",
      email: "amit@gmail.com",
      phone: "9876543212",
      image: "https://i.pravatar.cc/150?img=11",
      status: "Active"
    }
  ];

  return (
    <div className="team-page">

      <h2>Team Members</h2>
      <p>Manage your team members</p>

      <div className="team-members">

        {members.map((member) => (
          <TeamMembersCard
            key={member.id}
            member={member}
            onViewProfile={() => setSelectedMember(member)}
          />
        ))}

      </div>

      {selectedMember && (
        <div className="member-details-box">

          <button
            className="close-btn"
            onClick={() => setSelectedMember(null)}
          >
            ✕
          </button>

          <img src={selectedMember.image} alt={selectedMember.name} />

          <h2>{selectedMember.name}</h2>
          <p>{selectedMember.role}</p>
          <p>Email: {selectedMember.email}</p>
          <p>Phone: {selectedMember.phone}</p>
          <p>Status: {selectedMember.status}</p>

        </div>
      )}

    </div>
  );
}

export default TeamMembers;
