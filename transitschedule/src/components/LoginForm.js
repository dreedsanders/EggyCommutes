import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { loginUser, selectAuthError, selectAuthLoading } from "../store/slices/authSlice";
import "./AuthForms.css";

const LoginForm = ({ onLoginSuccess, onSwitchToSignup }) => {
  const dispatch = useAppDispatch();
  const authError = useAppSelector(selectAuthError);
  const authLoading = useAppSelector(selectAuthLoading);
  
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
    console.log("[LoginForm] Form submitted");
    console.log("[LoginForm] Email:", formData.email ? "provided" : "missing");
    console.log("[LoginForm] Password:", formData.password ? "provided" : "missing");
    
    setError("");
    setLoading(true);

    try {
      console.log("[LoginForm] Dispatching loginUser action...");
      const result = await dispatch(loginUser({ email: formData.email, password: formData.password }));
      
      if (loginUser.fulfilled.match(result)) {
        console.log("[LoginForm] Login successful, calling onLoginSuccess");
        onLoginSuccess();
      } else {
        // Login failed
        const errorMsg = result.payload || "Login failed. Please try again.";
        setError(errorMsg);
        console.error("[LoginForm] Login failed:", errorMsg);
      }
    } catch (err) {
      console.error("[LoginForm] Login error:", err);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      console.log("[LoginForm] Setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="auth-form-container">
      <h2 className="edit-form-title">Login</h2>
      {(error || authError) && <div className="auth-error">{error || authError}</div>}
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
          <button type="submit" className="edit-form-review" disabled={loading || authLoading}>
            {(loading || authLoading) ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;

