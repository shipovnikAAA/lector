'use client';

import React, { useState, useEffect } from 'react';
import styles from './FormulasManager.module.css';

interface Formula {
  id: string;
  grade: number;
  name: string;
  equation: string;
  description?: string;
}

export const FormulasManager: React.FC = () => {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<number>(9);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newFormula, setNewFormula] = useState({
    name: '',
    equation: '',
    description: '',
    grade: 9
  });

  const fetchFormulas = async (grade: number) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/formulas?grade=${grade}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setFormulas(data);
      }
    } catch (error) {
      console.error('Failed to fetch formulas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFormulas(selectedGrade);
  }, [selectedGrade]);

  const handleAddFormula = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/formulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newFormula, grade: selectedGrade })
      });
      if (response.ok) {
        setIsAdding(false);
        setNewFormula({ name: '', equation: '', description: '', grade: selectedGrade });
        fetchFormulas(selectedGrade);
      }
    } catch (error) {
      console.error('Failed to add formula:', error);
    }
  };

  const handleDeleteFormula = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту формулу?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/formulas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchFormulas(selectedGrade);
      }
    } catch (error) {
      console.error('Failed to delete formula:', error);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Библиотека формул</h1>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${selectedGrade === 9 ? styles.activeTab : ''}`}
            onClick={() => setSelectedGrade(9)}
          >
            9 Класс
          </button>
          <button 
            className={`${styles.tab} ${selectedGrade === 10 ? styles.activeTab : ''}`}
            onClick={() => setSelectedGrade(10)}
          >
            10 Класс
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.actions}>
          <button className={styles.addButton} onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Отмена' : '+ Добавить формулу'}
          </button>
        </div>

        {isAdding && (
          <form className={styles.addForm} onSubmit={handleAddFormula}>
            <input 
              placeholder="Название (например, Закон Ома)" 
              value={newFormula.name}
              onChange={e => setNewFormula({...newFormula, name: e.target.value})}
              required
            />
            <input 
              placeholder="Формула (например, I = U / R)" 
              value={newFormula.equation}
              onChange={e => setNewFormula({...newFormula, equation: e.target.value})}
              required
            />
            <textarea 
              placeholder="Описание (необязательно)" 
              value={newFormula.description}
              onChange={e => setNewFormula({...newFormula, description: e.target.value})}
            />
            <button type="submit" className={styles.submitButton}>Сохранить</button>
          </form>
        )}

        {loading ? (
          <div className={styles.loader}>Загрузка...</div>
        ) : (
          <div className={styles.grid}>
            {formulas.map(formula => (
              <div key={formula.id} className={styles.card}>
                <div className={styles.cardContent}>
                  <h3>{formula.name}</h3>
                  <div className={styles.equation}>{formula.equation}</div>
                  <p>{formula.description}</p>
                </div>
                <button 
                  className={styles.deleteButton}
                  onClick={() => handleDeleteFormula(formula.id)}
                >
                  &times;
                </button>
              </div>
            ))}
            {formulas.length === 0 && !isAdding && (
              <div className={styles.empty}>Формул пока нет</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
