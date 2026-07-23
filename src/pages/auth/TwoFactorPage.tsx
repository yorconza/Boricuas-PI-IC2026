/**
 * ============================================================================
 * Archivo: TwoFactorPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de verificación en dos pasos (2FA). Después del login, el usuario
 * debe ingresar un código de 6 dígitos enviado a su correo para completar
 * la autenticación. El código expira a los 5 minutos.
 *
 * Componentes que utiliza
 * - useAuth (contexto de autenticación)
 * - authService (servicio simulado de verificación 2FA)
 * - React Router (navegación y protección de ruta)
 *
 * Flujo
 * 1. El usuario llega aquí después del login exitoso
 * 2. Ingresa el código de 6 dígitos (o pega desde el portapapeles)
 * 3. El código correcto es "123456" (simulado)
 * 4. Si es correcto: redirecciona al dashboard según su rol
 * 5. Si es incorrecto: muestra mensaje de error
 * 6. El código expira a los 5 minutos (contador regresivo visible)
 * 7. Botón "Reenviar código" se habilita después de 30 segundos
 *
 * Seguridad (simulada)
 * - Tiempo de expiración: 300 segundos (5 minutos)
 * - Reintentos: ilimitados (simulado, en producción deberían limitarse)
 * - Protección de ruta: redirecciona a /login si no hay usuario
 *
 * Cambios para Backend
 * Cuando exista el backend, esta página deberá:
 * ✓ Consumir POST /api/auth/verify-2fa
 * ✓ Consumir POST /api/auth/resend-2fa
 * ✓ Limitar intentos fallidos (ej: 3 intentos → bloquear)
 * ✓ Enviar el código por correo real o SMS
 *
 * ============================================================================
 */

import { useState, useEffect, useRef, type FormEvent, type ClipboardEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';

const TIEMPO_EXPIRACION = 300; // 5 minutos en segundos

function formatoTiempo(segundos: number): string {
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}:${seg.toString().padStart(2, '0')}`;
}

export default function TwoFactorPage() {
  const navigate = useNavigate();
  const { usuario, completar2FA } = useAuth();

  const [codigo, setCodigo] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const [tiempoRestante, setTiempoRestante] = useState(TIEMPO_EXPIRACION);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Protección de ruta
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Contador regresivo
  useEffect(() => {
    if (tiempoRestante <= 0) return;

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTiempoRestante(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tiempoRestante]);

  const handleInput = (index: number, value: string) => {
    // Limpiar mensajes al escribir
    if (error) setError('');
    if (mensajeExito) setMensajeExito('');

    // Solo permitir dígitos
    if (!/^\d$/.test(value)) {
      return;
    }

    const nuevoCodigo = [...codigo];
    nuevoCodigo[index] = value;
    setCodigo(nuevoCodigo);

    // Avanzar al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (codigo[index]) {
        // Borrar el dígito actual
        const nuevoCodigo = [...codigo];
        nuevoCodigo[index] = '';
        setCodigo(nuevoCodigo);
      } else if (index > 0) {
        // Retroceder al input anterior
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    const textoPegado = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (textoPegado.length === 0) return;

    const nuevoCodigo = [...codigo];
    for (let i = 0; i < textoPegado.length; i++) {
      nuevoCodigo[i] = textoPegado[i];
    }
    setCodigo(nuevoCodigo);

    // Enfocar el siguiente input vacío o el último
    const siguienteVacio = nuevoCodigo.findIndex(c => !c);
    const indiceEnfoque = siguienteVacio >= 0 ? siguienteVacio : 5;
    inputRefs.current[indiceEnfoque]?.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');

    const codigoCompleto = codigo.join('');

    if (codigoCompleto.length < 6) {
      setError('Ingresa los 6 dígitos.');
      return;
    }

    if (tiempoRestante <= 0) {
      setError('El código ha expirado. Solicita uno nuevo.');
      return;
    }

    try {
      const resultado = await authService.verificarCodigo2FA(usuario.idUsuario, codigoCompleto);
      completar2FA(resultado.token);

      const rutaDash: Record<string, string> = {
        Administrador: '/admin',
        Guarda: '/guardia',
        Inquilino: '/inquilino',
      };
      navigate(rutaDash[usuario.rol] || '/inquilino', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al verificar el código.');
    }
  };

  const handleResend = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!puedeReenviar) return;
    setError('');
    setMensajeExito('');

    try {
      await authService.reenviarCodigo2FA(usuario.idUsuario);
      setTiempoRestante(TIEMPO_EXPIRACION);
      setMensajeExito('Nuevo código enviado a tu correo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reenviar el código.');
    }
  };

  // El botón de reenviar se habilita solo después de 30 segundos
  const puedeReenviar = tiempoRestante <= TIEMPO_EXPIRACION - 30;

  return (
    <div className="twofa-wrapper">
      <div className="twofa-card">
        <div className="form-content active" id="twofaContent">

          <div className="security-icon">
            <i className="bi bi-shield-lock-fill"></i>
          </div>

          <h1>Verificación de seguridad</h1>

          <p className={`timer${tiempoRestante <= 30 && tiempoRestante > 0 ? ' timer-warning' : ''}`}>
            Hemos enviado un código de 6 dígitos a tu correo electrónico.{' '}
            <span style={{ display: 'inline-block', minWidth: 50 }}>
              ({formatoTiempo(tiempoRestante)})
            </span>
            {tiempoRestante <= 30 && tiempoRestante > 0 && ' El código está por expirar.'}
          </p>

          <form id="twofaForm" onSubmit={handleSubmit}>
            {error && <p className="error">{error}</p>}
            {mensajeExito && <p className="success">{mensajeExito}</p>}

            <div className="code-inputs">
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[0]}
                ref={el => { inputRefs.current[0] = el; }}
                onChange={e => handleInput(0, e.target.value)}
                onKeyDown={e => handleKeyDown(0, e)}
                onPaste={handlePaste}
              />
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[1]}
                ref={el => { inputRefs.current[1] = el; }}
                onChange={e => handleInput(1, e.target.value)}
                onKeyDown={e => handleKeyDown(1, e)}
                onPaste={handlePaste}
              />
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[2]}
                ref={el => { inputRefs.current[2] = el; }}
                onChange={e => handleInput(2, e.target.value)}
                onKeyDown={e => handleKeyDown(2, e)}
                onPaste={handlePaste}
              />
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[3]}
                ref={el => { inputRefs.current[3] = el; }}
                onChange={e => handleInput(3, e.target.value)}
                onKeyDown={e => handleKeyDown(3, e)}
                onPaste={handlePaste}
              />
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[4]}
                ref={el => { inputRefs.current[4] = el; }}
                onChange={e => handleInput(4, e.target.value)}
                onKeyDown={e => handleKeyDown(4, e)}
                onPaste={handlePaste}
              />
              <input type="text" maxLength={1} pattern="[0-9]" inputMode="numeric" placeholder="0"
                value={codigo[5]}
                ref={el => { inputRefs.current[5] = el; }}
                onChange={e => handleInput(5, e.target.value)}
                onKeyDown={e => handleKeyDown(5, e)}
                onPaste={handlePaste}
              />
            </div>

            <button type="submit" className="login-btn-primary">Verificar código</button>

            <div className="twofa-actions">
              <button
                className="login-btn-secondary"
                id="resendCode"
                onClick={handleResend}
                disabled={!puedeReenviar}
                style={{ opacity: puedeReenviar ? 1 : 0.4 }}
              >
                Reenviar código
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
