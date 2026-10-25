import os
import json
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Path configuration based on your setup
PDF_PATH = "backend/data/guidebooks/all.pdf"
PERSIST_DIRECTORY = "backend/rag/chroma_db"
TRACKER_FILE = os.path.join(PERSIST_DIRECTORY, "ingested_files.json")

def load_ingested_files():
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_ingested_files(ingested_set):
    os.makedirs(os.path.dirname(TRACKER_FILE), exist_ok=True)
    with open(TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(list(ingested_set), f, indent=2)

def ingest_guidebook():
    print(f"📂 Target PDF path: {PDF_PATH}")
    
    if not os.path.exists(PDF_PATH):
        print(f"⚠️ Error: Could not find file at {PDF_PATH}")
        return

    ingested_files = load_ingested_files()
    filename = os.path.basename(PDF_PATH)

    if filename in ingested_files:
        print(f"⏩ Skipping (already ingested): {filename}")
        return

    print(f"📖 Loading selectable text from {filename} (contains multiple subject chapters)...")
    try:
        # Native PyPDFLoader since text is selectable
        loader = PyPDFLoader(PDF_PATH)
        documents = loader.load()
        print(f"✅ Loaded {len(documents)} pages successfully.")
    except Exception as e:
        print(f"⚠️ Error loading PDF: {e}")
        return

    print("✂️ Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    docs = text_splitter.split_documents(documents)
    print(f"✅ Created {len(docs)} text chunks.")

    print("🤗 Initializing HuggingFace Embeddings (all-MiniLM-L6-v2)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    print("💾 Updating Chroma vector store ('ssc_question_bank')...")
    if os.path.exists(PERSIST_DIRECTORY) and os.listdir(PERSIST_DIRECTORY):
        vector_store = Chroma(
            collection_name="ssc_question_bank",
            embedding_function=embeddings,
            persist_directory=PERSIST_DIRECTORY
        )
        vector_store.add_documents(docs)
    else:
        Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            collection_name="ssc_question_bank",
            persist_directory=PERSIST_DIRECTORY
        )

    # Mark file as ingested
    ingested_files.add(filename)
    save_ingested_files(ingested_files)
    print("🚀 Ingestion complete! Multi-subject chapters successfully added to RAG memory.")

if __name__ == "__main__":
    ingest_guidebook()