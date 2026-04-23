import { FormulasManager } from '@/components/FormulasManager';

export const metadata = {
  title: 'Библиотека формул | Lector',
  description: 'Управляйте формулами по физике для 9 и 10 классов.',
};

export default function FormulasPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a' }}>
      <FormulasManager />
    </div>
  );
}
