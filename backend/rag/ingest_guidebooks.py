import os
import json
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

TRACKER_FILE = "./chroma_db/ingested_files.json"

def load_ingested_files():
    """Loads the set of already processed PDF filenames."""
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_ingested_files(ingested_set):
    """Saves the updated set of processed PDF filenames."""
    os.makedirs(os.path.dirname(TRACKER_FILE), exist_ok=True)
    with open(TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(list(ingested_set), f, indent=2)

def ingest_new_pdfs(pdf_directory: str, persist_directory: str = "./chroma_db"):
    print(f"📂 Scanning directory: {pdf_directory}")
    ingested_files = load_ingested_files()
    all_new_documents = []
    new_files_detected = False

    # Check for new PDFs
    for filename in os.listdir(pdf_directory):
        if filename.endswith(".pdf"):
            if filename in ingested_files:
                print(f"⏩ Skipping (already ingested): {filename}")
                continue
            
            pdf_path = os.path.join(pdf_directory, filename)
            print(f"📖 Loading new file: {filename}...")
            try:
                loader = PyPDFLoader(pdf_path)
                documents = loader.load()
                all_new_documents.extend(documents)
                ingested_files.add(filename)
                new_files_detected = True
            except Exception as e:
                print(f"⚠️ Error loading {filename}: {e}")

    if not new_files_detected:
        print("✅ No new PDFs found. Your vector store is already up to date!")
        return

    # Split new documents into chunks
    print("✂️ Splitting new text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    docs = text_splitter.split_documents(all_new_documents)
    print(f"✅ Created {len(docs)} new chunks.")

    # Initialize HuggingFace embeddings
    print("🤗 Initializing HuggingFace Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Connect to existing Chroma store or create a new one if it doesn't exist
    print("💾 Updating Chroma vector store...")
    if os.path.exists(persist_directory) and os.listdir(persist_directory):
        vector_store = Chroma(
            collection_name="ssc_question_bank",
            embedding_function=embeddings,
            persist_directory=persist_directory
        )
        vector_store.add_documents(docs)
    else:
        Chroma.from_documents(
            documents=docs,
            embedding=embeddings,
            collection_name="ssc_question_bank",
            persist_directory=persist_directory
        )

    # Save the updated tracker list
    save_ingested_files(ingested_files)
    print("🚀 Incremental ingestion complete and logged!")

if __name__ == "__main__":
    ingest_new_pdfs(pdf_directory="./guidebooks")