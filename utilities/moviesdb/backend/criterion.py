from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_openai import ChatOpenAI
from langchain_experimental.agents import create_pandas_dataframe_agent
import pandas as pd
import threading
import pickle
import os

app = FastAPI()

# Global variables to manage the server's state
class ServerState:
    INITIALIZING = "initializing"
    READY = "ready"

state = {"status": ServerState.INITIALIZING}
agent_executor = None
PICKLE_FILE = "dataframe.pkl"
CSV_FILE = "criterion_recommendations.csv"

# Function to load the DataFrame from a pickle file or CSV
def load_dataframe():
    if os.path.exists(PICKLE_FILE):
        print("Loading DataFrame from pickle file")
        with open(PICKLE_FILE, "rb") as f:
            return pickle.load(f)
    elif os.path.exists(CSV_FILE):
        print("Loading DataFrame from CSV")
        df = pd.read_csv(CSV_FILE)
        with open(PICKLE_FILE, "wb") as f:
            pickle.dump(df, f)
        return df
    else:
        raise Exception("Neither pickle nor CSV file exists.")

# Load the CSV and create the LangChain agent in a separate thread
def initialize_agent():
    global agent_executor
    try:
        # Load the DataFrame
        df = load_dataframe()

        # Create the LangChain agent
        llm = ChatOpenAI(model="gpt-4o", temperature=0)
        agent_executor = create_pandas_dataframe_agent(
            llm,
            df,
            verbose=True,
            allow_dangerous_code=True
        )

        # Update server state to ready
        state["status"] = ServerState.READY
    except Exception as e:
        print("Failed to initialize agent:", e)
        state["status"] = "error"

# Start initialization in a background thread
thread = threading.Thread(target=initialize_agent)
thread.start()

# Request model for the /prompt endpoint
class PromptRequest(BaseModel):
    prompt: str

@app.get("/status")
def get_status():
    """Endpoint to check server status."""
    return {"status": state["status"]}

@app.post("/prompt")
def process_prompt(request: PromptRequest):
    """Endpoint to process a prompt using the LangChain agent."""
    if state["status"] != ServerState.READY:
        raise HTTPException(status_code=503, detail="Server is not ready")

    try:
        # Use the agent executor to handle the prompt
        response = agent_executor.invoke(request.prompt, handle_parsing_errors=True)
        return {"response": response["output"]}
    except Exception as e:
        print("Error processing prompt:", e)
        raise HTTPException(status_code=500, detail="Error processing prompt")
