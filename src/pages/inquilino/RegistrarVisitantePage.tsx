/**
 * ============================================================================
 * Archivo: RegistrarVisitantePage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla donde el inquilino registra un nuevo visitante. Debe ingresar
 * nombre, documento, placa (opcional) y hora esperada. Al registrarse,
 * el visitante queda en estado "Pendiente" hasta que el guardia lo autorice.
 *
 * Componentes que utiliza
 * - PageHeader (título)
 * - useData (contexto: inquilinoVisitantesData, setInquilinoVisitantes)
 * - useToast (notificaciones)
 * - React Router (navegación)
 *
 * ============================================================================
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/Toast';
import { inquilinoService } from '../../services/inquilinoService';

export default function RegistrarVisitantePage() {
  const navigate = useNavigate();
  const { recargarVisitantesInquilino, addNotification } = useData();
  const { showToast } = useToast();
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [placa, setPlaca] = useState('');
  const [horaEsperada, setHoraEsperada] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !documento) {
      showToast('Nombre y documento son obligatorios.', 'error');
      return;
    }

    setEnviando(true);
    try {
      await inquilinoService.registrarVisitante({
        nombre_completo: nombre,
        documento_identidad: documento,
        placa: placa || undefined,
        hora_esperada: horaEsperada || ''
      });

      await recargarVisitantesInquilino();

      showToast(`Visitante ${nombre} registrado exitosamente.`, 'success');
      addNotification('inquilino', 'Nuevo visitante', `Has registrado a ${nombre} como visitante.`);
      setNombre('');
      setDocumento('');
      setPlaca('');
      setHoraEsperada('');
      navigate('/inquilino#mis-visitantes');
    } catch (err) {
      console.error('Error al registrar visitante:', err);
      showToast('No se pudo registrar el visitante. Intenta de nuevo.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <PageHeader title="Registrar Visitante" />
      <div className="card">
        <form id="registrarVisitanteForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="visitanteNombre">Nombre completo *</label>
            <input type="text" id="visitanteNombre" required placeholder="Nombre completo del visitante" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="visitanteDocumento">Documento de identidad *</label>
            <input type="text" id="visitanteDocumento" required placeholder="Cédula o pasaporte" value={documento} onChange={e => setDocumento(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="visitantePlaca">Placa (opcional)</label>
            <input type="text" id="visitantePlaca" placeholder="Número de placa" value={placa} onChange={e => setPlaca(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="visitanteHoraEsperada">Hora esperada</label>
            <input type="time" id="visitanteHoraEsperada" value={horaEsperada} onChange={e => setHoraEsperada(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" disabled={enviando} style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
            {enviando ? 'Registrando...' : 'Registrar visitante'}
          </button>
        </form>
      </div>
    </>
  );
}
