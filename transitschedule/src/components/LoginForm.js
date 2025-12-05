import React, { useState } from "react";
import { login } from "../services/authService";
import "./AuthForms.css";

const LoginForm = ({ onLoginSuccess, onSwitchToSignup }) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

    try {
      await login(formData.email, formData.password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="edit-form-title">Login</h2>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
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
        <div className="edit-form-buttons">
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="edit-form-cancel"
          >
            Create Account
          </button>
          <button type="submit" className="edit-form-review" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;

