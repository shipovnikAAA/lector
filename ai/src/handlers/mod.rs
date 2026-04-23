mod ask;
mod auth;
mod chat;
mod formulas;
mod upload;

use actix_web::web::{ServiceConfig, get, post, put, delete, scope};
use actix_web::{HttpResponse, Responder};
use actix_web_httpauth::middleware::HttpAuthentication;

use crate::auth::validator;

use ask::handle_ask;
use auth::login;
use auth::register;
use chat::get_chat_messages;
use chat::list_chats;
use chat::update_chat;
use formulas::{add_formula, delete_formula, list_formulas};
use upload::handle_upload;
use upload::list_uploads;
use upload::update_upload;
use upload::upload_image;

pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "ok",
    }))
}

pub fn config_public(cfg: &mut ServiceConfig) {
    cfg.route("/health", get().to(health_check));
    cfg.route("/register", post().to(register));
    cfg.route("/login", post().to(login));
}

pub fn config_private(cfg: &mut ServiceConfig) {
    let auth_mw = HttpAuthentication::bearer(validator);

    cfg.service(
        scope("/upload")
            .wrap(auth_mw.clone())
            .route("", post().to(handle_upload))
            .route("/image", post().to(upload_image))
            .route("", get().to(list_uploads))
            .route("", put().to(update_upload)),
    );
    cfg.service(
        scope("/chat")
            .wrap(auth_mw.clone())
            .route("", get().to(list_chats))
            .route("/{chat_id}/messages", get().to(get_chat_messages))
            .route("", put().to(update_chat)),
    );
    cfg.service(
        scope("/formulas")
            .wrap(auth_mw.clone())
            .route("", get().to(list_formulas))
            .route("", post().to(add_formula))
            .route("/{id}", delete().to(delete_formula)),
    );
    cfg.service(scope("/ask").wrap(auth_mw).route("", post().to(handle_ask)));
}
