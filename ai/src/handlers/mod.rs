pub mod ask;
pub mod auth;
pub mod chat;
pub mod upload;

use actix_web::web::{ServiceConfig, get, post, put, scope};
use actix_web_httpauth::middleware::HttpAuthentication;

use crate::auth as middlewareAuth;

pub fn config_public(cfg: &mut ServiceConfig) {
    cfg.route("/register", post().to(auth::register));
    cfg.route("/login", post().to(auth::login));
}

pub fn config_private(cfg: &mut ServiceConfig) {
    let auth_mw = HttpAuthentication::bearer(middlewareAuth::validator);

    cfg.service(
        scope("/upload")
            .wrap(auth_mw.clone())
            .route("", post().to(upload::handle_upload))
            .route("", get().to(upload::list_uploads))
            .route("", put().to(upload::update_upload)),
    );
    cfg.service(
        scope("/chat")
            .wrap(auth_mw.clone())
            .route("", get().to(chat::list_chats))
            .route("", put().to(chat::update_chat)),
    );
    cfg.service(
        scope("/ask")
            .wrap(auth_mw)
            .route("", post().to(ask::handle_ask)),
    );
}
