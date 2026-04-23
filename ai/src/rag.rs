use anyhow::{Result, anyhow};
use qdrant_client::Payload;
use qdrant_client::qdrant::QueryPoints;
use qdrant_client::qdrant::{PointStruct, UpsertPointsBuilder};
use rig::agent::{Agent, AgentBuilder};
use rig::client::CompletionClient;
use rig::client::EmbeddingsClient;
use rig::embeddings::EmbeddingsBuilder;
use rig::providers::openai::Client;
use rig::providers::openai::EmbeddingModel;
use rig::providers::openai::completion::CompletionModel as OpenAiCompletionModel;
use rig_qdrant::QdrantVectorStore;
use serde_json::json;
use std::env;
use uuid::Uuid;

pub struct RagSystem {
    pub model: OpenAiCompletionModel,
    pub embeddings: Option<EmbeddingModel>,
    pub qdrant_client: qdrant_client::Qdrant,
    pub query_points: QueryPoints,
}

impl RagSystem {
    pub async fn new() -> Result<Self> {
        let api_key = env::var("POLLINATIONS_API_KEY").unwrap_or_default();
        let has_api_key = !api_key.trim().is_empty();
        let default_base_url = if has_api_key {
            "https://gen.pollinations.ai"
        } else {
            "https://text.pollinations.ai/openai"
        };
        let base_url =
            env::var("POLLINATIONS_BASE_URL").unwrap_or_else(|_| default_base_url.to_string());
        let model_name =
            env::var("POLLINATIONS_MODEL").unwrap_or_else(|_| "openai".to_string());

        let client = Client::builder()
            .api_key(&api_key)
            .base_url(&base_url)
            .build()?;

        let embeddings_enabled = env::var("ENABLE_EMBEDDINGS")
            .map(|value| matches!(value.trim().to_ascii_lowercase().as_str(), "1" | "true" | "yes"))
            .unwrap_or(false);
        let embeddings = if embeddings_enabled {
            Some(client.embedding_model("text-embedding-ada-002"))
        } else {
            None
        };
        let model = client.completion_model(&model_name).completions_api();

        let qdrant_url =
            env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6334".to_string());

        let qdrant_client = qdrant_client::Qdrant::from_url(&qdrant_url)
            .build()
            .map_err(|e| anyhow!("Failed to build Qdrant client: {}", e))?;

        let query_points = QueryPoints {
            collection_name: "lector_collection".to_string(),
            ..Default::default()
        };

        Ok(Self {
            model,
            embeddings,
            qdrant_client,
            query_points,
        })
    }

    pub fn build_agent(&self) -> Agent<OpenAiCompletionModel> {
        let builder = AgentBuilder::new(self.model.clone()).preamble(
            "You are Lector, a high-performance RAG agent. 
You must answer questions ONLY using the provided context from textbooks. 
If the answer is not in the context, response: 'Данных недостаточно. Я не могу ответить на этот вопрос, так как его нет в учебниках.'
Do NOT use your own knowledge or hallucinate. Be precise and academic."
        );

        if let Some(embeddings) = &self.embeddings {
            let vector_store = QdrantVectorStore::new(
                self.qdrant_client.clone(),
                embeddings.clone(),
                self.query_points.clone(),
            );

            builder.dynamic_context(2, vector_store).build()
        } else {
            builder.build()
        }
    }
    pub async fn add_chunks(&self, chunks: Vec<String>) -> Result<()> {
        if chunks.is_empty() {
            return Ok(());
        }

        let Some(embeddings_model) = &self.embeddings else {
            return Ok(());
        };

        let embeddings = EmbeddingsBuilder::new(embeddings_model.clone())
            .documents(chunks)?
            .build()
            .await?;

        let points = embeddings
            .into_iter()
            .map(|(doc, vec)| {
                let float_vec: Vec<f32> = vec.first().vec.iter().map(|&x| x as f32).collect();

                PointStruct::new(
                    Uuid::new_v4().to_string(),
                    float_vec,
                    Payload::try_from(json!({ "document": doc })).unwrap(),
                )
            })
            .collect::<Vec<_>>();
        self.qdrant_client
            .upsert_points(UpsertPointsBuilder::new(
                &self.query_points.collection_name,
                points,
            ))
            .await?;

        Ok(())
    }
}

pub fn chunk_text(text: &str, chunk_size: usize, overlap: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut start = 0;

    while start < text.len() {
        let end = (start + chunk_size).min(text.len());

        let mut better_end = end;
        if end < text.len() {
            if let Some(pos) = text[start..end].rfind("\n\n") {
                better_end = start + pos + 2;
            } else if let Some(pos) = text[start..end].rfind('\n') {
                better_end = start + pos + 1;
            } else if let Some(pos) = text[start..end].rfind(". ") {
                better_end = start + pos + 2;
            }
        }

        let final_end = if better_end > start + (chunk_size * 7 / 10) {
            better_end
        } else {
            end
        };

        chunks.push(text[start..final_end].trim().to_string());

        if final_end >= text.len() {
            break;
        }

        start = final_end - overlap;
    }

    chunks.into_iter().filter(|c| !c.is_empty()).collect()
}
