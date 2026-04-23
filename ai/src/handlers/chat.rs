use actix_web::{web, HttpMessage, HttpRequest, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::db;
use crate::auth::UserIdentity;

#[derive(Deserialize)]
pub struct ChatUpdateRequest {
    pub id: Uuid,
    pub name: Option<String>,
    pub is_pinned: Option<bool>,
}

pub async fn list_chats(
    pool: web::Data<PgPool>,
    req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let user = req.extensions().get::<UserIdentity>().cloned().ok_or_else(|| {
        actix_web::error::ErrorUnauthorized("Unauthorized")
    })?;

    let chats = db::list_chats(pool.get_ref(), user.id).await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(e)
    })?;

    Ok(HttpResponse::Ok().json(chats))
}

pub async fn get_chat_messages(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    chat_id: web::Path<Uuid>,
) -> actix_web::Result<impl Responder> {
    let user = req.extensions().get::<UserIdentity>().cloned().ok_or_else(|| {
        actix_web::error::ErrorUnauthorized("Unauthorized")
    })?;

    let chat_id = chat_id.into_inner();

    let chat = sqlx::query(
        "SELECT id FROM chats WHERE id = $1 AND user_id = $2"
    )
    .bind(chat_id)
    .bind(user.id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if chat.is_none() {
        return Err(actix_web::error::ErrorNotFound("Chat not found"));
    }

    let messages = db::get_chat_history(pool.get_ref(), chat_id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(messages))
}

pub async fn update_chat(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    payload: web::Json<ChatUpdateRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req.extensions().get::<UserIdentity>().cloned().ok_or_else(|| {
        actix_web::error::ErrorUnauthorized("Unauthorized")
    })?;

    if let Some(name) = &payload.name {
        sqlx::query(
            "UPDATE chats SET name = $1 WHERE id = $2 AND user_id = $3"
        )
        .bind(name)
        .bind(payload.id)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    if let Some(is_pinned) = payload.is_pinned {
        sqlx::query(
            "UPDATE chats SET is_pinned = $1 WHERE id = $2 AND user_id = $3"
        )
        .bind(is_pinned)
        .bind(payload.id)
        .bind(user.id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })))
}
