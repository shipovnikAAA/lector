use actix_web::{web, HttpResponse, Responder, HttpRequest, HttpMessage};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;
use crate::auth::UserIdentity;
use crate::db;

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

pub async fn update_chat(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    payload: web::Json<ChatUpdateRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req.extensions().get::<UserIdentity>().cloned().ok_or_else(|| {
        actix_web::error::ErrorUnauthorized("Unauthorized")
    })?;

    if let Some(name) = &payload.name {
        sqlx::query!(
            "UPDATE chats SET name = $1 WHERE id = $2 AND user_id = $3",
            name,
            payload.id,
            user.id
        )
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    if let Some(is_pinned) = payload.is_pinned {
        sqlx::query!(
            "UPDATE chats SET is_pinned = $1 WHERE id = $2 AND user_id = $3",
            is_pinned,
            payload.id,
            user.id
        )
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })))
}
