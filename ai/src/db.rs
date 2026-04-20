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
    let chats = sqlx::query_as!(
        Chat,
        r#"SELECT id as "id!", user_id as "user_id!", name as "name!", is_pinned as "is_pinned!", created_at FROM chats WHERE user_id = $1 ORDER BY is_pinned DESC, created_at DESC"#,
        user_id
    )
    .fetch_all(pool)
    .await?;
    Ok(chats)
}

pub async fn list_uploads(pool: &PgPool, user_id: Uuid) -> anyhow::Result<Vec<Upload>> {
    let uploads = sqlx::query_as!(
        Upload,
        r#"SELECT id as "id!", user_id as "user_id!", filename as "filename!", content as "content!", created_at FROM uploads WHERE user_id = $1 ORDER BY created_at DESC"#,
        user_id
    )
    .fetch_all(pool)
    .await?;
    Ok(uploads)
}

pub async fn get_chat_history(pool: &PgPool, chat_id: Uuid) -> anyhow::Result<Vec<Message>> {
    let messages = sqlx::query_as!(
        Message,
        r#"SELECT id as "id!", chat_id as "chat_id!", role as "role!", content as "content!", created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC"#,
        chat_id
    )
    .fetch_all(pool)
    .await?;
    Ok(messages)
}
