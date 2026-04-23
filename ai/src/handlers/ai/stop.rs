use super::utils::set_toggle_cooldown;
use crate::{handlers::ai::utils::check_toggle_cooldown, models::{AppState, StopAi}};
use actix_web::{HttpResponse, Responder, web};
use auth_service::{AuthorizedUser, has_access};
use serde_json::json;
use shared_permissions::PermissionType;

pub async fn stop_ai(
    data: web::Data<AppState>,
    user: AuthorizedUser,
    body: web::Json<StopAi>,
) -> actix_web::Result<impl Responder> {
    // Cooldown check
    if let Some(rem) = check_toggle_cooldown(&data.ai_toggle_cooldown, body.user_id.as_deref()) {
        return Ok(HttpResponse::TooManyRequests().json(json!({"retry": rem.as_secs()})));
    }


    let channel_owner_id = user.claims.user_channel.as_ref().map(|c| c.channel_id);
    let is_own_channel = channel_owner_id == Some(body.channel_id);
    if !is_own_channel && !has_access(PermissionType::AiAdminSettings, &user.permissions) {
        return Ok(HttpResponse::Forbidden().json(json!({"error": "not_an_owner"})));
    }

    let status = data.stop_service(body.channel_id, body.user_id.clone());

    set_toggle_cooldown(&data.ai_toggle_cooldown, body.user_id.as_deref());
    Ok(HttpResponse::Ok().json(json!({ "status": status })))
}
