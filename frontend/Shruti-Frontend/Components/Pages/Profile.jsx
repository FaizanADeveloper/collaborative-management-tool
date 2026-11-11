import React, { useState } from "react";


function Profile() {

  const [isEditing, setIsEditing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const [profileImage, setProfileImage] = useState("/Shruti.jpg");

  const [profile, setProfile] = useState({
    name: "Shruti Patil",
    email: "shruti@gmail.com",
    phone: "9876543210",
    role: "Frontend Developer",
    department: "Development",
    location: "Maharashtra, India"
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setProfile((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      const imageURL = URL.createObjectURL(file);
      setProfileImage(imageURL);
    }
  };

  const handleSave = () => {
    setIsEditing(false);
    alert("Profile updated successfully!");
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="profile-page">

      <h2>My Profile</h2>

      <p className="profile-subtitle">
        Manage your personal information
      </p>

      <div className="profile-container">

        {/* Profile Header */}

        <div className="profile-header">

          <div className="profile-image-upload">

            <button
              type="button"
              className="image-click-btn"
              onClick={() => setShowDetails(true)}
            >
              <img
                src={profileImage}
                alt="Profile"
                className="profile-image"
              />
            </button>

            <label className="change-photo">
              Change Photo

              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>

          </div>

          <div className="profile-heading">
            <h2>{profile.name}</h2>
            <p>{profile.role}</p>
            <button
              type="button"
              onClick={() => setShowDetails(true)}
            >
              View Profile
            </button>
          </div>

        </div>

        {/* Profile Details */}

        {showDetails && (

          <div className="profile-form">

            <h3>Personal Information</h3>

            <div className="profile-grid">

              <div className="profile-field">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="profile-field">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="profile-field">
                <label>Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="profile-field">
                <label>Job Role</label>
                <input
                  type="text"
                  name="role"
                  value={profile.role}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="profile-field">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={profile.department}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

              <div className="profile-field">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>

            </div>

            {/* Buttons */}

            <div className="profile-buttons">

              {!isEditing ? (

                <button
                  type="button"
                  className="edit-profile-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>

              ) : (

                <>
                  <button
                    type="button"
                    className="save-profile-btn"
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    className="cancel-profile-btn"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                </>

              )}

              <button
                type="button"
                className="close-profile-btn"
                onClick={() => {
                  setShowDetails(false);
                  setIsEditing(false);
                }}
              >
                Close Profile
              </button>

            </div>

          </div>

        )}

      </div>

    </div>
  );
}

export default Profile;