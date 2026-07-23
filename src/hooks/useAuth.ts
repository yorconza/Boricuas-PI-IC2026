/**
 * ============================================================================
 * Archivo: useAuth.ts
 * ============================================================================
 *
 * ¿Qué hace?
 * Re-exporta el hook useAuth desde AuthContext.tsx para que los componentes
 * puedan importarlo de forma más limpia: "import { useAuth } from '../../hooks/useAuth'"
 * en lugar de tener que importar desde context/ directamente.
 *
 * ============================================================================
 */

export { useAuth } from '../context/AuthContext';
