import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load the variables from the .env file
load_dotenv()

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase credentials. Ensure SUPABASE_URL and SUPABASE_KEY are set in your .env file.")

# Initialize and expose the database client
db: Client = create_client(supabase_url, supabase_key)