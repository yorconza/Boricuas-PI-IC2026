/**
 * ============================================================================
 * Archivo: LoginPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de inicio de sesión y registro. Permite al usuario iniciar
 * sesión con correo y contraseña, o crear una cuenta nueva.
 *
 * Componentes que utiliza
 * - useAuth (contexto de autenticación)
 * - authService (servicio de autenticación simulado)
 * - React Router (navegación)
 *
 * Flujo
 * 1. Usuario ingresa credenciales
 * 2. Se validan los campos localmente
 * 3. authService.iniciarSesion() verifica el dominio del correo
 * 4. Se guarda el usuario en el contexto global
 * 5. Redirecciona a /2fa para verificación de dos pasos
 *
 * Credenciales de prueba
 * - admin@admin.com → Administrador
 * - guardia@guardia.com → Guardia
 * - cualquier@correo.com → Inquilino
 *
 * Cambios para Backend
 * Cuando exista el backend, esta página deberá:
 * ✓ Consumir POST /api/auth/login
 * ✓ Mostrar errores HTTP específicos (400, 401, 403)
 * ✓ Soporte para "¿Olvidaste tu contraseña?" real
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorLogin, setErrorLogin] = useState<string | null>(null);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const { guardarUsuarioParcial, registrarUsuarioDirecto } = useAuth();
  const navigate = useNavigate();

  const activateTab = (tabName: 'signin' | 'signup') => {
    setIsSignUp(tabName === 'signup');
  };

  const handleSignIn = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorLogin(null);

    if (!loginEmail.includes('@')) {
      setErrorLogin('Please enter a valid email address.');
      return;
    }
    if (!loginPassword.trim()) {
      setErrorLogin('Password cannot be empty.');
      return;
    }

    try {
      const usuario = await authService.iniciarSesion({
        correo: loginEmail,
        contrasena: loginPassword,
      });
      guardarUsuarioParcial(usuario);
      navigate('/2fa');
    } catch (err) {
      setErrorLogin(err instanceof Error ? err.message : 'An unexpected error occurred.');
    }
  };

  const handleSignUp = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorRegistro(null);

    if (signupPassword !== confirmPassword) {
      setErrorRegistro('Passwords do not match.');
      return;
    }

    const passwordRegex = /^(?=.*[!@#$%^&*(),.?":{}|<>]).{8,12}$/;
    if (!passwordRegex.test(signupPassword)) {
      setErrorRegistro('Password must be 8-12 characters with at least one special character.');
      return;
    }

    if (!termsAccepted) {
      setErrorRegistro('You must accept the terms of service.');
      return;
    }

    try {
      const usuario = await authService.registrarUsuario({
        nombreCompleto: fullName,
        correo: signupEmail,
        contrasena: signupPassword,
        telefono: phone || undefined,
      });
      registrarUsuarioDirecto(usuario);
      navigate('/dashboard/inquilino');
    } catch (err) {
      setErrorRegistro(err instanceof Error ? err.message : 'Registration failed.');
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card" id="mainCard">
        {/* Panel Visual */}
        <div className="panel panel-visual" id="panelVisual">
          <div className="visual-content">
            <div className="brand-icon"><i className="fas fa-building"></i></div>
            <h1>Condominium</h1>
            <p>Smart management for your condominium.</p>
            <div className="tagline">Simple • Secure • Efficient</div>
          </div>
        </div>

        {/* Panel del Formulario */}
        <div className="panel panel-form" id="panelForm">
          <div className="form-wrapper">
            {/* Título y subtítulo dinámicos */}
            <h2 className="form-title" id="formTitle">
              {isSignUp ? 'Everything your condominium needs, in one place.' : 'Welcome Back'}
            </h2>
            <p className="form-subtitle" id="formSubtitle">Please enter your details</p>

            {/* Toggle estilo Apple */}
            <div className="toggle-container">
              <div className="toggle" id="toggle">
                <span className={`toggle-slider ${isSignUp ? 'right' : ''}`} id="toggleSlider"></span>
                <span
                  className={`toggle-option ${!isSignUp ? 'active' : ''}`}
                  data-tab="signin"
                  onClick={() => activateTab('signin')}
                >
                  Sign In
                </span>
                <span
                  className={`toggle-option ${isSignUp ? 'active' : ''}`}
                  data-tab="signup"
                  onClick={() => activateTab('signup')}
                >
                  Sign Up
                </span>
              </div>
            </div>

            {/* SIGN IN */}
            <div id="signinForm" className={`form-content ${!isSignUp ? 'active' : ''}`}>
              {errorLogin && <p className="error">{errorLogin}</p>}
              <div className="input-group">
                <label htmlFor="login-email">E-MAIL</label>
                <input
                  type="email"
                  id="login-email"
                  placeholder="Enter your email address"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="login-password">PASSWORD</label>
                <input
                  type="password"
                  id="login-password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                />
              </div>
              <div className="forgot-password">
                <a href="/forgot" onClick={e => { e.preventDefault(); navigate('/forgot'); }}>Forgot your password?</a>
              </div>
              <button className="login-btn-primary" onClick={handleSignIn}>Sign In</button>
              <div className="form-footer">
                <a id="signupTrigger" onClick={() => activateTab('signup')}>Create an account</a>
              </div>
            </div>

            {/* SIGN UP */}
            <div id="signupForm" className={`form-content ${isSignUp ? 'active' : ''}`}>
              <div className="input-group">
                <label htmlFor="nombre_completo">FULL NAME</label>
                <input
                  type="text"
                  id="nombre_completo"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="contraseña_hash">PASSWORD</label>
                <input
                  type="password"
                  id="contraseña_hash"
                  placeholder="Enter your password"
                  value={signupPassword}
                  onChange={e => setSignupPassword(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="confirm_password">CONFIRM PASSWORD</label>
                <input
                  type="password"
                  id="confirm_password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="correo">E-MAIL</label>
                <input
                  type="email"
                  id="correo"
                  placeholder="Enter your email address"
                  value={signupEmail}
                  onChange={e => setSignupEmail(e.target.value)}
                />
              </div>
              <div className="input-group">
                <label htmlFor="telefono">Phone</label>
                <input
                  type="tel"
                  id="telefono"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={e => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="terms">I agree all statements in <a href="#">terms of service</a></label>
              </div>
              {errorRegistro && <p className="error">{errorRegistro}</p>}
              <button className="login-btn-primary" onClick={handleSignUp}>Sign Up</button>
              <div className="form-footer">
                <a id="signinTrigger" onClick={() => activateTab('signin')}>I'm already a member</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
