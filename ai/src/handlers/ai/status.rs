use crate::models::{AppState, StatusQuery};
use actix_web::{HttpResponse, Responder, web};
use auth_service::{AuthError, AuthorizedUser, has_access};
use shared_permissions::PermissionType;

pub async fn status(
    data: web::Data<AppState>,
    user: AuthorizedUser,
    mut query: web::Query<StatusQuery>,
) -> Result<impl Responder, AuthError> {
    let is_admin = has_access(PermissionType::BillingAdminRead, &user.permissions);
    let jwt_channel_id = user.claims.user_channel.as_ref().map(|ch| ch.channel_id);

    if query.channel_id.is_none() {
        if let Some(my_id) = jwt_channel_id {
            tracing::debug!("Auto-filling channel_id from JWT: {}", my_id);
            query.channel_id = Some(my_id);
        }
    }
    if !is_admin {
        match (query.channel_id, jwt_channel_id) {
            (Some(req_id), Some(my_id)) if req_id != my_id => {
                tracing::warn!(
                    "Forbidden: user {} tried to access channel {}",
                    my_id,
                    req_id
                );
                return Err(AuthError::AccessDenied);
            }
            (None, None) => {
                tracing::error!("AccessDenied: No channel_id in query and no channel_id in JWT");
                return Err(AuthError::AccessDenied);
            }
            _ => {}
        }
    }

    let channel_id = query.channel_id.ok_or_else(|| {
        tracing::error!("Final check failed: channel_id is still None");
        AuthError::AccessDenied
    })?;

    let running = data.active_streams.contains_key(&channel_id);

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "running": running,
        "channel_id": channel_id
    })))
}
