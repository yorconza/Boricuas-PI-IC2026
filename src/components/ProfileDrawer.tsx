/**
 * ============================================================================
 * Archivo: ProfileDrawer.tsx
 * ============================================================================
 *
 * ¿Qué hace?
 * Drawer que muestra el perfil del usuario y permite editarlo.
 * Incluye: foto de avatar (URL o archivo), nombre, correo, teléfono
 * y opción para cambiar la contraseña.
 *
 * Props que recibe
 * - isOpen: boolean            → Controla si se muestra
 * - onClose: () => void        → Cierra el drawer
 * - profile: ProfileData       → Datos actuales del perfil
 * - onSave: (data) => void     → Guarda los cambios
 * - onAvatarUpdate: (src) => void → Actualiza el avatar
 *
 * Quién lo utiliza
 * - AdminLayout, GuardiaLayout, InquilinoLayout
 *
 * Componentes que utiliza
 * - Drawer (el panel lateral deslizante)
 *
 * ============================================================================
 */

import { useState, useRef } from 'react';
import Drawer from './Drawer';
import type { ProfileData } from '../types';

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ProfileData;
  onSave: (data: Partial<ProfileData>) => void;
  onAvatarUpdate: (src: string) => void;
}

export default function ProfileDrawer({
  isOpen, onClose, profile, onSave, onAvatarUpdate
}: ProfileDrawerProps) {
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar);
  const [name, setName] = useState(profile.nombre);
  const [email, setEmail] = useState(profile.correo);
  const [phone, setPhone] = useState(profile.telefono);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    if (newPassword && currentPassword !== profile.password) {
      alert('La contraseña actual no coincide.');
      return;
    }
    onSave({
      nombre: name, correo: email, telefono: phone,
      ...(newPassword ? { password: newPassword } : {}),
    });
    onClose();
    alert('Perfil actualizado correctamente.');
  };

  const applyAvatarUrl = () => {
    if (avatarUrl.trim()) {
      onAvatarUpdate(avatarUrl.trim());
    } else {
      alert('Ingresa una URL válida.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAvatarUrl(dataUrl);
        onAvatarUpdate(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Drawer isOpen={isOpen} onClose={onClose}
      title="Mi Perfil" size="md"
      onSave={handleSave} saveText="Guardar cambios">
      <div className="profile-avatar-section">
        <div className="profile-avatar" id="profileAvatar">
          <img
            id="profileAvatarImg"
            src={profile.avatar || ''}
            alt="Foto de perfil"
            style={{ display: profile.avatar ? 'block' : 'none' }}
          />
          <span className="fallback" id="profileAvatarFallback"
            style={{ display: profile.avatar ? 'none' : 'block' }}>
            {profile.nombre.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="profile-avatar-controls">
          <div className="url-input-group">
            <input
              type="text"
              id="profileAvatarUrl"
              placeholder="URL de la imagen"
              value={avatarUrl}
              onChange={e => setAvatarUrl(e.target.value)}
            />
            <button className="btn-primary" id="applyAvatarUrl" onClick={applyAvatarUrl}>
              Aplicar URL
            </button>
          </div>
          <div className="file-input-wrapper">
            <label htmlFor="profileAvatarFile" className="file-label">
              <i className="fas fa-upload"></i> Subir archivo
            </label>
            <input
              type="file"
              id="profileAvatarFile"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h4>Información personal</h4>
        <div className="form-group">
          <label>Nombre</label>
          <input type="text" id="profileName"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Correo electrónico</label>
          <input type="email" id="profileEmail"
            value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Teléfono</label>
          <input type="text" id="profilePhone"
            value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="form-section">
        <h4>Cambiar contraseña</h4>
        <div className="form-group">
          <label>Contraseña actual</label>
          <input
            type="password"
            id="profileCurrentPassword"
            placeholder="Ingresa tu contraseña actual"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Nueva contraseña</label>
          <input
            type="password"
            id="profileNewPassword"
            placeholder="Ingresa la nueva contraseña"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
          />
        </div>
      </div>
    </Drawer>
  );
}
