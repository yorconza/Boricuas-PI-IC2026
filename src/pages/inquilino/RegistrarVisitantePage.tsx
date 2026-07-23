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

export default function RegistrarVisitantePage() {
  const navigate = useNavigate();
  const { inquilinoVisitantesData, setInquilinoVisitantes, addNotification } = useData();
  const { showToast } = useToast();
  const [nombre, setNombre] = useState('');
  const [documento, setDocumento] = useState('');
  const [placa, setPlaca] = useState('');
  const [horaEsperada, setHoraEsperada] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !documento) {
      showToast('Nombre y documento son obligatorios.', 'error');
      return;
    }
    const newId = inquilinoVisitantesData.length ? Math.max(...inquilinoVisitantesData.map(v => v.id)) + 1 : 1;
    const nuevoVisitante = {
      id: newId,
      nombre,
      documento,
      placa: placa || '',
      hora_esperada: horaEsperada || '--:--',
      estado: 'Pendiente' as const
    };
    setInquilinoVisitantes(prev => [...prev, nuevoVisitante]);
    showToast(`Visitante ${nombre} registrado exitosamente.`, 'success');
    addNotification('inquilino', 'Nuevo visitante', `Has registrado a ${nombre} como visitante.`);
    setNombre('');
    setDocumento('');
    setPlaca('');
    setHoraEsperada('');
    navigate('/inquilino#mis-visitantes');
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
          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 'var(--space-2)' }}>Registrar visitante</button>
        </form>
      </div>
    </>
  );
}
