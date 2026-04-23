use anyhow::{Result, anyhow};
use qdrant_client::Payload;
use qdrant_client::qdrant::QueryPoints;
use qdrant_client::qdrant::{
    CreateCollectionBuilder, Distance, PointStruct, UpsertPointsBuilder, VectorParamsBuilder,
};
use rig::agent::{Agent, AgentBuilder};
use rig::embeddings::EmbeddingsBuilder;
use rig::providers::openai::CompletionModel;
use rig::providers::openai::client::CompletionsClient;

use rig_fastembed::{EmbeddingModel, FastembedModel};
use rig_qdrant::QdrantVectorStore;
use serde_json::json;
use std::env;
use uuid::Uuid;

pub struct RagSystem {
    pub model: CompletionModel,
    pub embeddings: EmbeddingModel,
    pub qdrant_client: qdrant_client::Qdrant,
    pub query_points: QueryPoints,
}

impl RagSystem {
    pub async fn new() -> Result<Self> {
        let api_key = env::var("POLLINATIONS_API_KEY").unwrap_or_else(|_| "sk-dummy".to_string());
        let base_url = "https://gen.pollinations.ai/v1";
        let model_name =
            env::var("POLLINATIONS_MODEL").unwrap_or_else(|_| "gemini-fast".to_string());

        // Используем CompletionsClient вместо дефолтного
        let client = CompletionsClient::builder()
            .api_key(&api_key)
            .base_url(base_url)
            .build()?;

        let fastembed_client = rig_fastembed::Client::new();
        let embeddings = fastembed_client.embedding_model(&FastembedModel::AllMiniLML6V2Q);

        // Теперь типы клиента и модели совпадают идеально
        let model = CompletionModel::new(client, model_name);

        let qdrant_url =
            env::var("QDRANT_URL").unwrap_or_else(|_| "http://localhost:6334".to_string());

        let qdrant_client = qdrant_client::Qdrant::from_url(&qdrant_url)
            .build()
            .map_err(|e| anyhow!("Failed to build Qdrant client: {}", e))?;

        let query_points = QueryPoints {
            collection_name: "lector_collection".to_string(),
            ..Default::default()
        };

        if !qdrant_client
            .collection_exists(&query_points.collection_name)
            .await?
        {
            qdrant_client
                .create_collection(
                    CreateCollectionBuilder::new(&query_points.collection_name)
                        .vectors_config(VectorParamsBuilder::new(384, Distance::Cosine)),
                )
                .await
                .map_err(|e| anyhow!("Failed to create Qdrant collection: {}", e))?;
        }

        Ok(Self {
            model,
            embeddings,
            qdrant_client,
            query_points,
        })
    }

    pub fn build_agent(&self) -> Agent<CompletionModel> {
        let vector_store = QdrantVectorStore::new(
            self.qdrant_client.clone(),
            self.embeddings.clone(),
            self.query_points.clone(),
        );

        AgentBuilder::new(self.model.clone())
            .preamble("You are Lector, a polite, intelligent, and helpful academic assistant. 
            Follow these rules strictly:
            1. For greetings, pleasantries, or general small talk (like 'how are you?', 'hello'), respond politely and naturally in the language of the user.
            2. For any factual, academic, or subject-related questions, you must answer ONLY using the provided context.
            3. If a factual question cannot be answered using the provided context, politely reply: 'К сожалению, в моих материалах нет ответа на этот вопрос.'
            Do NOT use your own knowledge for academic questions and do not hallucinate facts. Maintain a friendly but professional academic tone.")
            .dynamic_context(2, vector_store)
            .build()
    }

    pub async fn add_chunks(&self, chunks: Vec<String>) -> Result<()> {
        if chunks.is_empty() {
            return Ok(());
        }

        let embeddings = EmbeddingsBuilder::new(self.embeddings.clone())
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

    pub async fn index_formula(
        &self,
        id: Uuid,
        name: &str,
        equation: &str,
        description: Option<&str>,
    ) -> Result<()> {
        let content = format!(
            "Физическая формула: {}\nУравнение: {}\nОписание: {}",
            name,
            equation,
            description.unwrap_or("нет описания")
        );

        let embeddings = EmbeddingsBuilder::new(self.embeddings.clone())
            .document(content.clone())?
            .build()
            .await?;

        if let Some((doc, vec)) = embeddings.into_iter().next() {
            let float_vec: Vec<f32> = vec.first().vec.iter().map(|&x| x as f32).collect();

            let point = PointStruct::new(
                id.to_string(),
                float_vec,
                Payload::try_from(json!({
                    "document": doc,
                    "type": "formula",
                    "formula_id": id.to_string()
                }))
                .unwrap(),
            );

            self.qdrant_client
                .upsert_points(UpsertPointsBuilder::new(
                    &self.query_points.collection_name,
                    vec![point],
                ))
                .await?;
        }

        Ok(())
    }

    pub async fn sync_all_formulas(&self, pool: &sqlx::PgPool) -> Result<()> {
        let formulas = sqlx::query_as!(
            crate::db::Formula,
            "SELECT id, grade, name, equation, description FROM formulas"
        )
        .fetch_all(pool)
        .await?;

        for formula in formulas {
            self.index_formula(
                formula.id,
                &formula.name,
                &formula.equation,
                formula.description.as_deref(),
            )
            .await?;
        }

        Ok(())
    }

    pub async fn remove_formula(&self, id: Uuid) -> Result<()> {
        use qdrant_client::qdrant::{DeletePointsBuilder, PointId};

        self.qdrant_client
            .delete_points(
                DeletePointsBuilder::new(&self.query_points.collection_name)
                    .points(vec![PointId::from(id.to_string())]),
            )
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
