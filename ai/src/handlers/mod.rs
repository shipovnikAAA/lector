pub mod ask;
pub mod chat;
pub mod upload;

use actix_web::web::{ServiceConfig, get, post, put, scope};

pub fn configure(cfg: &mut ServiceConfig) {
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
