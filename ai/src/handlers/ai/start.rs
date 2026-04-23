use super::utils::{check_toggle_cooldown, set_toggle_cooldown};
use crate::models::{AppState, StartAi};
use crate::utils::AiPipeline;
use crate::utils::get_ai_quota_remaining_from_billing;
use actix_web::{HttpResponse, Responder, error, web};
use auth_service::AuthorizedUser;
use serde_json::json;

pub async fn start_ai(
    data: web::Data<AppState>,
    user: AuthorizedUser,
    body: web::Json<StartAi>,
) -> actix_web::Result<impl Responder> {
    let body = body.into_inner();

    // cooldown
    if let Some(rem) = check_toggle_cooldown(&data.ai_toggle_cooldown, body.user_id.as_deref()) {
        return Ok(HttpResponse::TooManyRequests().json(json!({"retry": rem.as_secs()})));
    }

    // resolver
    let (f_id, f_name, owner_quota) = body
        .resolve_target(&user)
        .map_err(|e| error::ErrorBadRequest(e))?;

    // quota check
    if let Some(oq) = owner_quota {
        let (limit, used): (i32, i32) = get_ai_quota_remaining_from_billing(&data, oq)
            .await
            .map_err(|_| error::ErrorInternalServerError("Billing error"))?;
        if limit <= used {
            return Ok(HttpResponse::TooManyRequests().json(json!({
                "error": "quota_exceeded",
                "message": "Лимит сообщений ИИ исчерпан. Проверьте подписку или квоту в биллинге."
            })));
        }
    }

    let pipeline = AiPipeline {
        channel_id: f_id,
        channel_name: f_name,
        bot_username: body.bot_username,
        owner_quota,
        messages_per_minute: body.messages,
        auto: body.auto,
    };

    let status = data
        .start_service(pipeline, body.user_id.clone())
        .await
        .map_err(|e| error::ErrorInternalServerError(e))?;

    set_toggle_cooldown(&data.ai_toggle_cooldown, body.user_id.as_deref());
    Ok(HttpResponse::Ok().json(json!({ "status": status })))
}
