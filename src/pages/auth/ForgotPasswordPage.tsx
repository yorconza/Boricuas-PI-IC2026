/**
 * ============================================================================
 * Archivo: ForgotPasswordPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla para recuperar la contraseña. Actualmente es solo una interfaz
 * de demostración: muestra un formulario para ingresar el correo y simula
 * el envío de un enlace de recuperación.
 *
 * Componentes que utiliza
 * - React Router (navegación de regreso al login)
 *
 * Flujo
 * 1. Usuario ingresa su correo electrónico
 * 2. Hace clic en "Send reset link"
 * 3. Se muestra un alert() simulando el envío
 *
 * Cambios para Backend
 * Cuando exista el backend, esta página deberá:
 * ✓ Consumir POST /api/auth/forgot-password
 * ✓ Enviar un correo real con un enlace de recuperación
 * ✓ Manejar errores (correo no registrado, etc.)
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Se ha enviado un enlace de recuperación a tu correo (demo).');
  };

  return (
    <div className="forgot-wrapper">
      <div className="forgot-card">
        <div className="form-content active" id="forgotContent">
          <div className="brand-icon">D</div>
          <h1>Reset your password</h1>
          <p>Enter the email address associated with your account and we'll send you a link to reset your password.</p>

          <form id="forgotForm" onSubmit={handleSubmit}>
            <div className="input-group">
              <label htmlFor="reset-email">E-MAIL</label>
              <input
                type="email"
                id="reset-email"
                placeholder="Enter your email address"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn-primary">Send reset link</button>

            <div className="form-footer">
              <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }}>Back to Sign In</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
