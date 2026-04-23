use serde::{Deserialize, Serialize};
use sqlx::{FromRow, PgPool};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Chat {
    pub id: Uuid,
    pub user_id: Uuid,
    pub name: String,
    pub is_pinned: bool,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Message {
    pub id: Uuid,
    pub chat_id: Uuid,
    pub role: String,
    pub content: String,
    pub image_url: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Upload {
    pub id: Uuid,
    pub user_id: Uuid,
    pub filename: String,
    pub content: String,
    pub created_at: Option<DateTime<Utc>>,
}

pub async fn list_chats(pool: &PgPool, user_id: Uuid) -> anyhow::Result<Vec<Chat>> {
    let chats = sqlx::query_as::<_, Chat>(
        r#"SELECT id, user_id, name, is_pinned, created_at FROM chats WHERE user_id = $1 ORDER BY is_pinned DESC, created_at DESC"#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(chats)
}

pub async fn list_uploads(pool: &PgPool, user_id: Uuid) -> anyhow::Result<Vec<Upload>> {
    let uploads = sqlx::query_as::<_, Upload>(
        r#"SELECT id, user_id, filename, content, created_at FROM uploads WHERE user_id = $1 ORDER BY created_at DESC"#
    )
    .bind(user_id)
    .fetch_all(pool)
    .await?;
    Ok(uploads)
}

pub async fn get_chat_history(pool: &PgPool, chat_id: Uuid) -> anyhow::Result<Vec<Message>> {
    let messages = sqlx::query_as::<_, Message>(
        r#"SELECT id, chat_id, role, content, image_url, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC"#
    )
    .bind(chat_id)
    .fetch_all(pool)
    .await?;
    Ok(messages)
}
