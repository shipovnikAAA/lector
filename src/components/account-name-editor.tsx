"use client";

import { useState } from "react";

type AccountNameEditorProps = {
  initialName: string;
  action: (formData: FormData) => void | Promise<void>;
};

export function AccountNameEditor({
  initialName,
  action
}: AccountNameEditorProps) {
  const [isEditing, setIsEditing] = useState(false);

  if (!isEditing) {
    return (
      <div className="account-field">
        <span className="account-label">Имя</span>
        <div className="account-inline-row">
          <span className="account-value">{initialName || "Не указано"}</span>
          <button
            aria-label="Редактировать имя"
            className="icon-button"
            onClick={() => setIsEditing(true)}
            type="button"
          >
            ✎
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="account-form">
      <label className="account-field" htmlFor="full_name">
        <span className="account-label">Имя</span>
        <input
          autoFocus
          className="account-input"
          defaultValue={initialName}
          id="full_name"
          maxLength={80}
          name="full_name"
          placeholder="Введите имя"
          type="text"
        />
      </label>
      <div className="account-form-actions">
        <button className="primary-button account-save-button" type="submit">
          Сохранить
        </button>
        <button
          className="ghost-button account-cancel-button"
          onClick={() => setIsEditing(false)}
          type="button"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
