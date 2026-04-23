use actix_web::{web, HttpResponse, Responder};
use sqlx::PgPool;
use serde::Deserialize;
use uuid::Uuid;
use crate::db;
use crate::rag::RagSystem;

#[derive(Deserialize)]
pub struct CreateFormulaRequest {
    pub grade: i32,
    pub name: String,
    pub equation: String,
    pub description: Option<String>,
}

#[derive(Deserialize)]
pub struct FormulaFilter {
    pub grade: Option<i32>,
}

pub async fn list_formulas(
    pool: web::Data<PgPool>,
    filter: web::Query<FormulaFilter>,
) -> actix_web::Result<impl Responder> {
    let formulas = db::list_formulas(pool.get_ref(), filter.grade)
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
        
    Ok(HttpResponse::Ok().json(formulas))
}

pub async fn add_formula(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    req: web::Json<CreateFormulaRequest>,
) -> actix_web::Result<impl Responder> {
    let rec = sqlx::query!(
        "INSERT INTO formulas (grade, name, equation, description) VALUES ($1, $2, $3, $4) RETURNING id",
        req.grade,
        req.name,
        req.equation,
        req.description
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Индексируем в Qdrant для RAG
    rag.index_formula(
        rec.id, 
        &req.name, 
        &req.equation, 
        req.description.as_deref()
    ).await.map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "id": rec.id })))
}

pub async fn delete_formula(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    id: web::Path<Uuid>,
) -> actix_web::Result<impl Responder> {
    let id = *id;
    
    sqlx::query!("DELETE FROM formulas WHERE id = $1", id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Удаляем из Qdrant
    rag.remove_formula(id).await.map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "deleted" })))
}
