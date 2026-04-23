mod generate;
mod start;
mod status;
mod stop;
mod utils;

use generate::generate;
use shared_permissions::PermissionType;
use start::start_ai;
use status::status;
use stop::stop_ai;

use actix_web::web::{ServiceConfig, get, post, scope};
use auth_service::{Auth, CheckPermission};

use crate::models::AppState;

pub fn ai_resource_config(cfg: &mut ServiceConfig, state: &AppState) {
    cfg.service(
        scope("/ai")
            .wrap(CheckPermission(PermissionType::AiUse))
            .wrap(Auth::new(state.db.clone(), state.redis.clone()))
            .route("/start", post().to(start_ai))
            .route("/stop", post().to(stop_ai))
            .route("/generate", post().to(generate))
            .route("/status", get().to(status)),
    );
}
