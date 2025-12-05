import React, { useState } from "react";
import LoginForm from "./LoginForm";
import CreateAccountForm from "./CreateAccountForm";
import "./AuthPage.css";

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);

  // Background image path - using process.env.PUBLIC_URL for proper path resolution
  const backgroundImageUrl = `${
    process.env.PUBLIC_URL || ""
  }/images/Commute_Champions.jpg`;

  return (
    <div
      className="auth-page-container"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
      }}
    >
      <div className="auth-form-wrapper">
        {isLogin ? (
          <LoginForm
            onLoginSuccess={onLoginSuccess}
            onSwitchToSignup={() => setIsLogin(false)}
          />
        ) : (
          <CreateAccountForm
            onSignupSuccess={onLoginSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
};

export default AuthPage;

