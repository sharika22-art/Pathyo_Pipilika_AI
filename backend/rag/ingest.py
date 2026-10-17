import os
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

# Define directories
PDF_DIR = "backend/data/textbooks"
DB_DIR = "backend/rag/chroma_db"

def ingest_textbooks():
    """Loads PDF textbooks, chunks them, embeds them, and saves to ChromaDB."""
    if not os.path.exists(PDF_DIR):
        os.makedirs(PDF_DIR)
        print(f"Directory '{PDF_DIR}' created. Please drop your NCTB PDF textbooks inside it!")
        return

    print("Loading PDF textbooks...")
    loader = PyPDFDirectoryLoader(PDF_DIR)
    raw_documents = loader.load()

    if not raw_documents:
        print("No PDF files found in the textbooks directory.")
        return

    print(f"Loaded {len(raw_documents)} pages. Splitting into chunks...")
    
    # Split text into optimal chunks for quiz generation
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", " ", ""]
    )
    docs = text_splitter.split_documents(raw_documents)
    print(f"Created {len(docs)} text chunks.")

    print("Initializing embeddings (BAAI/bge-m3 or sentence-transformers)...")
    embeddings = HuggingFaceEmbeddings(model_name="BAAI/bge-small-en-v1.5")

    print("Storing embeddings in Chroma vector database...")
    vector_store = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory=DB_DIR
    )
    
    print("RAG Ingestion Complete! Textbook embeddings successfully saved.")

if __name__ == "__main__":
    ingest_textbooks()