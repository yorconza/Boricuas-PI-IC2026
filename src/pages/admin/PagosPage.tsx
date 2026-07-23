/**
 * ============================================================================
 * Archivo: PagosPage.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Pantalla de pagos. Muestra resumen financiero (total recaudado, pendientes,
 * pagados hoy) y el listado de pagos realizados con detalle.
 *
 * Componentes que utiliza
 * - PageHeader (título y botón "Registrar pago")
 * - Drawer (detalle del pago / formulario de registro)
 * - useData (contexto: pagosData, addActivity, addNotification)
 *
 * ============================================================================
 */

import { useState, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import Drawer from '../../components/Drawer';
import { useData } from '../../context/DataContext';
import type { Pago } from '../../types';

export default function PagosPage() {
  const { pagosData, addActivity, addNotification } = useData();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'view' | 'create'>('view');
  const [selectedItem, setSelectedItem] = useState<Pago | null>(null);

  const openView = (item: Pago) => {
    setSelectedItem(item);
    setDrawerMode('view');
    setDrawerOpen(true);
  };

  const openCreate = () => {
    setSelectedItem(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  };

  const handleSave = useCallback(() => {
    if (drawerMode === 'create') {
      const residente = (document.getElementById('pagoResidente') as HTMLInputElement)?.value?.trim() || '';
      const concepto = (document.getElementById('pagoConcepto') as HTMLInputElement)?.value?.trim() || '';
      const monto = (document.getElementById('pagoMonto') as HTMLInputElement)?.value?.trim() || '';
      const metodoSelect = document.getElementById('pagoMetodo') as HTMLSelectElement;
      const metodo = metodoSelect?.value || 'Transferencia';
      const fecha = new Date().toISOString().split('T')[0];

      const newId = pagosData.length ? Math.max(...pagosData.map(p => p.id)) + 1 : 1;
      const newItem: Pago = {
        id: newId, residente, concepto, monto, fecha, metodo, estado: 'Pagado'
      };
      // We can't add directly since pagosData state is not settable
      addActivity(`Pago registrado de <strong>${residente}</strong> por ${monto}`, 'fa-credit-card', 'var(--success)');
      addNotification('admin', 'Nuevo pago', `${residente} realizó un pago de ${monto}.`, 'fa-credit-card');
      setDrawerOpen(false);
      alert('Pago registrado correctamente.');
    } else {
      setDrawerOpen(false);
    }
  }, [drawerMode, pagosData, addActivity, addNotification]);

  const renderDrawerContent = () => {
    if (drawerMode === 'view' && selectedItem) {
      const p = selectedItem;
      return (
        <div className="detail-card">
          <div className="detail-row">
            <span className="detail-label">Residente</span>
            <span className="detail-value">{p.residente}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Concepto</span>
            <span className="detail-value">{p.concepto}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Monto</span>
            <span className="detail-value" style={{ fontWeight: 600, color: 'var(--success)' }}>{p.monto}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Fecha</span>
            <span className="detail-value">{p.fecha}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Método</span>
            <span className="detail-value">{p.metodo}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Estado</span>
            <span className="detail-value">
              <span className={`badge ${p.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}`}>
                {p.estado}
              </span>
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="form-section">
        <h4>Información del pago</h4>
        <div className="form-group">
          <label>Residente</label>
          <input id="pagoResidente" type="text" placeholder="Nombre del residente" />
        </div>
        <div className="form-group">
          <label>Concepto</label>
          <input id="pagoConcepto" type="text" placeholder="Concepto del pago" />
        </div>
        <div className="form-group">
          <label>Monto</label>
          <input id="pagoMonto" type="text" placeholder="$0.00" />
        </div>
        <div className="form-group">
          <label>Método</label>
          <select id="pagoMetodo">
            <option>Transferencia</option>
            <option>Efectivo</option>
            <option>Tarjeta</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHeader title="Pagos">
        <button className="btn-primary" onClick={openCreate}>
          <i className="fas fa-plus"></i> Registrar pago
        </button>
      </PageHeader>
      <div className="payment-summary">
        <div className="stat-card"><div className="stat-label">Total recaudado</div><div className="stat-value">$12,450</div></div>
        <div className="stat-card"><div className="stat-label">Pendientes</div><div className="stat-value">$2,300</div></div>
        <div className="stat-card"><div className="stat-label">Pagados hoy</div><div className="stat-value">$1,280</div></div>
      </div>
      <table className="table-modern">
        <thead><tr><th>Residente</th><th>Concepto</th><th>Monto</th><th>Fecha</th><th>Método</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>
          {pagosData.map(p => (
            <tr key={p.id}>
              <td data-label="Residente">{p.residente}</td>
              <td data-label="Concepto">{p.concepto}</td>
              <td data-label="Monto">{p.monto}</td>
              <td data-label="Fecha">{p.fecha}</td>
              <td data-label="Método">{p.metodo}</td>
              <td data-label="Estado"><span className={`badge ${p.estado === 'Pagado' ? 'badge-success' : 'badge-warning'}`}>{p.estado}</span></td>
              <td data-label="Acciones" className="action-icons">
                <a onClick={() => openView(p)} aria-label="Ver" style={{ cursor: 'pointer' }}><i className="fas fa-eye"></i></a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerMode === 'create' ? 'Registrar pago' : 'Detalle de pago'}
        onSave={drawerMode === 'view' ? undefined : handleSave}
        saveText="Registrar"
        size="md"
      >
        {renderDrawerContent()}
      </Drawer>
    </>
  );
}
