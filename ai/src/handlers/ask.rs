use crate::auth::UserIdentity;
use crate::db;
use crate::rag::RagSystem;
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Responder, web};
use rig::completion::Prompt;
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AskRequest {
    pub chat_id: Option<Uuid>,
    pub question: String,
}

pub async fn handle_ask(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    req: HttpRequest,
    payload: web::Json<AskRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req
        .extensions()
        .get::<UserIdentity>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;

    let chat_id = match payload.chat_id {
        Some(id) => id,
        None => {
            let name = if payload.question.len() > 30 {
                format!("{}...", &payload.question[..27])
            } else {
                payload.question.clone()
            };
            let rec = sqlx::query!(
                "INSERT INTO chats (user_id, name) VALUES ($1, $2) RETURNING id",
                user.id,
                name
            )
            .fetch_one(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            rec.id
        }
    };

    sqlx::query!(
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)",
        chat_id,
        "user",
        payload.question
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let agent = rag.build_agent();

    let response = agent.prompt(&payload.question).await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("AI prompt failed: {}", e))
    })?;

    sqlx::query!(
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)",
        chat_id,
        "assistant",
        response
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "chat_id": chat_id,
        "answer": response
    })))
}
