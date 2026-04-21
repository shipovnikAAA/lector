pub mod ask;
pub mod auth;
pub mod chat;
pub mod upload;

use actix_web::web::{get, post, put, scope, ServiceConfig};

pub fn config_public(cfg: &mut ServiceConfig) {
    cfg.route("/register", post().to(auth::register));
    cfg.route("/login", post().to(auth::login));
}

pub fn config_private(cfg: &mut ServiceConfig) {
    cfg.service(
        scope("/upload")
            .route("", post().to(upload::handle_upload))
            .route("", get().to(upload::list_uploads))
            .route("", put().to(upload::update_upload)),
    );
    cfg.service(
        scope("/chat")
            .route("", get().to(chat::list_chats))
            .route("", put().to(chat::update_chat)),
    );
    cfg.service(scope("/ask").route("", post().to(ask::handle_ask)));
}
