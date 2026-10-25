import os
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

def ingest_guidebook_pdfs(pdf_directory: str, persist_directory: str = "./chroma_db"):
    """
    Loads all PDF guidebooks from a directory, chunks them, 
    and saves them into a persistent Chroma vector store.
    """
    print(f"📂 Scanning directory: {pdf_directory}")
    all_documents = []

    # Loop through all PDFs in the directory
    for filename in os.listdir(pdf_directory):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(pdf_directory, filename)
            print(f"📖 Loading: {filename}...")
            loader = PyPDFLoader(pdf_path)
            documents = loader.load()
            all_documents.extend(documents)

    if not all_documents:
        print("⚠️ No PDF documents found to ingest.")
        return

    # Split documents into optimal chunks for question retrieval
    print("✂️ Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    docs = text_splitter.split_documents(all_documents)
    print(f"✅ Created {len(docs)} chunks from guidebooks.")

    # Initialize HuggingFace embeddings (multilingual support)
    print("🤗 Initializing HuggingFace Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Store persistently in Chroma
    print("💾 Storing vectors into Chroma collection 'ssc_question_bank'...")
    vector_store = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        collection_name="ssc_question_bank",
        persist_directory=persist_directory
    )
    print("🚀 Guidebook ingestion complete!")

if __name__ == "__main__":
    # Example usage: point to your local guidebooks folder
    ingest_guidebook_pdfs(pdf_directory="./guidebooks")