import os
import json
from pdf2image import convert_from_path
import pytesseract
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

TRACKER_FILE = "./chroma_db/ingested_files.json"

def load_scanned_pdf_with_ocr(pdf_path: str):
    """
    Converts a scanned PDF's pages into images and extracts text 
    using Tesseract OCR (supporting English and Bengali).
    """
    print(f"👁️ Running OCR on scanned PDF: {os.path.basename(pdf_path)}...")
    documents = []
    try:
        # Convert PDF pages to PIL images
        images = convert_from_path(pdf_path)
        
        for i, image in enumerate(images):
            # Run OCR specifying English ('eng') and Bengali ('ben')
            # Fallback to 'eng+ben' (make sure tesseract-ocr-ben is installed)
            text = pytesseract.image_to_string(image, lang='eng+ben')
            
            if text and text.strip():
                doc = Document(
                    page_content=text, 
                    metadata={"source": pdf_path, "page": i + 1}
                )
                documents.append(doc)
        print(f"✅ Extracted text from {len(images)} pages via OCR.")
    except Exception as e:
        print(f"⚠️ OCR Error on {pdf_path}: {e}")
        
    return documents

def load_ingested_files():
    if os.path.exists(TRACKER_FILE):
        with open(TRACKER_FILE, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()

def save_ingested_files(ingested_set):
    os.makedirs(os.path.dirname(TRACKER_FILE), exist_ok=True)
    with open(TRACKER_FILE, "w", encoding="utf-8") as f:
        json.dump(list(ingested_set), f, indent=2)

def ingest_new_pdfs(pdf_directory: str, persist_directory: str = "./chroma_db"):
    print(f"📂 Scanning directory: {pdf_directory}")
    ingested_files = load_ingested_files()
    all_new_documents = []
    new_files_detected = False

    for filename in os.listdir(pdf_directory):
        if filename.endswith(".pdf"):
            if filename in ingested_files:
                print(f"⏩ Skipping (already ingested): {filename}")
                continue
            
            pdf_path = os.path.join(pdf_directory, filename)
            # Use OCR loader for scanned guidebooks
            documents = load_scanned_pdf_with_ocr(pdf_path)
            if documents:
                all_new_documents.extend(documents)
                ingested_files.add(filename)
                new_files_detected = True

    if not new_files_detected:
        print("✅ No new PDFs found. Your vector store is up to date!")
        return

    print("✂️ Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", " ", ""]
    )
    docs = text_splitter.split_documents(all_new_documents)
    print(f"✅ Created {len(docs)} new chunks.")

    print("🤗 Initializing HuggingFace Embeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

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

    save_ingested_files(ingested_files)
    print("🚀 OCR Ingestion complete and logged!")

if __name__ == "__main__":
    ingest_new_pdfs(pdf_directory="./guidebooks")