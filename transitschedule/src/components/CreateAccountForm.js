import React, { useState } from "react";
import { createAccount } from "../services/authService";
import "./AuthForms.css";

const CreateAccountForm = ({ onSignupSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirmation: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate password confirmation
    if (formData.password !== formData.passwordConfirmation) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      await createAccount(
        formData.name,
        formData.email,
        formData.password,
        formData.passwordConfirmation
      );
      onSignupSuccess();
    } catch (err) {
      setError(err.message || "Account creation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="edit-form-title">Create Account</h2>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="edit-form-field">
          <label>Name:</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="edit-form-input"
            placeholder="Enter your name"
            required
          />
        </div>
        <div className="edit-form-field">
          <label>Email:</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="edit-form-input"
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="edit-form-field">
          <label>Password:</label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleChange("password", e.target.value)}
            className="edit-form-input"
            placeholder="Enter your password"
            required
          />
        </div>
        <div className="edit-form-field">
          <label>Password Confirmation:</label>
          <input
            type="password"
            value={formData.passwordConfirmation}
            onChange={(e) => handleChange("passwordConfirmation", e.target.value)}
            className="edit-form-input"
            placeholder="Confirm your password"
            required
          />
        </div>
        <div className="edit-form-buttons">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="edit-form-cancel"
          >
            Back to Login
          </button>
          <button type="submit" className="edit-form-review" disabled={loading}>
            {loading ? "Creating..." : "Create Account"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAccountForm;

