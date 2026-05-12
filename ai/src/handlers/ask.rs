use crate::auth::UserIdentity;
use crate::rag::RagSystem;
use actix_web::{HttpMessage, HttpRequest, HttpResponse, Responder, web};
use rig::completion::Prompt;
use rig::embeddings::EmbeddingModel;
use serde::Deserialize;
use sqlx::{PgPool, Row};
use uuid::Uuid;

#[derive(Deserialize)]
pub struct AskRequest {
    pub chat_id: Option<Uuid>,
    pub question: String,
    pub image_url: Option<String>,
}

pub async fn handle_ask(
    pool: web::Data<PgPool>,
    rag: web::Data<RagSystem>,
    req: HttpRequest,
    payload: web::Json<AskRequest>,
) -> actix_web::Result<impl Responder> {
    let user = req
        .extensions()
        .get::<UserIdentity>()
        .cloned()
        .ok_or_else(|| actix_web::error::ErrorUnauthorized("Unauthorized"))?;

    let chat_id = match payload.chat_id {
        Some(id) => id,
        None => {
            let name = if payload.question.chars().count() > 30 {
                format!(
                    "{}...",
                    payload.question.chars().take(27).collect::<String>()
                )
            } else {
                payload.question.clone()
            };
            let rec = sqlx::query!(
                "INSERT INTO chats (user_id, name) VALUES ($1, $2) RETURNING id",
                user.id,
                name
            )
            .fetch_one(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            rec.id
        }
    };

    sqlx::query!(
        "INSERT INTO messages (chat_id, role, content, image_url) VALUES ($1, $2, $3, $4)",
        chat_id,
        "user",
        payload.question,
        payload.image_url
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // --- RAG Context Fetch ---
    let mut context_text = String::new();
    if let Ok(embeddings) = rag.embeddings.embed_text(&payload.question).await {
        let float_vec: Vec<f32> = embeddings.vec.iter().map(|&x| x as f32).collect();

        let search_result = rag
            .qdrant_client
            .search_points(qdrant_client::qdrant::SearchPoints {
                collection_name: rag.query_points.collection_name.clone(),
                vector: float_vec,
                limit: 3,
                with_payload: Some(true.into()),
                ..Default::default()
            })
            .await;

        if let Ok(res) = search_result {
            for point in res.result {
                if let Some(v) = point.payload.get("document") {
                    if let Some(qdrant_client::qdrant::value::Kind::StringValue(doc)) = &v.kind {
                        context_text.push_str(&format!("---\n{}\n", doc));
                    }
                }
            }
        }
    }

    let preamble = "You are PhysBot, a specialized academic assistant dedicated to helping users with physics. 
    Your identity is strictly PhysBot. If asked about your origin, developers, or model name, maintain your persona as an academic tool designed for physics assistance. 
    Never mention Google, Gemini, or being a large language model trained by others.

    Follow these rules strictly:
    1. GREETINGS & SMALL TALK: Respond politely and naturally in the language of the user. Be encouraging but keep it brief.
    2. KNOWLEDGE DOMAIN: For any factual, academic, or physics-related questions, you must answer ONLY using the provided context. 
    3. STRICT RAG ADHERENCE: Even if you 'know' the answer from your general training, if it is NOT in the provided context, you must NOT use your own knowledge.
    4. FALLBACK: If the provided context does not contain the answer, you must politely reply exactly: 'К сожалению, в моих материалах нет ответа на этот вопрос.'
    5. TONE: Maintain a professional, helpful, and academic tone. Use clear formatting for formulas (use Markdown or LaTeX if needed).
    6. NO HALLUCINATIONS: Do not invent facts, constants, or formulas that are not present in the context.";

    let full_prompt = format!(
        "{}\n\nКОНТЕКСТ ИЗ УЧЕБНИКОВ:\n{}\n\nВОПРОС ПОЛЬЗОВАТЕЛЯ: {}",
        preamble, context_text, payload.question
    );

    // --- Multimodal Request to Pollinations ---
    let client = reqwest::Client::new();
    let api_key = std::env::var("POLLINATIONS_API_KEY").unwrap_or_else(|_| "sk-dummy".to_string());
    let model = std::env::var("POLLINATIONS_MODEL").unwrap_or_else(|_| "openai".to_string());

    let mut messages = vec![serde_json::json!({
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": full_prompt
            }
        ]
    })];

    if let Some(ref url) = payload.image_url {
        // Пытаемся прочитать файл локально, если это локальная ссылка
        if url.starts_with("/uploads/") {
            let filename = url.trim_start_matches("/uploads/");
            let path = format!("./uploads/{}", filename);
            if let Ok(data) = std::fs::read(&path) {
                let base64_image = b64_encode(&data);
                let mime_type = if url.ends_with(".png") {
                    "image/png"
                } else {
                    "image/jpeg"
                };

                if let Some(msg) = messages.get_mut(0) {
                    if let Some(content) = msg.get_mut("content").and_then(|c| c.as_array_mut()) {
                        content.push(serde_json::json!({
                            "type": "image_url",
                            "image_url": {
                                "url": format!("data:{};base64,{}", mime_type, base64_image)
                            }
                        }));
                    }
                }
            }
        }
    }

    let response_res = client
        .post("https://gen.pollinations.ai/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .json(&serde_json::json!({
            "model": model,
            "messages": messages,
            "temperature": 0.3
        }))
        .send()
        .await;

    let response_text = match response_res {
        Ok(res) => {
            let json: serde_json::Value = res
                .json()
                .await
                .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;
            json["choices"][0]["message"]["content"]
                .as_str()
                .unwrap_or("Ошибка получения ответа")
                .to_string()
        }
        Err(e) => {
            return Err(actix_web::error::ErrorInternalServerError(format!(
                "AI service error: {}",
                e
            )));
        }
    };

    sqlx::query!(
        "INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3)",
        chat_id,
        "assistant",
        response_text
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "chat_id": chat_id,
        "answer": response_text
    })))
}

fn b64_encode(data: &[u8]) -> String {
    use base64::{Engine as _, engine::general_purpose};
    general_purpose::STANDARD.encode(data)
}
