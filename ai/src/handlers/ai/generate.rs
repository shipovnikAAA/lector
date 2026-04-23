use crate::models::{AppState, GenerateRequest};
use crate::utils::use_ai_quota_via_billing;
use actix_web::error;
use actix_web::{HttpResponse, Responder, web};
use auth_service::AuthorizedUser;
use serde_json::json;

pub async fn generate(
    data: web::Data<AppState>,
    user: AuthorizedUser,
    body: web::Json<GenerateRequest>,
) -> actix_web::Result<impl Responder> {

    let runtime = data
        .active_streams
        .get(&body.channel_id)
        .ok_or_else(|| error::ErrorBadRequest("Стрим не запущен"))?;

    // quota check
    let owner_id = runtime
        .owner_quota
        .or_else(|| body.user_id.as_deref().and_then(|s| s.parse().ok()))
        .ok_or_else(|| error::ErrorBadRequest("Не удалось определить владельца квоты"))?;

    use_ai_quota_via_billing(&data, owner_id)
        .await
        .map_err(|_| error::ErrorTooManyRequests(json!({"error": "quota_exceeded"})))?;

    let response = runtime
        .generate_response(&data, body.prompt.as_deref(), body.channel_id)
        .await
        .map_err(|e| error::ErrorInternalServerError(e.to_string()))?;

    Ok(HttpResponse::Ok().json(json!({ "response": response })))
}
