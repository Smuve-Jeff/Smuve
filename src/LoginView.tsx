
import React from 'react';

interface LoginViewProps {
  onLogin: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  return (
    <div className="login-view">
      <h1>Login</h1>
      <button onClick={onLogin}>Log In</button>
    </div>
  );
};

export default LoginView;
