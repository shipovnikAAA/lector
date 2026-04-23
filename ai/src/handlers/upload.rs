use crate::auth::UserIdentity;
use crate::db;
use crate::rag::{RagSystem, chunk_text};
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Responder, web};
use serde::Deserialize;
use sqlx::PgPool;

#[derive(Deserialize)]
pub struct UploadRequest {
    pub filename: String,
    pub content: String,
}

pub async fn handle_upload(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    req: HttpRequest,
    payload: web::Json<UploadRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req
        .extensions()
        .get::<UserIdentity>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;

    let rec = sqlx::query!(
        "INSERT INTO uploads (user_id, filename, content) VALUES ($1, $2, $3) RETURNING id",
        user.id,
        payload.filename,
        payload.content
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let upload_id = rec.id;

    let chunks = chunk_text(&payload.content, 1000, 200);
    rag.add_chunks(chunks).await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Qdrant indexing failed: {}", e))
    })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "upload_id": upload_id
    })))
}

pub async fn list_uploads(
    pool: web::Data<PgPool>,
    req: HttpRequest,
) -> actix_web::Result<impl Responder> {
    let user = req
        .extensions()
        .get::<UserIdentity>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;

    let uploads = db::list_uploads(pool.get_ref(), user.id)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(uploads))
}

pub async fn update_upload(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    req: HttpRequest,
    payload: web::Json<UploadRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req
        .extensions()
        .get::<UserIdentity>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;

    sqlx::query!(
        "UPDATE uploads SET content = $1 WHERE user_id = $2 AND filename = $3",
        payload.content,
        user.id,
        payload.filename
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let chunks = chunk_text(&payload.content, 1000, 200);
    rag.add_chunks(chunks).await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Qdrant indexing failed: {}", e))
    })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "updated" })))
}
